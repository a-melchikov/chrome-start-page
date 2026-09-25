import { storage } from '#imports';

import { isImageAssetId } from './schema';
import {
  InvalidWallpaperAssetError,
  parseWallpaperAsset,
  type LocalWallpaperAssetV1,
} from './wallpaper-codec';

export type LocalImageAssetV1 = LocalWallpaperAssetV1;

export const IMAGE_ASSET_KEY_PREFIX = 'local:dashboard-image-asset:';

const LOCAL_KEY_PREFIX_LENGTH = 'local:'.length;
const IMAGE_SNAPSHOT_KEY_PREFIX = IMAGE_ASSET_KEY_PREFIX.slice(
  LOCAL_KEY_PREFIX_LENGTH,
);

export function getImageAssetKey(assetId: string): `local:${string}` {
  if (!isImageAssetId(assetId)) {
    throw new InvalidWallpaperAssetError('Image asset ID is invalid');
  }

  return `${IMAGE_ASSET_KEY_PREFIX}${assetId}`;
}

export async function saveImageAsset(value: LocalImageAssetV1): Promise<void> {
  const asset = parseWallpaperAsset(value);
  await storage.setItem(getImageAssetKey(asset.assetId), asset);
}

export async function loadImageAsset(
  assetId: string,
): Promise<LocalImageAssetV1 | null> {
  const value = await storage.getItem<unknown>(getImageAssetKey(assetId));

  if (value === null) {
    return null;
  }

  const asset = parseWallpaperAsset(value);

  if (asset.assetId !== assetId) {
    throw new InvalidWallpaperAssetError(
      'Image asset ID does not match its storage key',
    );
  }

  return asset;
}

export async function deleteImageAsset(assetId: string): Promise<void> {
  await storage.removeItem(getImageAssetKey(assetId));
}

export async function deleteImageAssets(
  assetIds: readonly string[],
): Promise<void> {
  if (assetIds.length === 0) {
    return;
  }
  const keys = assetIds.map(getImageAssetKey);
  await storage.removeItems(keys);
}

export async function cleanupOrphanedImageAssets(
  activeAssetIds: ReadonlySet<string> | readonly string[],
): Promise<void> {
  const activeSet =
    activeAssetIds instanceof Set ? activeAssetIds : new Set(activeAssetIds);

  for (const id of activeSet) {
    if (!isImageAssetId(id)) {
      throw new InvalidWallpaperAssetError('Active image asset ID is invalid');
    }
  }

  const snapshot = await storage.snapshot('local');
  const orphanKeys = Object.keys(snapshot)
    .filter((key) => {
      if (!key.startsWith(IMAGE_SNAPSHOT_KEY_PREFIX)) {
        return false;
      }
      const assetId = key.slice(IMAGE_SNAPSHOT_KEY_PREFIX.length);
      return !activeSet.has(assetId);
    })
    .map((key) => `local:${key}` as const);

  if (orphanKeys.length > 0) {
    await storage.removeItems(orphanKeys);
  }
}

export function collectLocalImageAssetIds(
  widgets: readonly { type: string; source?: unknown }[],
): Set<string> {
  const ids = new Set<string>();

  for (const widget of widgets) {
    if (
      widget.type === 'image' &&
      typeof widget.source === 'object' &&
      widget.source !== null &&
      'type' in widget.source &&
      widget.source.type === 'local' &&
      'assetId' in widget.source &&
      typeof widget.source.assetId === 'string'
    ) {
      ids.add(widget.source.assetId);
    }
  }

  return ids;
}

export async function cleanupUnusedImageAssets(
  previousWidgets: readonly { type: string; source?: unknown }[],
  nextWidgets: readonly { type: string; source?: unknown }[],
): Promise<void> {
  const previousIds = collectLocalImageAssetIds(previousWidgets);
  const nextIds = collectLocalImageAssetIds(nextWidgets);

  const unusedIds: string[] = [];
  for (const id of previousIds) {
    if (!nextIds.has(id)) {
      unusedIds.push(id);
    }
  }

  if (unusedIds.length > 0) {
    await deleteImageAssets(unusedIds);
  }
}
