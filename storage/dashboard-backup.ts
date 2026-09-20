import { migrateDashboardConfig } from './migrations';
import {
  cleanupOrphanedWallpaperAssets,
  deleteWallpaperAsset,
  loadWallpaperAsset,
  saveWallpaperAsset,
} from './wallpaper-assets';
import {
  decodeWallpaperAsset,
  encodeWallpaperAsset,
  parseWallpaperAsset,
  type LocalWallpaperAssetV1,
} from './wallpaper-codec';
import { saveDashboardConfig } from './dashboard-storage';
import type { DashboardConfig } from './schema';
import {
  WallpaperValidationAbortedError,
  validateWallpaperBytes,
  validateWallpaperUrl,
} from '../wallpaper/image-validation';

export const DASHBOARD_BACKUP_FORMAT = 'chrome-start-page-backup' as const;
export const DASHBOARD_BACKUP_FORMAT_VERSION = 1 as const;

export interface DashboardBackupV1 {
  format: typeof DASHBOARD_BACKUP_FORMAT;
  formatVersion: typeof DASHBOARD_BACKUP_FORMAT_VERSION;
  exportedAt: string;
  dashboard: DashboardConfig;
  localWallpaper: LocalWallpaperAssetV1 | null;
}

export interface DashboardBackupDownload {
  fileName: string;
  contents: string;
}

export interface PreparedDashboardImport {
  dashboard: DashboardConfig;
  localWallpaper: LocalWallpaperAssetV1 | null;
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
): Promise<DashboardBackupV1> {
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

  return {
    format: DASHBOARD_BACKUP_FORMAT,
    formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    dashboard,
    localWallpaper,
  };
}

export function serializeDashboardBackup(backup: DashboardBackupV1): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function createDashboardBackupFileName(exportedAt: string): string {
  const timestamp = new Date(exportedAt)
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d{3}Z$/, 'Z');

  return `chrome-start-page-backup-${timestamp}.json`;
}

export function parseDashboardBackup(value: unknown): DashboardBackupV1 {
  if (!isRecord(value) || value.format !== DASHBOARD_BACKUP_FORMAT) {
    throw new InvalidDashboardBackupError(
      'Файл не является резервной копией Chrome Start Page',
    );
  }

  if (value.formatVersion !== DASHBOARD_BACKUP_FORMAT_VERSION) {
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

  return {
    format: DASHBOARD_BACKUP_FORMAT,
    formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
    exportedAt: value.exportedAt,
    dashboard,
    localWallpaper,
  };
}

export function parseDashboardBackupJson(source: string): DashboardBackupV1 {
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

  if (wallpaper.type === 'url') {
    const url = await validateWallpaperUrl(wallpaper.url, signal);

    return {
      dashboard: {
        ...backup.dashboard,
        appearance: {
          ...backup.dashboard.appearance,
          wallpaper: { type: 'url', url },
        },
      },
      localWallpaper: null,
    };
  }

  if (wallpaper.type !== 'local' || !backup.localWallpaper) {
    return {
      dashboard: backup.dashboard,
      localWallpaper: null,
    };
  }

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
  const localWallpaper = await encodeWallpaperAsset(
    assetId,
    backup.localWallpaper.mimeType,
    bytes,
  );

  return {
    dashboard: {
      ...backup.dashboard,
      appearance: {
        ...backup.dashboard.appearance,
        wallpaper: { type: 'local', assetId },
      },
    },
    localWallpaper,
  };
}

export async function replaceDashboardFromBackup(
  currentConfig: DashboardConfig,
  preparedImport: PreparedDashboardImport,
): Promise<DashboardImportResult> {
  const config = migrateBackupDashboard(preparedImport.dashboard);
  const wallpaper = config.appearance.wallpaper;

  if (wallpaper.type === 'local') {
    const asset = parseBackupWallpaper(preparedImport.localWallpaper);

    if (!asset || asset.assetId !== wallpaper.assetId) {
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
        // Startup cleanup removes the orphan while the original config remains
        // the active source of truth.
      }

      throw error;
    }
  } else {
    if (preparedImport.localWallpaper !== null) {
      throw new InvalidDashboardBackupError(
        'Подготовленный импорт содержит лишние локальные обои',
      );
    }

    await saveDashboardConfig(config);
  }

  const activeAssetId = wallpaper.type === 'local' ? wallpaper.assetId : null;
  const warning = await removePreviousLocalWallpaper(
    currentConfig,
    activeAssetId,
  );
  if (!warning) {
    void cleanupOrphanedWallpaperAssets(activeAssetId).catch(() => undefined);
  }

  return {
    config,
    warning,
  };
}
