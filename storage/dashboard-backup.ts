import { migrateDashboardConfig } from './migrations';
import {
  cleanupOrphanedWallpaperAssets,
  deleteWallpaperAsset,
  loadWallpaperAsset,
  saveWallpaperAsset,
} from './wallpaper-assets';
import {
  cleanupOrphanedImageAssets,
  deleteImageAssets,
  loadImageAsset,
  saveImageAsset,
  type LocalImageAssetV1,
} from './image-assets';
import {
  decodeWallpaperAsset,
  encodeWallpaperAsset,
  parseWallpaperAsset,
  type LocalWallpaperAssetV1,
} from './wallpaper-codec';
import { saveDashboardConfig } from './dashboard-storage';
import { clearWeatherCaches } from './weather-cache';
import type { DashboardConfig } from './schema';

import {
  WallpaperValidationAbortedError,
  validateWallpaperBytes,
  validateWallpaperUrl,
} from '../wallpaper/image-validation';
import {
  validateImageBytes,
  type ImageWidgetMimeType,
} from '../widgets/image/image-validation';

export const DASHBOARD_BACKUP_FORMAT = 'chrome-start-page-backup' as const;
export const DASHBOARD_BACKUP_FORMAT_VERSION = 3 as const;

export interface DashboardBackupV1 {
  format: typeof DASHBOARD_BACKUP_FORMAT;
  formatVersion: 1;
  exportedAt: string;
  dashboard: DashboardConfig;
  localWallpaper: LocalWallpaperAssetV1 | null;
}

export interface DashboardBackupV2 {
  format: typeof DASHBOARD_BACKUP_FORMAT;
  formatVersion: 2;
  exportedAt: string;
  dashboard: DashboardConfig;
  localWallpaper: LocalWallpaperAssetV1 | null;
  localImages: LocalImageAssetV1[];
}

export interface DashboardBackupV3 {
  format: typeof DASHBOARD_BACKUP_FORMAT;
  formatVersion: 3;
  exportedAt: string;
  dashboard: DashboardConfig;
  localWallpapers: LocalWallpaperAssetV1[];
  localImages: LocalImageAssetV1[];
}

export type DashboardBackup =
  DashboardBackupV1 | DashboardBackupV2 | DashboardBackupV3;

export interface DashboardBackupDownload {
  fileName: string;
  contents: string;
}

export interface PreparedDashboardImport {
  dashboard: DashboardConfig;
  localWallpapers: LocalWallpaperAssetV1[];
  localImages: LocalImageAssetV1[];
}

export interface DashboardImportResult {
  config: DashboardConfig;
  warning: string | null;
}

