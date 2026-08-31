import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  loadDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import {
  loadWallpaperAsset,
  saveWallpaperAsset,
} from '../../storage/wallpaper-assets';
import type { LocalWallpaperAssetV1 } from '../../storage/wallpaper-codec';
import type { DashboardConfig } from '../../storage/schema';
import {
  installLocalWallpaper,
  installUrlWallpaper,
  removeWallpaper,
} from '../../storage/wallpaper-transactions';

const OLD_ID = '8dc04e26-6465-4e84-bc05-633c0e28415b';
const NEW_ID = '7af1599d-ae5f-4590-9791-bc299eb3b4db';

function createAsset(assetId: string): LocalWallpaperAssetV1 {
  return {
    version: 1,
    assetId,
    mimeType: 'image/png',
    encoding: 'base64',
    originalByteLength: 1,
    storedByteLength: 1,
    data: 'AQ==',
  };
}

function createConfig(
  wallpaper: DashboardConfig['appearance']['wallpaper'],
): DashboardConfig {
  return {
    version: 3,
    widgets: [],
    appearance: {
      theme: 'system',
      backgroundColor: '#18181b',
      wallpaper,
    },
  };
}

describe('wallpaper storage transactions', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('installs a local asset before publishing its config', async () => {
    const result = await installLocalWallpaper(
      createConfig({ type: 'none' }),
      createAsset(NEW_ID),
    );

    expect(result).toEqual({
      config: createConfig({ type: 'local', assetId: NEW_ID }),
      warning: null,
    });
    await expect(loadWallpaperAsset(NEW_ID)).resolves.toEqual(
      createAsset(NEW_ID),
    );
    await expect(loadDashboardConfig()).resolves.toEqual(result.config);
  });

  it('removes the previous local asset only after a replacement succeeds', async () => {
    await saveWallpaperAsset(createAsset(OLD_ID));
    await saveDashboardConfig(createConfig({ type: 'local', assetId: OLD_ID }));

    const result = await installLocalWallpaper(
      createConfig({ type: 'local', assetId: OLD_ID }),
      createAsset(NEW_ID),
    );

    expect(result.config.appearance.wallpaper).toEqual({
      type: 'local',
      assetId: NEW_ID,
    });
    await expect(loadWallpaperAsset(OLD_ID)).resolves.toBeNull();
    await expect(loadWallpaperAsset(NEW_ID)).resolves.toEqual(
      createAsset(NEW_ID),
    );
  });

  it('rolls back the new asset and preserves the old one when config save fails', async () => {
    await saveWallpaperAsset(createAsset(OLD_ID));
    const invalidCurrent = {
      ...createConfig({ type: 'local', assetId: OLD_ID }),
      appearance: {
        ...createConfig({ type: 'local', assetId: OLD_ID }).appearance,
        theme: 'invalid',
      },
    } as unknown as DashboardConfig;

    await expect(
      installLocalWallpaper(invalidCurrent, createAsset(NEW_ID)),
    ).rejects.toThrow();

    await expect(loadWallpaperAsset(NEW_ID)).resolves.toBeNull();
    await expect(loadWallpaperAsset(OLD_ID)).resolves.toEqual(
      createAsset(OLD_ID),
    );
  });

  it('switches from a local asset to a validated URL and removes the asset', async () => {
    await saveWallpaperAsset(createAsset(OLD_ID));
    const current = createConfig({ type: 'local', assetId: OLD_ID });

    const result = await installUrlWallpaper(
      current,
      'https://example.com/wallpaper.svg',
    );

    expect(result.config.appearance.wallpaper).toEqual({
      type: 'url',
      url: 'https://example.com/wallpaper.svg',
    });
    await expect(loadWallpaperAsset(OLD_ID)).resolves.toBeNull();
  });

  it('clears the active wallpaper and removes its local asset', async () => {
    await saveWallpaperAsset(createAsset(OLD_ID));

    const result = await removeWallpaper(
      createConfig({ type: 'local', assetId: OLD_ID }),
    );

    expect(result.config.appearance.wallpaper).toEqual({ type: 'none' });
    await expect(loadWallpaperAsset(OLD_ID)).resolves.toBeNull();
  });

  it('commits the new config and returns a warning when old asset cleanup fails', async () => {
    await saveWallpaperAsset(createAsset(OLD_ID));
    vi.spyOn(storage, 'removeItem').mockRejectedValueOnce(
      new Error('remove failed'),
    );

    const result = await installUrlWallpaper(
      createConfig({ type: 'local', assetId: OLD_ID }),
      'https://example.com/wallpaper.jpg',
    );

    expect(result.warning).toContain('старые локальные обои');
    await expect(loadDashboardConfig()).resolves.toEqual(result.config);
    await expect(loadWallpaperAsset(OLD_ID)).resolves.toEqual(
      createAsset(OLD_ID),
    );
  });
});
