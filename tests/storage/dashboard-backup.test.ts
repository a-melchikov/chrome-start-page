import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  DASHBOARD_BACKUP_FORMAT,
  DASHBOARD_BACKUP_FORMAT_VERSION,
  createDashboardBackup,
  createDashboardBackupFileName,
  parseDashboardBackup,
  parseDashboardBackupJson,
  prepareDashboardImport,
  replaceDashboardFromBackup,
  serializeDashboardBackup,
  type PreparedDashboardImport,
} from '../../storage/dashboard-backup';
import {
  DASHBOARD_STORAGE_KEY,
  loadDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  loadWallpaperAsset,
  saveWallpaperAsset,
} from '../../storage/wallpaper-assets';
import type { LocalWallpaperAssetV1 } from '../../storage/wallpaper-codec';
import type { DashboardConfig } from '../../storage/schema';

const OLD_ASSET_ID = '8dc04e26-6465-4e84-bc05-633c0e28415b';
const EXPORTED_ASSET_ID = '7af1599d-ae5f-4590-9791-bc299eb3b4db';
const IMPORTED_ASSET_ID = '7a830f33-d1c4-4b10-9eed-e49362ef8e55';
const EXPORTED_AT = '2026-09-10T12:34:56.000Z';
const PNG_DATA = 'iVBORw0KGgo=';

let imageShouldDecode = true;

class FakeImage {
  decoding: 'async' | 'auto' | 'sync' = 'auto';
  onerror: OnErrorEventHandler | null = null;
  onload: ((this: GlobalEventHandlers, event: Event) => unknown) | null = null;
  referrerPolicy = '';
  private source = '';

  get src() {
    return this.source;
  }

  set src(value: string) {
    this.source = value;

    if (value) {
      queueMicrotask(() =>
        this.onload?.call(
          this as unknown as GlobalEventHandlers,
          new Event('load'),
        ),
      );
    }
  }

  async decode() {
    if (!imageShouldDecode) {
      throw new Error('decode failed');
    }
  }
}

function createConfig(
  wallpaper: DashboardConfig['appearance']['wallpaper'] = { type: 'none' },
): DashboardConfig {
  return {
    ...createDefaultDashboardConfig(),
    widgets: [
      {
        id: 'notes',
        type: 'markdown',
        title: 'Заметки',
        content: 'Содержимое',
        layout: { x: 1, y: 2, w: 4, h: 3 },
      },
    ],
    appearance: {
      ...createDefaultDashboardConfig().appearance,
      wallpaper,
    },
  };
}

function createAsset(assetId: string): LocalWallpaperAssetV1 {
  return {
    version: 1,
    assetId,
    mimeType: 'image/png',
    encoding: 'base64',
    originalByteLength: 8,
    storedByteLength: 8,
    data: PNG_DATA,
  };
}

function createEnvelope(
  dashboard: unknown,
  localWallpaper: unknown = null,
): Record<string, unknown> {
  return {
    format: DASHBOARD_BACKUP_FORMAT,
    formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
    exportedAt: EXPORTED_AT,
    dashboard,
    localWallpaper,
  };
}

