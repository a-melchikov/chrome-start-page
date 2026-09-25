import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  cleanupOrphanedImageAssets,
  cleanupUnusedImageAssets,
  collectLocalImageAssetIds,
  deleteImageAsset,
  deleteImageAssets,
  getImageAssetKey,
  loadImageAsset,
  saveImageAsset,
  type LocalImageAssetV1,
} from '../../storage/image-assets';

const ACTIVE_ID_1 = '8dc04e26-6465-4e84-bc05-633c0e28415b';
const ACTIVE_ID_2 = '3e5f29d1-817e-4f24-9b55-d3c2a6bf9971';
const ORPHAN_ID = '7af1599d-ae5f-4590-9791-bc299eb3b4db';

function createAsset(assetId: string): LocalImageAssetV1 {
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

describe('image asset storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('stores and loads an asset under its own key', async () => {
    const asset = createAsset(ACTIVE_ID_1);
    await saveImageAsset(asset);

    await expect(loadImageAsset(ACTIVE_ID_1)).resolves.toEqual(asset);
    await expect(
      storage.getItem(getImageAssetKey(ACTIVE_ID_1)),
    ).resolves.toEqual(asset);
  });

  it('returns null when an asset is missing', async () => {
    await expect(loadImageAsset(ACTIVE_ID_1)).resolves.toBeNull();
  });

  it('deletes a stored asset and supports bulk delete', async () => {
    await saveImageAsset(createAsset(ACTIVE_ID_1));
    await saveImageAsset(createAsset(ACTIVE_ID_2));

    await deleteImageAsset(ACTIVE_ID_1);
    await expect(loadImageAsset(ACTIVE_ID_1)).resolves.toBeNull();
    await expect(loadImageAsset(ACTIVE_ID_2)).resolves.not.toBeNull();

    await deleteImageAssets([ACTIVE_ID_2]);
    await expect(loadImageAsset(ACTIVE_ID_2)).resolves.toBeNull();
  });

  it('removes orphaned assets and preserves active assets', async () => {
    await saveImageAsset(createAsset(ACTIVE_ID_1));
    await saveImageAsset(createAsset(ACTIVE_ID_2));
    await saveImageAsset(createAsset(ORPHAN_ID));

    await cleanupOrphanedImageAssets(new Set([ACTIVE_ID_1, ACTIVE_ID_2]));

    await expect(loadImageAsset(ACTIVE_ID_1)).resolves.toEqual(
      createAsset(ACTIVE_ID_1),
    );
    await expect(loadImageAsset(ACTIVE_ID_2)).resolves.toEqual(
      createAsset(ACTIVE_ID_2),
    );
    await expect(loadImageAsset(ORPHAN_ID)).resolves.toBeNull();
  });

  it('collects local image asset IDs and cleans up unused assets on config transition', async () => {
    const asset1 = createAsset(ACTIVE_ID_1);
    const asset2 = createAsset(ACTIVE_ID_2);
    await saveImageAsset(asset1);
    await saveImageAsset(asset2);

    const prevWidgets = [
      { type: 'image', source: { type: 'local', assetId: ACTIVE_ID_1 } },
      { type: 'image', source: { type: 'local', assetId: ACTIVE_ID_2 } },
      { type: 'markdown', source: undefined },
    ];

    expect(collectLocalImageAssetIds(prevWidgets)).toEqual(
      new Set([ACTIVE_ID_1, ACTIVE_ID_2]),
    );

    // Widget 2 was removed or changed to URL
    const nextWidgets = [
      { type: 'image', source: { type: 'local', assetId: ACTIVE_ID_1 } },
      {
        type: 'image',
        source: { type: 'url', url: 'https://example.com/pic.png' },
      },
    ];

    await cleanupUnusedImageAssets(prevWidgets, nextWidgets);

    await expect(loadImageAsset(ACTIVE_ID_1)).resolves.toEqual(asset1);
    await expect(loadImageAsset(ACTIVE_ID_2)).resolves.toBeNull();
  });

  it('rejects arbitrary asset identifiers and malformed payloads', async () => {
    expect(() => getImageAssetKey('not-a-uuid')).toThrow();
    await storage.setItem(getImageAssetKey(ACTIVE_ID_1), {
      ...createAsset(ACTIVE_ID_1),
      mimeType: 'text/html',
    });

    await expect(loadImageAsset(ACTIVE_ID_1)).rejects.toThrow();
  });
});
