import { DASHBOARD_CONFIG_VERSION } from '../../storage/schema';
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
import { loadImageAsset, saveImageAsset } from '../../storage/image-assets';
import type { LocalWallpaperAssetV1 } from '../../storage/wallpaper-codec';
import type { DashboardConfig, WallpaperConfig } from '../../storage/schema';
import type { ImageWidgetConfig } from '../../widgets/image/types';
import {
  restoreWorkspace,
  trashWorkspace,
} from '../../storage/workspace-trash';

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
  wallpaper: WallpaperConfig = { type: 'none' },
): DashboardConfig {
  const config = createDefaultDashboardConfig();
  config.workspaces[0]!.widgets = [
    {
      id: 'notes',
      type: 'markdown',
      title: 'Заметки',
      content: 'Содержимое',
      layout: { x: 1, y: 2, w: 4, h: 3 },
      template: 'blank',
      quickAddEnabled: false,
      hideCompletedTasks: false,
    },
  ];
  config.workspaces[0]!.appearance.wallpaper =
    wallpaper.type === 'none'
      ? { type: 'none' }
      : { enabled: true, ...wallpaper };
  return config;
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
  localWallpapers: unknown = [],
  localImages: unknown = [],
): Record<string, unknown> {
  return {
    format: DASHBOARD_BACKUP_FORMAT,
    formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
    exportedAt: EXPORTED_AT,
    dashboard,
    localWallpapers: Array.isArray(localWallpapers)
      ? localWallpapers
      : localWallpapers
        ? [localWallpapers]
        : [],
    localImages,
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
      formatVersion: 3,
      exportedAt: EXPORTED_AT,
      dashboard: config,
      localWallpapers: [],
      localImages: [],
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
    ).resolves.toMatchObject({ dashboard: config, localWallpapers: [] });
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
      formatVersion: 3,
      exportedAt: EXPORTED_AT,
      dashboard: config,
      localWallpapers: [asset],
      localImages: [],
    });
  });

  it('parses legacy formatVersion 1 backups with backward compatibility', () => {
    const v1Backup = {
      format: DASHBOARD_BACKUP_FORMAT,
      formatVersion: 1,
      exportedAt: EXPORTED_AT,
      dashboard: createConfig(),
      localWallpaper: null,
    };

    const parsed = parseDashboardBackup(v1Backup);
    expect(parsed.formatVersion).toBe(3);
    expect(parsed.localWallpapers).toEqual([]);
    expect(parsed.localImages).toEqual([]);
  });

  it('parses legacy formatVersion 2 backups with backward compatibility', () => {
    const asset = createAsset(EXPORTED_ASSET_ID);
    const v2Backup = {
      format: DASHBOARD_BACKUP_FORMAT,
      formatVersion: 2,
      exportedAt: EXPORTED_AT,
      dashboard: createConfig({ type: 'local', assetId: EXPORTED_ASSET_ID }),
      localWallpaper: asset,
      localImages: [],
    };

    const parsed = parseDashboardBackup(v2Backup);
    expect(parsed.formatVersion).toBe(3);
    expect(parsed.localWallpapers).toEqual([asset]);
    expect(parsed.localImages).toEqual([]);
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

    expect(parsed.dashboard.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(parsed.dashboard.workspaces[0]!.widgets[0]).toMatchObject({
      id: 'legacy-links',
      type: 'markdown',
      template: 'blank',
      quickAddEnabled: false,
      hideCompletedTasks: false,
    });
    expect(parsed.dashboard.workspaces[0]!.appearance.wallpaper).toEqual({
      type: 'none',
    });
  });

  it.each([
    ['broken JSON', () => parseDashboardBackupJson('{')],
    ['foreign file', () => parseDashboardBackup({ dashboard: createConfig() })],
    [
      'future format',
      () =>
        parseDashboardBackup({
          ...createEnvelope(createConfig()),
          formatVersion: 4,
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

    expect(prepared.dashboard.workspaces[0]!.appearance.wallpaper).toEqual({
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
      enabled: true,
    });
  });

  it('preserves disabled wallpaper state when preparing import', async () => {
    const config = createConfig();
    config.workspaces[0]!.appearance.wallpaper = {
      type: 'url',
      url: 'https://example.com/disabled.jpg',
      enabled: false,
    };
    const source = JSON.stringify(createEnvelope(config));

    const prepared = await prepareDashboardImport(source);

    expect(prepared.dashboard.workspaces[0]!.appearance.wallpaper).toEqual({
      type: 'url',
      url: 'https://example.com/disabled.jpg',
      enabled: false,
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
    const wallpaper = prepared.dashboard.workspaces[0]!.appearance.wallpaper;

    expect(wallpaper.type).toBe('local');
    expect(prepared.localWallpapers[0]?.assetId).not.toBe(EXPORTED_ASSET_ID);

    if (wallpaper.type === 'local') {
      expect(prepared.localWallpapers[0]?.assetId).toBe(wallpaper.assetId);
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
    imageShouldDecode = true;
    vi.stubGlobal('Image', FakeImage);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:image'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('replaces the full dashboard and removes the previous local asset', async () => {
    const current = createConfig({ type: 'local', assetId: OLD_ASSET_ID });
    const imported = createConfig({
      type: 'local',
      assetId: IMPORTED_ASSET_ID,
    });
    const prepared: PreparedDashboardImport = {
      dashboard: imported,
      localWallpapers: [createAsset(IMPORTED_ASSET_ID)],
      localImages: [],
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
      prepared.localWallpapers[0],
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
      localWallpapers: [createAsset(IMPORTED_ASSET_ID)],
      localImages: [],
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
      localWallpapers: [],
      localImages: [],
    });

    expect(result.warning).toContain('старые локальные обои');
    await expect(loadDashboardConfig()).resolves.toEqual(imported);
    await expect(loadWallpaperAsset(OLD_ASSET_ID)).resolves.toEqual(
      createAsset(OLD_ASSET_ID),
    );
  });

  it('includes referenced local images in export and restores them with fresh asset IDs', async () => {
    const imgAsset = createAsset(EXPORTED_ASSET_ID);
    await saveImageAsset(imgAsset);

    const configWithImage: DashboardConfig = createConfig();
    configWithImage.workspaces[0]!.widgets = [
      {
        id: 'img-1',
        type: 'image',
        source: { type: 'local', assetId: EXPORTED_ASSET_ID },
        objectPosition: 'center',
        layout: { x: 0, y: 0, w: 4, h: 4 },
      },
    ];

    const backup = await createDashboardBackup(
      configWithImage,
      new Date(EXPORTED_AT),
    );
    expect(backup.localImages).toEqual([imgAsset]);

    const serialized = serializeDashboardBackup(backup);
    const prepared = await prepareDashboardImport(serialized);

    expect(prepared.localImages).toHaveLength(1);
    const newAsset = prepared.localImages[0];
    expect(newAsset).toBeDefined();
    const newAssetId = newAsset!.assetId;
    expect(newAssetId).not.toBe(EXPORTED_ASSET_ID);

    const importedWidget = prepared.dashboard.workspaces[0]!.widgets.find(
      (w): w is ImageWidgetConfig => w.id === 'img-1' && w.type === 'image',
    );
    expect(importedWidget?.source).toEqual({
      type: 'local',
      assetId: newAssetId,
    });

    const current = createConfig();
    await replaceDashboardFromBackup(current, prepared);

    await expect(loadImageAsset(newAssetId)).resolves.toEqual(newAsset);
  });

  it('rejects backup with image widget when local image is missing from localImages', () => {
    const configMissing = createConfig();
    configMissing.workspaces[0]!.widgets = [
      {
        id: 'img-1',
        type: 'image',
        source: { type: 'local', assetId: EXPORTED_ASSET_ID },
        objectPosition: 'center',
        layout: { x: 0, y: 0, w: 4, h: 4 },
      },
    ];
    const envelope = createEnvelope(configMissing, [], []);

    expect(() => parseDashboardBackup(envelope)).toThrow(
      'В резервной копии отсутствуют необходимые локальные изображения',
    );
  });

  it('exports and restores a dashboard containing a clock widget', async () => {
    const clockConfig: DashboardConfig = createConfig();
    clockConfig.workspaces[0]!.widgets = [
      {
        id: 'clock-1',
        type: 'clock',
        title: 'Офис Токио',
        timeFormat: '12h',
        showTime: true,
        showSeconds: true,
        showDate: true,
        dateFormat: 'shortWithYear',
        showDayOfWeek: true,
        timezone: 'Asia/Tokyo',
        showTimezoneName: true,
        showTimezoneAbbr: true,
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
    ];

    const backup = await createDashboardBackup(
      clockConfig,
      new Date(EXPORTED_AT),
    );
    expect(backup.dashboard.workspaces[0]!.widgets).toHaveLength(1);
    expect(backup.dashboard.workspaces[0]!.widgets[0]).toEqual(
      clockConfig.workspaces[0]!.widgets[0],
    );

    const serialized = serializeDashboardBackup(backup);
    const prepared = await prepareDashboardImport(serialized);
    expect(prepared.dashboard.workspaces[0]!.widgets[0]).toEqual(
      clockConfig.workspaces[0]!.widgets[0],
    );

    const current = createConfig();
    await replaceDashboardFromBackup(current, prepared);
    const stored = await loadDashboardConfig();
    expect(stored.workspaces[0]!.widgets[0]).toEqual(
      clockConfig.workspaces[0]!.widgets[0],
    );
  });
});

describe('toolbar backup compatibility', () => {
  it.each(['top-right', 'left-fixed', 'left-collapsible'] as const)(
    'exports and imports %s with the existing v3 envelope',
    (mode) => {
      const config = createConfig();
      config.toolbar = { mode };
      const parsed = parseDashboardBackupJson(
        JSON.stringify(createEnvelope(config)),
      );
      expect(parsed.dashboard.toolbar).toEqual({ mode });
      expect(parsed.formatVersion).toBe(3);
      expect(parsed.dashboard.version).toBe(DASHBOARD_CONFIG_VERSION);
    },
  );

  it('imports a v3 backup containing schema v8 with the top-right default', () => {
    const config = createConfig();
    const legacy = {
      version: 8,
      workspaces: config.workspaces,
      activeWorkspaceId: config.activeWorkspaceId,
      customThemes: config.customThemes,
    };
    const parsed = parseDashboardBackupJson(
      JSON.stringify(createEnvelope(legacy)),
    );
    expect(parsed.dashboard.toolbar).toEqual({ mode: 'top-right' });
    expect(parsed.dashboard.workspaces).toEqual(config.workspaces);
  });
});

describe('workspace trash backup', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    imageShouldDecode = true;
    vi.stubGlobal('Image', FakeImage);
  });

  it('exports, imports and restores trash with remapped local image and wallpaper assets', async () => {
    const config = createConfig({ type: 'local', assetId: EXPORTED_ASSET_ID });
    const original = config.workspaces[0]!;
    original.widgets = [
      {
        id: 'trashed-image',
        type: 'image',
        source: { type: 'local', assetId: OLD_ASSET_ID },
        objectPosition: 'center',
        layout: { x: 0, y: 1, w: 4, h: 4 },
      },
    ];
    await saveWallpaperAsset(createAsset(EXPORTED_ASSET_ID));
    await saveImageAsset(createAsset(OLD_ASSET_ID));
    const trashed = trashWorkspace(config, original.id);
    const backup = await createDashboardBackup(trashed);
    expect(backup.localWallpapers).toHaveLength(1);
    expect(backup.localImages).toHaveLength(1);
    const parsed = parseDashboardBackupJson(serializeDashboardBackup(backup));
    const prepared = await prepareDashboardImport(
      serializeDashboardBackup(parsed),
    );
    const restoredEntry = prepared.dashboard.trashedWorkspaces![0]!.workspace;
    const wallpaper = restoredEntry.appearance.wallpaper;
    const image = restoredEntry.widgets[0]!;
    expect(wallpaper.type).toBe('local');
    expect(image.type).toBe('image');
    if (
      wallpaper.type !== 'local' ||
      image.type !== 'image' ||
      image.source.type !== 'local'
    )
      throw new Error('Missing imported resources');
    expect(wallpaper.assetId).not.toBe(EXPORTED_ASSET_ID);
    expect(image.source.assetId).not.toBe(OLD_ASSET_ID);
    await saveDashboardConfig(trashed);
    const imported = await replaceDashboardFromBackup(trashed, prepared);
    const restored = restoreWorkspace(imported.config, original.id);
    expect(restored.activeWorkspaceId).toBe(original.id);
    expect(restored.workspaces[0]).toEqual(restoredEntry);
    expect(await loadWallpaperAsset(wallpaper.assetId)).not.toBeNull();
    expect(await loadImageAsset(image.source.assetId)).not.toBeNull();
  });

  it('rejects a backup that omits assets used only by the trash', async () => {
    const config = createConfig({ type: 'local', assetId: EXPORTED_ASSET_ID });
    const trashed = trashWorkspace(config, config.workspaces[0]!.id);
    expect(() =>
      parseDashboardBackup({
        format: DASHBOARD_BACKUP_FORMAT,
        formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
        exportedAt: EXPORTED_AT,
        dashboard: trashed,
        localWallpapers: [],
        localImages: [],
      }),
    ).toThrow('В резервной копии отсутствуют локальные обои');
  });
});
