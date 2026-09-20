import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { useWallpaperImage } from '../../hooks/use-wallpaper-image';
import { saveWallpaperAsset } from '../../storage/wallpaper-assets';
import type { LocalWallpaperAssetV1 } from '../../storage/wallpaper-codec';
import type { WallpaperConfig } from '../../storage/schema';

const ASSET_ID = '8dc04e26-6465-4e84-bc05-633c0e28415b';

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

  async decode() {}
}

function createAsset(): LocalWallpaperAssetV1 {
  return {
    version: 1,
    assetId: ASSET_ID,
    mimeType: 'image/png',
    encoding: 'base64',
    originalByteLength: 8,
    storedByteLength: 8,
    data: 'iVBORw0KGgo=',
  };
}

describe('useWallpaperImage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.stubGlobal('Image', FakeImage);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:display'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns no render source for no wallpaper', () => {
    const hook = renderHook(() => useWallpaperImage({ type: 'none' }));

    expect(hook.result.current).toEqual({
      src: null,
      error: null,
      sourceType: 'none',
    });
  });

  it('returns a remote URL without creating a Blob URL', () => {
    const wallpaper: WallpaperConfig = {
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
    };
    const hook = renderHook(() => useWallpaperImage(wallpaper));

    expect(hook.result.current).toEqual({
      src: wallpaper.url,
      error: null,
      sourceType: 'url',
    });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('loads a local asset, creates a display Blob URL, and revokes it', async () => {
    await saveWallpaperAsset(createAsset());
    const wallpaper: WallpaperConfig = { type: 'local', assetId: ASSET_ID };
    const hook = renderHook(() => useWallpaperImage(wallpaper));

    await waitFor(() =>
      expect(hook.result.current).toEqual({
        src: 'blob:display',
        error: null,
        sourceType: 'local',
      }),
    );

    hook.unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:display');
  });

  it('reports a missing local asset without creating a render source', async () => {
    const wallpaper: WallpaperConfig = { type: 'local', assetId: ASSET_ID };
    const hook = renderHook(() => useWallpaperImage(wallpaper));

    await waitFor(() => expect(hook.result.current.error).not.toBeNull());

    expect(hook.result.current.src).toBeNull();
    expect(hook.result.current.error).toContain('не найдены');
  });

  it('revokes the old local URL when the source changes', async () => {
    await saveWallpaperAsset(createAsset());
    const { result, rerender } = renderHook(
      ({ wallpaper }: { wallpaper: WallpaperConfig }) =>
        useWallpaperImage(wallpaper),
      {
        initialProps: {
          wallpaper: { type: 'local', assetId: ASSET_ID },
        },
      },
    );
    await waitFor(() => expect(result.current.src).toBe('blob:display'));

    act(() => {
      rerender({
        wallpaper: {
          type: 'url',
          url: 'https://example.com/next.jpg',
        },
      });
    });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:display');
    expect(result.current.src).toBe('https://example.com/next.jpg');
  });
});
