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

function getTargetWorkspace(current: DashboardConfig, workspaceId?: string) {
  const targetId = workspaceId ?? current.activeWorkspaceId;
  return (
    current.workspaces.find((w) => w.id === targetId) ?? current.workspaces[0]
  );
}

function withWallpaper(
  current: DashboardConfig,
  wallpaper: WallpaperConfig,
  workspaceId?: string,
): DashboardConfig {
  const targetId = workspaceId ?? current.activeWorkspaceId;
  return {
    ...current,
    workspaces: current.workspaces.map((w) =>
      w.id === targetId
        ? {
            ...w,
            appearance: {
              ...w.appearance,
              wallpaper,
            },
          }
        : w,
    ),
  };
}

function collectAllWallpaperAssetIds(config: DashboardConfig): string[] {
  const ids: string[] = [];
  for (const w of config.workspaces) {
    if (w.appearance.wallpaper.type === 'local') {
      ids.push(w.appearance.wallpaper.assetId);
    }
  }
  return ids;
}

async function removePreviousLocalAsset(
  current: DashboardConfig,
  nextLocalAssetId: string | null,
  workspaceId?: string,
): Promise<string | null> {
  const target = getTargetWorkspace(current, workspaceId);
  if (!target) return null;
  const previous = target.appearance.wallpaper;

  if (previous.type !== 'local' || previous.assetId === nextLocalAssetId) {
    return null;
  }

  const isUsedElsewhere = current.workspaces.some(
    (w) =>
      w.id !== target.id &&
      w.appearance.wallpaper.type === 'local' &&
      w.appearance.wallpaper.assetId === previous.assetId,
  );
  if (isUsedElsewhere) {
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
  workspaceId?: string,
): Promise<WallpaperTransactionResult> {
  await saveWallpaperAsset(asset);

  const nextConfig = withWallpaper(
    current,
    {
      type: 'local',
      assetId: asset.assetId,
    },
    workspaceId,
  );

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

  const warning = await removePreviousLocalAsset(
    current,
    asset.assetId,
    workspaceId,
  );
  if (!warning) {
    void cleanupOrphanedWallpaperAssets(
      collectAllWallpaperAssetIds(nextConfig),
    ).catch(() => undefined);
  }

  return {
    config: nextConfig,
    warning,
  };
}

export async function installUrlWallpaper(
  current: DashboardConfig,
  url: string,
  workspaceId?: string,
): Promise<WallpaperTransactionResult> {
  const nextConfig = withWallpaper(current, { type: 'url', url }, workspaceId);
  await saveDashboardConfig(nextConfig);

  const warning = await removePreviousLocalAsset(current, null, workspaceId);
  if (!warning) {
    void cleanupOrphanedWallpaperAssets(
      collectAllWallpaperAssetIds(nextConfig),
    ).catch(() => undefined);
  }

  return {
    config: nextConfig,
    warning,
  };
}

export async function removeWallpaper(
  current: DashboardConfig,
  workspaceId?: string,
): Promise<WallpaperTransactionResult> {
  const nextConfig = withWallpaper(current, { type: 'none' }, workspaceId);
  await saveDashboardConfig(nextConfig);

  const warning = await removePreviousLocalAsset(current, null, workspaceId);
  if (!warning) {
    void cleanupOrphanedWallpaperAssets(
      collectAllWallpaperAssetIds(nextConfig),
    ).catch(() => undefined);
  }

  return {
    config: nextConfig,
    warning,
  };
}