describe('dashboard backup format', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    imageShouldDecode = true;
    vi.stubGlobal('Image', FakeImage);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:wallpaper'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('serializes a versioned backup and creates a portable filename', async () => {
    const config = createConfig();
    const backup = await createDashboardBackup(config, new Date(EXPORTED_AT));

    expect(backup).toEqual({
      format: DASHBOARD_BACKUP_FORMAT,
      formatVersion: 1,
      exportedAt: EXPORTED_AT,
      dashboard: config,
      localWallpaper: null,
    });
    expect(parseDashboardBackupJson(serializeDashboardBackup(backup))).toEqual(
      backup,
    );
    expect(createDashboardBackupFileName(backup.exportedAt)).toBe(
      'chrome-start-page-backup-2026-09-10T12-34-56Z.json',
    );
  });

  it('exports HTTPS wallpaper as a URL without an embedded asset', async () => {
    const config = createConfig({
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
    });

    await expect(
      createDashboardBackup(config, new Date(EXPORTED_AT)),
    ).resolves.toMatchObject({ dashboard: config, localWallpaper: null });
  });

  it('includes and verifies the referenced local wallpaper', async () => {
    const asset = createAsset(EXPORTED_ASSET_ID);
    const config = createConfig({
      type: 'local',
      assetId: EXPORTED_ASSET_ID,
    });
    await saveWallpaperAsset(asset);

    await expect(
      createDashboardBackup(config, new Date(EXPORTED_AT)),
    ).resolves.toEqual({
      format: DASHBOARD_BACKUP_FORMAT,
      formatVersion: 1,
      exportedAt: EXPORTED_AT,
      dashboard: config,
      localWallpaper: asset,
    });
  });

  it('migrates legacy dashboard data inside the current backup format', () => {
    const parsed = parseDashboardBackup(
      createEnvelope({
        version: 1,
        appearance: { theme: 'system', backgroundColor: '#18181b' },
        widgets: [
          {
            id: 'legacy-links',
            type: 'links',
            title: 'Ссылки',
            content: '[Docs](https://example.com)',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ],
      }),
    );

    expect(parsed.dashboard.version).toBe(5);
    expect(parsed.dashboard.widgets[0]).toMatchObject({
      id: 'legacy-links',
      type: 'markdown',
    });
    expect(parsed.dashboard.appearance.wallpaper).toEqual({ type: 'none' });
  });

  it.each([
    ['broken JSON', () => parseDashboardBackupJson('{')],
    ['foreign file', () => parseDashboardBackup({ dashboard: createConfig() })],
    [
      'future format',
      () =>
        parseDashboardBackup({
          ...createEnvelope(createConfig()),
          formatVersion: 2,
        }),
    ],
    [
      'future dashboard schema',
      () =>
        parseDashboardBackup(
          createEnvelope({ ...createConfig(), version: 999 }),
        ),
    ],
    [
      'missing local asset',
      () =>
        parseDashboardBackup(
          createEnvelope(
            createConfig({
              type: 'local',
              assetId: EXPORTED_ASSET_ID,
            }),
          ),
        ),
    ],
    [
      'mismatched local asset',
      () =>
        parseDashboardBackup(
          createEnvelope(
            createConfig({
              type: 'local',
              assetId: EXPORTED_ASSET_ID,
            }),
            createAsset(OLD_ASSET_ID),
          ),
        ),
    ],
    [
      'invalid MIME type',
      () =>
        parseDashboardBackup(
          createEnvelope(createConfig(), {
            ...createAsset(EXPORTED_ASSET_ID),
            mimeType: 'text/html',
          }),
        ),
    ],
  ])('rejects %s', (_name, action) => {
    expect(action).toThrow();
  });

  it('does not create an incomplete backup when a local asset is missing', async () => {
    await expect(
      createDashboardBackup(
        createConfig({ type: 'local', assetId: EXPORTED_ASSET_ID }),
      ),
    ).rejects.toThrow('Локальные обои не найдены');
  });

  it('rejects corrupt wallpaper bytes before changing storage', async () => {
    const source = JSON.stringify(
      createEnvelope(
        createConfig({ type: 'local', assetId: EXPORTED_ASSET_ID }),
        {
          ...createAsset(EXPORTED_ASSET_ID),
          data: '!!!!',
        },
      ),
    );

    await expect(prepareDashboardImport(source)).rejects.toThrow(
      'не удалось декодировать',
    );
    await expect(storage.getItem(DASHBOARD_STORAGE_KEY)).resolves.toBeNull();
  });

  it('rejects corrupt gzip wallpaper data', async () => {
    const source = JSON.stringify(
      createEnvelope(
        createConfig({ type: 'local', assetId: EXPORTED_ASSET_ID }),
        {
          ...createAsset(EXPORTED_ASSET_ID),
          encoding: 'gzip-base64',
          originalByteLength: 8,
          storedByteLength: 1,
          data: 'AQ==',
        },
      ),
    );

    await expect(prepareDashboardImport(source)).rejects.toThrow(
      'не удалось декодировать',
    );
  });

  it('validates HTTPS wallpaper again before preparing the import', async () => {
    const source = JSON.stringify(
      createEnvelope(
        createConfig({
          type: 'url',
          url: 'https://example.com/wallpaper.jpg',
        }),
      ),
    );

    const prepared = await prepareDashboardImport(source);

    expect(prepared.dashboard.appearance.wallpaper).toEqual({
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
    });
  });

  it('validates local wallpaper and assigns it a fresh asset ID', async () => {
    const source = JSON.stringify(
      createEnvelope(
        createConfig({ type: 'local', assetId: EXPORTED_ASSET_ID }),
        createAsset(EXPORTED_ASSET_ID),
      ),
    );

    const prepared = await prepareDashboardImport(source);
    const wallpaper = prepared.dashboard.appearance.wallpaper;

    expect(wallpaper.type).toBe('local');
    expect(prepared.localWallpaper?.assetId).not.toBe(EXPORTED_ASSET_ID);

    if (wallpaper.type === 'local') {
      expect(prepared.localWallpaper?.assetId).toBe(wallpaper.assetId);
    }
  });

  it('rejects an image that the browser cannot decode', async () => {
    imageShouldDecode = false;
    const source = JSON.stringify(
      createEnvelope(
        createConfig({ type: 'local', assetId: EXPORTED_ASSET_ID }),
        createAsset(EXPORTED_ASSET_ID),
      ),
    );

    await expect(prepareDashboardImport(source)).rejects.toThrow(
      'Ресурс не декодируется как изображение',
    );
  });
});