export class InvalidDashboardBackupError extends Error {
  constructor(message = 'Резервная копия имеет неверную структуру') {
    super(message);
    this.name = 'InvalidDashboardBackupError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidExportedAt(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function migrateBackupDashboard(value: unknown): DashboardConfig {
  try {
    return migrateDashboardConfig(value);
  } catch {
    throw new InvalidDashboardBackupError(
      'Конфигурация дашборда повреждена или не поддерживается',
    );
  }
}

function parseBackupWallpaper(value: unknown): LocalWallpaperAssetV1 | null {
  if (value === null) {
    return null;
  }

  try {
    return parseWallpaperAsset(value);
  } catch {
    throw new InvalidDashboardBackupError(
      'Данные локальных обоев в резервной копии повреждены',
    );
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new WallpaperValidationAbortedError();
  }
}

export async function createDashboardBackup(
  config: DashboardConfig,
  exportedAt = new Date(),
): Promise<DashboardBackupV3> {
  const dashboard = migrateBackupDashboard(config);

  const localWallpapers: LocalWallpaperAssetV1[] = [];
  const seenWallpaperIds = new Set<string>();

  for (const workspace of dashboard.workspaces) {
    const wallpaper = workspace.appearance.wallpaper;
    if (
      wallpaper.type === 'local' &&
      !seenWallpaperIds.has(wallpaper.assetId)
    ) {
      seenWallpaperIds.add(wallpaper.assetId);
      const asset = await loadWallpaperAsset(wallpaper.assetId);
      if (!asset) {
        throw new InvalidDashboardBackupError(
          'Локальные обои не найдены, поэтому полную копию создать нельзя',
        );
      }
      try {
        await decodeWallpaperAsset(asset);
      } catch {
        throw new InvalidDashboardBackupError(
          'Сохранённые локальные обои повреждены',
        );
      }
      localWallpapers.push(asset);
    }
  }

  const localImages: LocalImageAssetV1[] = [];
  const seenImageIds = new Set<string>();

  for (const workspace of dashboard.workspaces) {
    for (const widget of workspace.widgets) {
      if (widget.type === 'image' && widget.source.type === 'local') {
        const assetId = widget.source.assetId;
        if (!seenImageIds.has(assetId)) {
          seenImageIds.add(assetId);
          const localImage = await loadImageAsset(assetId);
          if (!localImage) {
            throw new InvalidDashboardBackupError(
              'Локальное изображение не найдено, поэтому полную копию создать нельзя',
            );
          }
          try {
            await decodeWallpaperAsset(localImage);
          } catch {
            throw new InvalidDashboardBackupError(
              'Сохранённое локальное изображение повреждено',
            );
          }
          localImages.push(localImage);
        }
      }
    }
  }

  return {
    format: DASHBOARD_BACKUP_FORMAT,
    formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    dashboard,
    localWallpapers,
    localImages,
  };
}

export function serializeDashboardBackup(
  backup: DashboardBackupV1 | DashboardBackupV2 | DashboardBackupV3,
): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function createDashboardBackupFileName(exportedAt: string): string {
  const timestamp = new Date(exportedAt)
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d{3}Z$/, 'Z');

  return `chrome-start-page-backup-${timestamp}.json`;
}

export function parseDashboardBackup(value: unknown): DashboardBackupV3 {
  if (!isRecord(value) || value.format !== DASHBOARD_BACKUP_FORMAT) {
    throw new InvalidDashboardBackupError(
      'Файл не является резервной копией Chrome Start Page',
    );
  }

  if (
    value.formatVersion !== 1 &&
    value.formatVersion !== 2 &&
    value.formatVersion !== 3
  ) {
    const version =
      typeof value.formatVersion === 'number'
        ? String(value.formatVersion)
        : 'не указана';
    throw new InvalidDashboardBackupError(
      `Версия резервной копии ${version} не поддерживается`,
    );
  }

  if (!isValidExportedAt(value.exportedAt)) {
    throw new InvalidDashboardBackupError(
      'Дата создания резервной копии имеет неверный формат',
    );
  }

  const dashboard = migrateBackupDashboard(value.dashboard);

  const localWallpapers: LocalWallpaperAssetV1[] = [];
  const wallpaperAssetIdsInBackup = new Set<string>();

  if (value.formatVersion === 3) {
    if (
      value.localWallpapers !== undefined &&
      !Array.isArray(value.localWallpapers)
    ) {
      throw new InvalidDashboardBackupError(
        'Данные локальных обоев в резервной копии повреждены',
      );
    }
    const rawWallpapers = Array.isArray(value.localWallpapers)
      ? value.localWallpapers
      : [];
    for (const item of rawWallpapers) {
      const asset = parseBackupWallpaper(item);
      if (!asset) {
        throw new InvalidDashboardBackupError(
          'Данные локальных обоев в резервной копии повреждены',
        );
      }
      if (wallpaperAssetIdsInBackup.has(asset.assetId)) {
        throw new InvalidDashboardBackupError(
          'Резервная копия содержит дублирующиеся локальные обои',
        );
      }
      wallpaperAssetIdsInBackup.add(asset.assetId);
      localWallpapers.push(asset);
    }
  } else {
    const single = parseBackupWallpaper(value.localWallpaper);
    if (single) {
      wallpaperAssetIdsInBackup.add(single.assetId);
      localWallpapers.push(single);
    }
  }

  for (const workspace of dashboard.workspaces) {
    const wallpaper = workspace.appearance.wallpaper;
    if (wallpaper.type === 'local') {
      if (!wallpaperAssetIdsInBackup.has(wallpaper.assetId)) {
        throw new InvalidDashboardBackupError(
          'В резервной копии отсутствуют локальные обои',
        );
      }
    }
  }

  const localImages: LocalImageAssetV1[] = [];
  if (value.formatVersion === 2 || value.formatVersion === 3) {
    if (value.localImages !== undefined && !Array.isArray(value.localImages)) {
      throw new InvalidDashboardBackupError(
        'Данные локальных изображений в резервной копии повреждены',
      );
    }
    const rawImages = Array.isArray(value.localImages) ? value.localImages : [];
    const imageAssetIdsInBackup = new Set<string>();

    for (const item of rawImages) {
      let asset: LocalImageAssetV1;
      try {
        asset = parseWallpaperAsset(item);
      } catch {
        throw new InvalidDashboardBackupError(
          'Данные локальных изображений в резервной копии повреждены',
        );
      }
      if (imageAssetIdsInBackup.has(asset.assetId)) {
        throw new InvalidDashboardBackupError(
          'Резервная копия содержит дублирующиеся локальные изображения',
        );
      }
      imageAssetIdsInBackup.add(asset.assetId);
      localImages.push(asset);
    }

    for (const workspace of dashboard.workspaces) {
      for (const widget of workspace.widgets) {
        if (widget.type === 'image' && widget.source.type === 'local') {
          if (!imageAssetIdsInBackup.has(widget.source.assetId)) {
            throw new InvalidDashboardBackupError(
              'В резервной копии отсутствуют необходимые локальные изображения',
            );
          }
        }
      }
    }
  } else if (value.localImages !== undefined && value.localImages !== null) {
    throw new InvalidDashboardBackupError(
      'Резервная копия содержит лишние данные локальных изображений',
    );
  }

  return {
    format: DASHBOARD_BACKUP_FORMAT,
    formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
    exportedAt: value.exportedAt,
    dashboard,
    localWallpapers,
    localImages,
  };
}

