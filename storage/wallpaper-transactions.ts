import { saveDashboardConfig } from './dashboard-storage';
import type { DashboardConfig, WallpaperConfig } from './schema';
import {
  cleanupOrphanedWallpaperAssets,
  deleteWallpaperAsset,
  saveWallpaperAsset,
} from './wallpaper-assets';
import type { LocalWallpaperAssetV1 } from './wallpaper-codec';

export interface WallpaperTransactionResult {
  config: DashboardConfig;
  warning: string | null;
}

function withWallpaper(
  current: DashboardConfig,
  wallpaper: WallpaperConfig,
): DashboardConfig {
  return {
    ...current,
    appearance: {
      ...current.appearance,
      wallpaper,
    },
  };
}

async function removePreviousLocalAsset(
  current: DashboardConfig,
  nextLocalAssetId: string | null,
): Promise<string | null> {
  const previous = current.appearance.wallpaper;

  if (previous.type !== 'local' || previous.assetId === nextLocalAssetId) {
    return null;
  }

  try {
    await deleteWallpaperAsset(previous.assetId);
    return null;
  } catch {
    return 'Не удалось удалить старые локальные обои';
  }
}

export async function installLocalWallpaper(
  current: DashboardConfig,
  asset: LocalWallpaperAssetV1,
): Promise<WallpaperTransactionResult> {
  await saveWallpaperAsset(asset);

  const nextConfig = withWallpaper(current, {
    type: 'local',
    assetId: asset.assetId,
  });

  try {
    await saveDashboardConfig(nextConfig);
  } catch (error) {
    try {
      await deleteWallpaperAsset(asset.assetId);
    } catch {
      // Preserve the config failure as the primary operation error. The
      // orphaned asset is removed by startup cleanup on the next load.
    }

    throw error;
  }

  const warning = await removePreviousLocalAsset(current, asset.assetId);
  if (!warning) {
    void cleanupOrphanedWallpaperAssets(asset.assetId).catch(() => undefined);
  }

  return {
    config: nextConfig,
    warning,
  };
}

export async function installUrlWallpaper(
  current: DashboardConfig,
  url: string,
): Promise<WallpaperTransactionResult> {
  const nextConfig = withWallpaper(current, { type: 'url', url });
  await saveDashboardConfig(nextConfig);

  const warning = await removePreviousLocalAsset(current, null);
  if (!warning) {
    void cleanupOrphanedWallpaperAssets(null).catch(() => undefined);
  }

  return {
    config: nextConfig,
    warning,
  };
}

export async function removeWallpaper(
  current: DashboardConfig,
): Promise<WallpaperTransactionResult> {
  const nextConfig = withWallpaper(current, { type: 'none' });
  await saveDashboardConfig(nextConfig);

  const warning = await removePreviousLocalAsset(current, null);
  if (!warning) {
    void cleanupOrphanedWallpaperAssets(null).catch(() => undefined);
  }

  return {
    config: nextConfig,
    warning,
  };
}
