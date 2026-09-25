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
export const DASHBOARD_BACKUP_FORMAT_VERSION = 2 as const;

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

export type DashboardBackup = DashboardBackupV1 | DashboardBackupV2;

export interface DashboardBackupDownload {
  fileName: string;
  contents: string;
}

export interface PreparedDashboardImport {
  dashboard: DashboardConfig;
  localWallpaper: LocalWallpaperAssetV1 | null;
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

async function removePreviousLocalWallpaper(
  currentConfig: DashboardConfig,
  nextLocalWallpaperId: string | null,
): Promise<string | null> {
  const currentWallpaper = currentConfig.appearance.wallpaper;

  if (
    currentWallpaper.type !== 'local' ||
    currentWallpaper.assetId === nextLocalWallpaperId
  ) {
    return null;
  }

  try {
    await deleteWallpaperAsset(currentWallpaper.assetId);
    return null;
  } catch {
    return 'Импорт завершён, но старые локальные обои удалить не удалось';
  }
}

export async function createDashboardBackup(
  config: DashboardConfig,
  exportedAt = new Date(),
): Promise<DashboardBackupV2> {
  const dashboard = migrateBackupDashboard(config);
  const wallpaper = dashboard.appearance.wallpaper;
  let localWallpaper: LocalWallpaperAssetV1 | null = null;

  if (wallpaper.type === 'local') {
    localWallpaper = await loadWallpaperAsset(wallpaper.assetId);

    if (!localWallpaper) {
      throw new InvalidDashboardBackupError(
        'Локальные обои не найдены, поэтому полную копию создать нельзя',
      );
    }

    try {
      await decodeWallpaperAsset(localWallpaper);
    } catch {
      throw new InvalidDashboardBackupError(
        'Сохранённые локальные обои повреждены',
      );
    }
  }

  const localImages: LocalImageAssetV1[] = [];
  const seenAssetIds = new Set<string>();

  for (const widget of dashboard.widgets) {
    if (widget.type === 'image' && widget.source.type === 'local') {
      const assetId = widget.source.assetId;
      if (!seenAssetIds.has(assetId)) {
        seenAssetIds.add(assetId);
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

  return {
    format: DASHBOARD_BACKUP_FORMAT,
    formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    dashboard,
    localWallpaper,
    localImages,
  };
}

export function serializeDashboardBackup(
  backup: DashboardBackupV1 | DashboardBackupV2,
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

export function parseDashboardBackup(value: unknown): DashboardBackupV2 {
  if (!isRecord(value) || value.format !== DASHBOARD_BACKUP_FORMAT) {
    throw new InvalidDashboardBackupError(
      'Файл не является резервной копией Chrome Start Page',
    );
  }

  if (value.formatVersion !== 1 && value.formatVersion !== 2) {
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
  const localWallpaper = parseBackupWallpaper(value.localWallpaper);
  const wallpaper = dashboard.appearance.wallpaper;

  if (wallpaper.type === 'local') {
    if (!localWallpaper) {
      throw new InvalidDashboardBackupError(
        'В резервной копии отсутствуют локальные обои',
      );
    }

    if (localWallpaper.assetId !== wallpaper.assetId) {
      throw new InvalidDashboardBackupError(
        'Идентификатор локальных обоев не совпадает с конфигурацией',
      );
    }
  } else if (localWallpaper !== null) {
    throw new InvalidDashboardBackupError(
      'Резервная копия содержит лишние данные локальных обоев',
    );
  }

  const localImages: LocalImageAssetV1[] = [];

  if (value.formatVersion === 2) {
    if (value.localImages !== undefined && !Array.isArray(value.localImages)) {
      throw new InvalidDashboardBackupError(
        'Данные локальных изображений в резервной копии повреждены',
      );
    }

    const rawImages = Array.isArray(value.localImages) ? value.localImages : [];
    const assetIdsInBackup = new Set<string>();

    for (const item of rawImages) {
      let asset: LocalImageAssetV1;
      try {
        asset = parseWallpaperAsset(item);
      } catch {
        throw new InvalidDashboardBackupError(
          'Данные локальных изображений в резервной копии повреждены',
        );
      }

      if (assetIdsInBackup.has(asset.assetId)) {
        throw new InvalidDashboardBackupError(
          'Резервная копия содержит дублирующиеся локальные изображения',
        );
      }

      assetIdsInBackup.add(asset.assetId);
      localImages.push(asset);
    }

    for (const widget of dashboard.widgets) {
      if (widget.type === 'image' && widget.source.type === 'local') {
        if (!assetIdsInBackup.has(widget.source.assetId)) {
          throw new InvalidDashboardBackupError(
            'В резервной копии отсутствуют необходимые локальные изображения',
          );
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
    localWallpaper,
    localImages,
  };
}

export function parseDashboardBackupJson(source: string): DashboardBackupV2 {
  let value: unknown;

  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new InvalidDashboardBackupError('Файл не содержит корректный JSON');
  }

  return parseDashboardBackup(value);
}

export async function prepareDashboardImport(
  source: string,
  signal?: AbortSignal,
): Promise<PreparedDashboardImport> {
  throwIfAborted(signal);
  const backup = parseDashboardBackupJson(source);
  const wallpaper = backup.dashboard.appearance.wallpaper;

  let preparedWallpaper: LocalWallpaperAssetV1 | null = null;
  let updatedAppearance = backup.dashboard.appearance;

  if (wallpaper.type === 'url') {
    const url = await validateWallpaperUrl(wallpaper.url, signal);
    updatedAppearance = {
      ...backup.dashboard.appearance,
      wallpaper: { type: 'url', url },
    };
  } else if (wallpaper.type === 'local' && backup.localWallpaper) {
    let bytes: Uint8Array;

    try {
      bytes = await decodeWallpaperAsset(backup.localWallpaper);
    } catch {
      throw new InvalidDashboardBackupError(
        'Данные локальных обоев не удалось декодировать',
      );
    }

    await validateWallpaperBytes(bytes, backup.localWallpaper.mimeType, signal);
    throwIfAborted(signal);

    const assetId = crypto.randomUUID();
    preparedWallpaper = await encodeWallpaperAsset(
      assetId,
      backup.localWallpaper.mimeType,
      bytes,
    );

    updatedAppearance = {
      ...backup.dashboard.appearance,
      wallpaper: { type: 'local', assetId },
    };
  }

  const assetIdMap = new Map<string, string>();
  const preparedLocalImages: LocalImageAssetV1[] = [];

  for (const imageAsset of backup.localImages) {
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
    assetIdMap.set(imageAsset.assetId, newAssetId);

    const preparedAsset = await encodeWallpaperAsset(
      newAssetId,
      imageAsset.mimeType,
      bytes,
    );
    preparedLocalImages.push(preparedAsset);
  }

  const updatedWidgets = backup.dashboard.widgets.map((widget) => {
    if (widget.type === 'image' && widget.source.type === 'local') {
      const newAssetId = assetIdMap.get(widget.source.assetId);
      if (newAssetId) {
        return {
          ...widget,
          source: {
            ...widget.source,
            assetId: newAssetId,
          },
        };
      }
    }
    return widget;
  });

  return {
    dashboard: {
      ...backup.dashboard,
      appearance: updatedAppearance,
      widgets: updatedWidgets,
    },
    localWallpaper: preparedWallpaper,
    localImages: preparedLocalImages,
  };
}

export async function replaceDashboardFromBackup(
  currentConfig: DashboardConfig,
  preparedImport: PreparedDashboardImport,
): Promise<DashboardImportResult> {
  const config = migrateBackupDashboard(preparedImport.dashboard);
  const wallpaper = config.appearance.wallpaper;
  const savedImageAssetIds: string[] = [];

  for (const asset of preparedImport.localImages) {
    await saveImageAsset(asset);
    savedImageAssetIds.push(asset.assetId);
  }

  if (wallpaper.type === 'local') {
    const asset = parseBackupWallpaper(preparedImport.localWallpaper);

    if (!asset || asset.assetId !== wallpaper.assetId) {
      await deleteImageAssets(savedImageAssetIds);
      throw new InvalidDashboardBackupError(
        'Подготовленные локальные обои не совпадают с конфигурацией',
      );
    }

    await saveWallpaperAsset(asset);

    try {
      await saveDashboardConfig(config);
    } catch (error) {
      try {
        await deleteWallpaperAsset(asset.assetId);
      } catch {
        // Startup cleanup removes the orphan.
      }
      try {
        await deleteImageAssets(savedImageAssetIds);
      } catch {
        // Startup cleanup removes the orphans.
      }

      throw error;
    }
  } else {
    if (preparedImport.localWallpaper !== null) {
      await deleteImageAssets(savedImageAssetIds);
      throw new InvalidDashboardBackupError(
        'Подготовленный импорт содержит лишние локальные обои',
      );
    }

    try {
      await saveDashboardConfig(config);
    } catch (error) {
      try {
        await deleteImageAssets(savedImageAssetIds);
      } catch {
        // Startup cleanup removes the orphans.
      }
      throw error;
    }
  }

  const activeWallpaperAssetId =
    wallpaper.type === 'local' ? wallpaper.assetId : null;
  const warning = await removePreviousLocalWallpaper(
    currentConfig,
    activeWallpaperAssetId,
  );
  if (!warning) {
    void cleanupOrphanedWallpaperAssets(activeWallpaperAssetId).catch(
      () => undefined,
    );
  }

  const activeImageAssetIds = new Set<string>();
  for (const widget of config.widgets) {
    if (widget.type === 'image' && widget.source.type === 'local') {
      activeImageAssetIds.add(widget.source.assetId);
    }
  }
  void cleanupOrphanedImageAssets(activeImageAssetIds).catch(() => undefined);
  void clearWeatherCaches().catch(() => undefined);

  return {
    config,
    warning,
  };
}