export function parseDashboardBackupJson(source: string): DashboardBackupV3 {
  let value: unknown;

  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new InvalidDashboardBackupError(
      'Файл резервной копии повреждён или содержит недопустимый JSON',
    );
  }

  return parseDashboardBackup(value);
}

export async function prepareDashboardImport(
  sourceOrBackup: string | DashboardBackup,
  signal?: AbortSignal,
): Promise<PreparedDashboardImport> {
  throwIfAborted(signal);

  const backup =
    typeof sourceOrBackup === 'string'
      ? parseDashboardBackupJson(sourceOrBackup)
      : sourceOrBackup;

  const rawWallpapers: LocalWallpaperAssetV1[] =
    backup.formatVersion === 3
      ? backup.localWallpapers
      : backup.localWallpaper
        ? [backup.localWallpaper]
        : [];

  const rawImages: LocalImageAssetV1[] =
    backup.formatVersion === 2 || backup.formatVersion === 3
      ? backup.localImages
      : [];

  const wallpaperIdMap = new Map<string, string>();
  const preparedWallpapers: LocalWallpaperAssetV1[] = [];

  for (const wallpaperAsset of rawWallpapers) {
    throwIfAborted(signal);
    let bytes: Uint8Array;

    try {
      bytes = await decodeWallpaperAsset(wallpaperAsset);
    } catch {
      throw new InvalidDashboardBackupError(
        'Данные локальных обоев не удалось декодировать',
      );
    }

    await validateWallpaperBytes(bytes, wallpaperAsset.mimeType, signal);
    throwIfAborted(signal);

    const newAssetId = crypto.randomUUID();
    wallpaperIdMap.set(wallpaperAsset.assetId, newAssetId);

    const prepared = await encodeWallpaperAsset(
      newAssetId,
      wallpaperAsset.mimeType,
      bytes,
    );
    preparedWallpapers.push(prepared);
  }

  const imageIdMap = new Map<string, string>();
  const preparedLocalImages: LocalImageAssetV1[] = [];

  for (const imageAsset of rawImages) {
    throwIfAborted(signal);
    let bytes: Uint8Array;

    try {
      bytes = await decodeWallpaperAsset(imageAsset);
    } catch {
      throw new InvalidDashboardBackupError(
        'Данные локальных изображений не удалось декодировать',
      );
    }

    await validateImageBytes(
      bytes,
      imageAsset.mimeType as ImageWidgetMimeType,
      signal,
    );
    throwIfAborted(signal);

    const newAssetId = crypto.randomUUID();
    imageIdMap.set(imageAsset.assetId, newAssetId);

    const prepared = await encodeWallpaperAsset(
      newAssetId,
      imageAsset.mimeType,
      bytes,
    );
    preparedLocalImages.push(prepared);
  }

  const updatedWorkspaces = await Promise.all(
    backup.dashboard.workspaces.map(async (workspace) => {
      let wallpaper = workspace.appearance.wallpaper;
      if (wallpaper.type === 'url') {
        throwIfAborted(signal);
        const url = await validateWallpaperUrl(wallpaper.url, signal);
        wallpaper = { type: 'url', url };
      } else if (wallpaper.type === 'local') {
        const remappedId = wallpaperIdMap.get(wallpaper.assetId);
        if (remappedId) {
          wallpaper = { ...wallpaper, assetId: remappedId };
        }
      }

      const widgets = workspace.widgets.map((widget) => {
        if (widget.type === 'image' && widget.source.type === 'local') {
          const remappedId = imageIdMap.get(widget.source.assetId);
          if (remappedId) {
            return {
              ...widget,
              source: {
                ...widget.source,
                assetId: remappedId,
              },
            };
          }
        }
        return widget;
      });

      return {
        ...workspace,
        appearance: {
          ...workspace.appearance,
          wallpaper,
        },
        widgets,
      };
    }),
  );

  return {
    dashboard: {
      ...backup.dashboard,
      workspaces: updatedWorkspaces,
    },
    localWallpapers: preparedWallpapers,
    localImages: preparedLocalImages,
  };
}

