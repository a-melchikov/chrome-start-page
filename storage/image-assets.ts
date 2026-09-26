import { storage } from '#imports';

import {
  readStoredDashboardConfig,
  withDashboardWriteLock,
} from './dashboard-storage';
import { isImageAssetId } from './schema';
import {
  InvalidWallpaperAssetError,
  parseWallpaperAsset,
  type LocalWallpaperAssetV1,
} from './wallpaper-codec';

export type LocalImageAssetV1 = LocalWallpaperAssetV1;

export const IMAGE_ASSET_KEY_PREFIX = 'local:dashboard-image-asset:';
export const HISTORY_IMAGE_LEASE_PREFIX = 'session:dashboard-history-images:';

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

export async function saveHistoryImageLease(
  tabId: string,
  assetIds: readonly string[],
): Promise<void> {
  const key = `${HISTORY_IMAGE_LEASE_PREFIX}${tabId}` as const;
  if (assetIds.length === 0) {
    await storage.removeItem(key);
  } else {
    await storage.setItem(key, [...new Set(assetIds)]);
  }
}

export async function releaseClosedTabImageLease(tabId: number): Promise<void> {
  const lease = await storage.getItem<unknown>(
    `${HISTORY_IMAGE_LEASE_PREFIX}${tabId}`,
  );
  if (lease === null) return;
  await saveHistoryImageLease(String(tabId), []);
  await withDashboardWriteLock(async () => {
    const config = await readStoredDashboardConfig();
    if (config) {
      await cleanupOrphanedImageAssets(
        collectLocalImageAssetIds(config.widgets),
      );
    }
  });
}

async function collectLeasedImageAssetIds(): Promise<Set<string>> {
  const snapshot = await storage.snapshot('session');
  const ids = new Set<string>();
  for (const [key, value] of Object.entries(snapshot)) {
    if (!key.startsWith(HISTORY_IMAGE_LEASE_PREFIX.slice('session:'.length)))
      continue;
    if (!Array.isArray(value)) continue;
    for (const id of value) {
      if (isImageAssetId(id)) ids.add(id);
    }
  }
  return ids;
}

export async function cleanupOrphanedImageAssets(
  activeAssetIds: ReadonlySet<string> | readonly string[],
): Promise<void> {
  const activeSet =
    activeAssetIds instanceof Set ? activeAssetIds : new Set(activeAssetIds);

  for (const id of await collectLeasedImageAssetIds()) activeSet.add(id);

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
  for (const id of await collectLeasedImageAssetIds()) nextIds.add(id);

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