describe('dashboard backup replacement transaction', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('replaces the full dashboard and removes the previous local asset', async () => {
    const current = createConfig({ type: 'local', assetId: OLD_ASSET_ID });
    const imported = createConfig({
      type: 'local',
      assetId: IMPORTED_ASSET_ID,
    });
    const prepared: PreparedDashboardImport = {
      dashboard: imported,
      localWallpaper: createAsset(IMPORTED_ASSET_ID),
    };
    await saveDashboardConfig(current);
    await saveWallpaperAsset(createAsset(OLD_ASSET_ID));

    const setSpy = vi.spyOn(fakeBrowser.storage.local, 'set');

    const result = await replaceDashboardFromBackup(current, prepared);

    expect(result).toEqual({ config: imported, warning: null });
    expect(Object.keys(setSpy.mock.calls[0]?.[0] ?? {})).toEqual([
      `dashboard-wallpaper:${IMPORTED_ASSET_ID}`,
    ]);
    expect(Object.keys(setSpy.mock.calls[1]?.[0] ?? {})).toEqual([
      'dashboard-config',
    ]);
    await expect(loadDashboardConfig()).resolves.toEqual(imported);
    await expect(loadWallpaperAsset(IMPORTED_ASSET_ID)).resolves.toEqual(
      prepared.localWallpaper,
    );
    await expect(loadWallpaperAsset(OLD_ASSET_ID)).resolves.toBeNull();
  });

  it('rolls back the new asset and preserves the current dashboard on save failure', async () => {
    const current = createConfig({ type: 'local', assetId: OLD_ASSET_ID });
    const prepared: PreparedDashboardImport = {
      dashboard: createConfig({
        type: 'local',
        assetId: IMPORTED_ASSET_ID,
      }),
      localWallpaper: createAsset(IMPORTED_ASSET_ID),
    };
    await saveDashboardConfig(current);
    await saveWallpaperAsset(createAsset(OLD_ASSET_ID));
    const setSpy = vi.spyOn(fakeBrowser.storage.local, 'set');
    setSpy
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('config save failed'));

    await expect(replaceDashboardFromBackup(current, prepared)).rejects.toThrow(
      'config save failed',
    );

    await expect(loadDashboardConfig()).resolves.toEqual(current);
    await expect(loadWallpaperAsset(OLD_ASSET_ID)).resolves.toEqual(
      createAsset(OLD_ASSET_ID),
    );
    await expect(loadWallpaperAsset(IMPORTED_ASSET_ID)).resolves.toBeNull();
  });

  it('commits the import and reports a cleanup warning', async () => {
    const current = createConfig({ type: 'local', assetId: OLD_ASSET_ID });
    const imported = createConfig();
    await saveDashboardConfig(current);
    await saveWallpaperAsset(createAsset(OLD_ASSET_ID));
    vi.spyOn(storage, 'removeItem').mockRejectedValueOnce(
      new Error('remove failed'),
    );

    const result = await replaceDashboardFromBackup(current, {
      dashboard: imported,
      localWallpaper: null,
    });

    expect(result.warning).toContain('старые локальные обои');
    await expect(loadDashboardConfig()).resolves.toEqual(imported);
    await expect(loadWallpaperAsset(OLD_ASSET_ID)).resolves.toEqual(
      createAsset(OLD_ASSET_ID),
    );
  });
});