export async function replaceDashboardFromBackup(
  currentConfig: DashboardConfig,
  preparedImport: PreparedDashboardImport,
): Promise<DashboardImportResult> {
  const config = migrateBackupDashboard(preparedImport.dashboard);
  const savedImageAssetIds: string[] = [];
  const savedWallpaperAssetIds: string[] = [];

  for (const asset of preparedImport.localImages) {
    await saveImageAsset(asset);
    savedImageAssetIds.push(asset.assetId);
  }

  for (const asset of preparedImport.localWallpapers) {
    await saveWallpaperAsset(asset);
    savedWallpaperAssetIds.push(asset.assetId);
  }

  try {
    await saveDashboardConfig(config);
  } catch (error) {
    for (const assetId of savedWallpaperAssetIds) {
      try {
        await deleteWallpaperAsset(assetId);
      } catch {
        // Startup cleanup removes the orphans.
      }
    }
    try {
      await deleteImageAssets(savedImageAssetIds);
    } catch {
      // Startup cleanup removes the orphans.
    }
    throw error;
  }

  const activeWallpaperIds = new Set(
    config.workspaces
      .map((w) => w.appearance.wallpaper)
      .filter(
        (w): w is { type: 'local'; assetId: string } => w.type === 'local',
      )
      .map((w) => w.assetId),
  );

  let warning: string | null = null;
  const currentWallpaperIds = currentConfig.workspaces
    .map((w) => w.appearance.wallpaper)
    .filter((w): w is { type: 'local'; assetId: string } => w.type === 'local')
    .map((w) => w.assetId);

  for (const assetId of currentWallpaperIds) {
    if (!activeWallpaperIds.has(assetId)) {
      try {
        await deleteWallpaperAsset(assetId);
      } catch {
        warning =
          'Импорт завершён, но старые локальные обои удалить не удалось';
      }
    }
  }

  if (!warning) {
    void cleanupOrphanedWallpaperAssets([...activeWallpaperIds]).catch(
      () => undefined,
    );
  }

  const activeImageAssetIds = new Set<string>();
  for (const workspace of config.workspaces) {
    for (const widget of workspace.widgets) {
      if (widget.type === 'image' && widget.source.type === 'local') {
        activeImageAssetIds.add(widget.source.assetId);
      }
    }
  }
  await cleanupOrphanedImageAssets(activeImageAssetIds).catch(() => undefined);
  await clearWeatherCaches().catch(() => undefined);

  return {
    config,
    warning,
  };
}
