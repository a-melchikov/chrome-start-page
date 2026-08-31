import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  WALLPAPER_ASSET_KEY_PREFIX,
  cleanupOrphanedWallpaperAssets,
  deleteWallpaperAsset,
  getWallpaperAssetKey,
  loadWallpaperAsset,
  saveWallpaperAsset,
} from '../../storage/wallpaper-assets';
import type { LocalWallpaperAssetV1 } from '../../storage/wallpaper-codec';

const ACTIVE_ID = '8dc04e26-6465-4e84-bc05-633c0e28415b';
const ORPHAN_ID = '7af1599d-ae5f-4590-9791-bc299eb3b4db';

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

describe('wallpaper asset storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('stores and loads an asset under its own key', async () => {
    const asset = createAsset(ACTIVE_ID);
    await saveWallpaperAsset(asset);

    await expect(loadWallpaperAsset(ACTIVE_ID)).resolves.toEqual(asset);
    await expect(
      storage.getItem(getWallpaperAssetKey(ACTIVE_ID)),
    ).resolves.toEqual(asset);
  });

  it('returns null when an asset is missing', async () => {
    await expect(loadWallpaperAsset(ACTIVE_ID)).resolves.toBeNull();
  });

  it('deletes a stored asset', async () => {
    await saveWallpaperAsset(createAsset(ACTIVE_ID));

    await deleteWallpaperAsset(ACTIVE_ID);

    await expect(loadWallpaperAsset(ACTIVE_ID)).resolves.toBeNull();
  });

  it('removes orphaned assets and preserves the active asset and config', async () => {
    await saveWallpaperAsset(createAsset(ACTIVE_ID));
    await saveWallpaperAsset(createAsset(ORPHAN_ID));
    await storage.setItem('local:dashboard-config', { marker: true });

    await cleanupOrphanedWallpaperAssets(ACTIVE_ID);

    await expect(loadWallpaperAsset(ACTIVE_ID)).resolves.toEqual(
      createAsset(ACTIVE_ID),
    );
    await expect(loadWallpaperAsset(ORPHAN_ID)).resolves.toBeNull();
    await expect(storage.getItem('local:dashboard-config')).resolves.toEqual({
      marker: true,
    });
  });

  it('removes all wallpaper assets when there is no active local source', async () => {
    await saveWallpaperAsset(createAsset(ACTIVE_ID));
    await saveWallpaperAsset(createAsset(ORPHAN_ID));

    await cleanupOrphanedWallpaperAssets(null);

    const snapshot = await storage.snapshot('local');
    expect(
      Object.keys(snapshot).filter((key) =>
        key.startsWith(WALLPAPER_ASSET_KEY_PREFIX.slice('local:'.length)),
      ),
    ).toEqual([]);
  });

  it('rejects arbitrary asset identifiers and malformed payloads', async () => {
    expect(() => getWallpaperAssetKey('not-a-uuid')).toThrow();
    await storage.setItem(getWallpaperAssetKey(ACTIVE_ID), {
      ...createAsset(ACTIVE_ID),
      mimeType: 'text/html',
    });

    await expect(loadWallpaperAsset(ACTIVE_ID)).rejects.toThrow();
  });
});
