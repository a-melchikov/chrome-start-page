// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  InvalidWallpaperAssetError,
  MAX_WALLPAPER_DECOMPRESSED_BYTES,
  decodeWallpaperAsset,
  encodeWallpaperAsset,
  parseWallpaperAsset,
} from '../../storage/wallpaper-codec';

const ASSET_ID = 'f7f44d0c-550a-4c1a-99c7-1e285dfba3fd';

describe('wallpaper asset codec', () => {
  it('keeps files at or below the threshold byte-for-byte', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const asset = await encodeWallpaperAsset(ASSET_ID, 'image/png', bytes, 4);

    expect(asset.encoding).toBe('base64');
    expect(asset.originalByteLength).toBe(bytes.byteLength);
    expect(asset.storedByteLength).toBe(bytes.byteLength);
    expect(Array.from(await decodeWallpaperAsset(asset))).toEqual(
      Array.from(bytes),
    );
  });

  it('stores a useful gzip result and restores the original bytes', async () => {
    const bytes = new TextEncoder().encode('a'.repeat(256));
    const asset = await encodeWallpaperAsset(
      ASSET_ID,
      'image/svg+xml',
      bytes,
      64,
    );

    expect(asset.encoding).toBe('gzip-base64');
    expect(asset.storedByteLength).toBeLessThanOrEqual(64);
    expect(Array.from(await decodeWallpaperAsset(asset))).toEqual(
      Array.from(bytes),
    );
  });

  it('falls back to the original when gzip stays above the threshold', async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(512));
    const asset = await encodeWallpaperAsset(ASSET_ID, 'image/jpeg', bytes, 8);

    expect(asset.encoding).toBe('base64');
    expect(asset.storedByteLength).toBe(bytes.byteLength);
    expect(Array.from(await decodeWallpaperAsset(asset))).toEqual(
      Array.from(bytes),
    );
  });

  it('rejects malformed persisted payloads', () => {
    expect(() =>
      parseWallpaperAsset({
        version: 1,
        assetId: ASSET_ID,
        mimeType: 'image/png',
        encoding: 'unknown',
        originalByteLength: 1,
        storedByteLength: 1,
        data: 'AQ==',
      }),
    ).toThrow(InvalidWallpaperAssetError);
  });

  it('rejects invalid base64 and mismatched stored lengths', async () => {
    const baseAsset = await encodeWallpaperAsset(
      ASSET_ID,
      'image/png',
      new Uint8Array([1]),
    );

    await expect(
      decodeWallpaperAsset({ ...baseAsset, data: '*not-base64*' }),
    ).rejects.toThrow(InvalidWallpaperAssetError);
    await expect(
      decodeWallpaperAsset({ ...baseAsset, storedByteLength: 2 }),
    ).rejects.toThrow(InvalidWallpaperAssetError);
  });

  it('rejects a decoded payload with the wrong original length', async () => {
    const bytes = new TextEncoder().encode('a'.repeat(256));
    const asset = await encodeWallpaperAsset(
      ASSET_ID,
      'image/svg+xml',
      bytes,
      64,
    );

    await expect(
      decodeWallpaperAsset({
        ...asset,
        originalByteLength: asset.originalByteLength + 1,
      }),
    ).rejects.toThrow(InvalidWallpaperAssetError);
  });

  it('rejects parseWallpaperAsset when originalByteLength exceeds MAX_WALLPAPER_DECOMPRESSED_BYTES', () => {
    expect(() =>
      parseWallpaperAsset({
        version: 1,
        assetId: ASSET_ID,
        mimeType: 'image/png',
        encoding: 'base64',
        originalByteLength: MAX_WALLPAPER_DECOMPRESSED_BYTES + 1,
        storedByteLength: 1,
        data: 'AQ==',
      }),
    ).toThrow(InvalidWallpaperAssetError);
  });
});
