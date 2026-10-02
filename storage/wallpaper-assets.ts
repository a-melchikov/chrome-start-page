import { storage } from '#imports';

import { isWallpaperAssetId } from './schema';
import {
  InvalidWallpaperAssetError,
  parseWallpaperAsset,
  type LocalWallpaperAssetV1,
} from './wallpaper-codec';

export const WALLPAPER_ASSET_KEY_PREFIX = 'local:dashboard-wallpaper:';

const LOCAL_KEY_PREFIX_LENGTH = 'local:'.length;
const WALLPAPER_SNAPSHOT_KEY_PREFIX = WALLPAPER_ASSET_KEY_PREFIX.slice(
  LOCAL_KEY_PREFIX_LENGTH,
);

export function getWallpaperAssetKey(assetId: string): `local:${string}` {
  if (!isWallpaperAssetId(assetId)) {
    throw new InvalidWallpaperAssetError('Wallpaper asset ID is invalid');
  }

  return `${WALLPAPER_ASSET_KEY_PREFIX}${assetId}`;
}

export async function saveWallpaperAsset(
  value: LocalWallpaperAssetV1,
): Promise<void> {
  const asset = parseWallpaperAsset(value);
  await storage.setItem(getWallpaperAssetKey(asset.assetId), asset);
}

export async function loadWallpaperAsset(
  assetId: string,
): Promise<LocalWallpaperAssetV1 | null> {
  const value = await storage.getItem<unknown>(getWallpaperAssetKey(assetId));

  if (value === null) {
    return null;
  }

  const asset = parseWallpaperAsset(value);

  if (asset.assetId !== assetId) {
    throw new InvalidWallpaperAssetError(
      'Wallpaper asset ID does not match its storage key',
    );
  }

  return asset;
}

export async function deleteWallpaperAsset(assetId: string): Promise<void> {
  await storage.removeItem(getWallpaperAssetKey(assetId));
}

export async function cleanupOrphanedWallpaperAssets(
  activeAssetIdOrIds: string | readonly string[] | null,
): Promise<void> {
  const activeIds = Array.isArray(activeAssetIdOrIds)
    ? activeAssetIdOrIds
    : activeAssetIdOrIds
      ? [activeAssetIdOrIds]
      : [];

  for (const id of activeIds) {
    if (!isWallpaperAssetId(id)) {
      throw new InvalidWallpaperAssetError(
        'Active wallpaper asset ID is invalid',
      );
    }
  }

  const activeKeys = new Set(
    activeIds.map((id) => `${WALLPAPER_SNAPSHOT_KEY_PREFIX}${id}`),
  );

  const snapshot = await storage.snapshot('local');
  const orphanKeys = Object.keys(snapshot)
    .filter(
      (key) =>
        key.startsWith(WALLPAPER_SNAPSHOT_KEY_PREFIX) && !activeKeys.has(key),
    )
    .map((key) => `local:${key}` as const);

  if (orphanKeys.length > 0) {
    await storage.removeItems(orphanKeys);
  }
}
