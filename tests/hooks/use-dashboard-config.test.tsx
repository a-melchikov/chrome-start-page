import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import {
  DASHBOARD_STORAGE_KEY,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  loadWallpaperAsset,
  saveWallpaperAsset,
} from '../../storage/wallpaper-assets';
import type { LocalWallpaperAssetV1 } from '../../storage/wallpaper-codec';
import type { DashboardConfig } from '../../storage/schema';
import { WallpaperValidationAbortedError } from '../../wallpaper/image-validation';
import type { MarkdownWidgetConfig } from '../../widgets/markdown/types';

const ORPHAN_ASSET_ID = '8dc04e26-6465-4e84-bc05-633c0e28415b';

let imageShouldLoad = true;

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

    if (!value || !imageShouldLoad) {
      return;
    }

    queueMicrotask(() =>
      this.onload?.call(
        this as unknown as GlobalEventHandlers,
        new Event('load'),
      ),
    );
  }

  async decode() {}
}

function createWallpaperAsset(assetId: string): LocalWallpaperAssetV1 {
  return {
    version: 1,
    assetId,
    mimeType: 'image/png',
    encoding: 'base64',
    originalByteLength: 8,
    storedByteLength: 8,
    data: 'iVBORw0KGgo=',
  };
}

function createPngFile() {
  return new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
    'wallpaper.png',
    { type: 'image/png' },
  );
}

async function getStoredMarkdownWidget(): Promise<
  MarkdownWidgetConfig | undefined
> {
  const config = await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);
  const widget = config?.widgets[0];
  return widget?.type === 'markdown' ? widget : undefined;
}

describe('useDashboardConfig layout persistence', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    imageShouldLoad = true;
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

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('saves x/y/w/h and restores them for a new dashboard session', async () => {
    const widget: MarkdownWidgetConfig = {
      id: 'work-markdown',
      type: 'markdown',
      title: 'Работа',
      content: '[Mail](mail.example.com)',
      layout: { x: 0, y: 0, w: 4, h: 3 },
    };
    await saveDashboardConfig({
      version: 5,
      widgets: [widget],
      appearance: {
        theme: 'system',
        backgroundColor: '#18181b',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    });

    const firstSession = renderHook(() => useDashboardConfig());
    await waitFor(() =>
      expect(firstSession.result.current.isLoading).toBe(false),
    );

    const updatedLayout = { x: 5, y: 7, w: 6, h: 4 };
    act(() => {
      firstSession.result.current.updateWidgetLayouts([
        { ...widget, layout: updatedLayout },
      ]);
    });

    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.widgets[0]?.layout).toEqual(updatedLayout);
    });
    firstSession.unmount();

    const restoredSession = renderHook(() => useDashboardConfig());
    await waitFor(() =>
      expect(restoredSession.result.current.config?.widgets[0]?.layout).toEqual(
        updatedLayout,
      ),
    );
  });

  it('publishes a validated URL only after its transaction succeeds', async () => {
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    await act(async () => {
      await dashboard.result.current.setUrlWallpaper(
        'https://example.com/wallpaper.jpg',
      );
    });

    expect(dashboard.result.current.config?.appearance.wallpaper).toEqual({
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
    });
    expect(dashboard.result.current.wallpaperError).toBeNull();
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(dashboard.result.current.config);
  });

  it('stores a local wallpaper separately and publishes its asset ID', async () => {
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    await act(async () => {
      await dashboard.result.current.setLocalWallpaper(createPngFile());
    });

    const wallpaper = dashboard.result.current.config?.appearance.wallpaper;
    expect(wallpaper).toMatchObject({ type: 'local' });

    if (wallpaper?.type !== 'local') {
      throw new Error('Expected a local wallpaper');
    }

    await expect(loadWallpaperAsset(wallpaper.assetId)).resolves.toMatchObject({
      assetId: wallpaper.assetId,
      encoding: 'base64',
      mimeType: 'image/png',
    });
  });

  it('keeps the previous wallpaper when a storage transaction rejects', async () => {
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());
    vi.spyOn(fakeBrowser.storage.local, 'set').mockRejectedValueOnce(
      new Error('save failed'),
    );

    await act(async () => {
      await expect(
        dashboard.result.current.setUrlWallpaper(
          'https://example.com/wallpaper.jpg',
        ),
      ).rejects.toThrow('save failed');
    });

    expect(dashboard.result.current.config?.appearance.wallpaper).toEqual({
      type: 'none',
    });
    expect(dashboard.result.current.wallpaperError).toContain('save failed');
  });

  it('flushes pending widget state before a wallpaper transaction', async () => {
    const widget: MarkdownWidgetConfig = {
      id: 'work-markdown',
      type: 'markdown',
      title: 'Работа',
      content: 'До изменения',
      layout: { x: 0, y: 0, w: 4, h: 3 },
    };
    await saveDashboardConfig({
      version: 5,
      widgets: [widget],
      appearance: {
        theme: 'system',
        backgroundColor: '#18181b',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    });
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    act(() => {
      dashboard.result.current.updateWidget({
        ...widget,
        content: 'После изменения',
      });
    });
    await act(async () => {
      await dashboard.result.current.setUrlWallpaper(
        'https://example.com/wallpaper.jpg',
      );
    });

    await new Promise((resolve) => window.setTimeout(resolve, 350));
    const stored = await storage.getItem<DashboardConfig>(
      DASHBOARD_STORAGE_KEY,
    );
    expect(stored?.appearance.wallpaper).toEqual({
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
    });
    expect(stored?.widgets[0]).toMatchObject({ content: 'После изменения' });
  });

  it('reports progress and aborts validation without a user-facing error', async () => {
    imageShouldLoad = false;
    const controller = new AbortController();
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    let operation: Promise<void> | undefined;
    act(() => {
      operation = dashboard.result.current.setUrlWallpaper(
        'https://example.com/slow.png',
        controller.signal,
      );
    });
    await waitFor(() =>
      expect(dashboard.result.current.isWallpaperUpdating).toBe(true),
    );

    controller.abort();

    await act(async () => {
      await expect(operation).rejects.toBeInstanceOf(
        WallpaperValidationAbortedError,
      );
    });
    expect(dashboard.result.current.isWallpaperUpdating).toBe(false);
    expect(dashboard.result.current.wallpaperError).toBeNull();
  });

  it('cleans orphaned assets during initial load', async () => {
    await saveWallpaperAsset(createWallpaperAsset(ORPHAN_ASSET_ID));

    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.isLoading).toBe(false));

    await expect(loadWallpaperAsset(ORPHAN_ASSET_ID)).resolves.toBeNull();
  });

  it('previews appearance without saving and persists it on flush', async () => {
    const initial = createDefaultDashboardConfig();
    await saveDashboardConfig(initial);
    const setSpy = vi.spyOn(fakeBrowser.storage.local, 'set');
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    act(() => {
      dashboard.result.current.previewAppearance({
        liquidGlass: {
          ...initial.appearance.liquidGlass,
          transparency: 72,
        },
      });
    });

    expect(
      dashboard.result.current.config?.appearance.liquidGlass.transparency,
    ).toBe(72);
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(initial);

    act(() => dashboard.result.current.flushAppearancePreview());
    await waitFor(async () =>
      expect(
        (await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY))
          ?.appearance.liquidGlass.transparency,
      ).toBe(72),
    );

    const writesAfterFlush = setSpy.mock.calls.length;
    act(() => dashboard.result.current.flushAppearancePreview());
    await Promise.resolve();
    expect(setSpy).toHaveBeenCalledTimes(writesAfterFlush);
  });

  it('flushes an appearance preview before the page is hidden', async () => {
    const initial = createDefaultDashboardConfig();
    await saveDashboardConfig(initial);
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    act(() => {
      dashboard.result.current.previewAppearance({
        liquidGlass: {
          ...initial.appearance.liquidGlass,
          blur: 27,
        },
      });
      window.dispatchEvent(new Event('pagehide'));
    });

    await waitFor(async () =>
      expect(
        (await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY))
          ?.appearance.liquidGlass.blur,
      ).toBe(27),
    );
  });

  it('flushes an appearance preview on unmount', async () => {
    const initial = createDefaultDashboardConfig();
    await saveDashboardConfig(initial);
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    act(() => {
      dashboard.result.current.previewAppearance({
        liquidGlass: {
          ...initial.appearance.liquidGlass,
          shadow: 84,
        },
      });
    });
    dashboard.unmount();

    await waitFor(async () =>
      expect(
        (await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY))
          ?.appearance.liquidGlass.shadow,
      ).toBe(84),
    );
  });

  it('flushes a pending widget change before the page is hidden', async () => {
    const widget: MarkdownWidgetConfig = {
      id: 'work-markdown',
      type: 'markdown',
      title: 'Работа',
      content: '[Mail](mail.example.com)',
      layout: { x: 0, y: 0, w: 4, h: 3 },
    };
    await saveDashboardConfig({
      version: 5,
      widgets: [widget],
      appearance: {
        theme: 'system',
        backgroundColor: '#18181b',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    });
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    act(() => {
      dashboard.result.current.updateWidget({
        ...widget,
        content: '[Docs](docs.example.com)',
      });
    });
    expect((await getStoredMarkdownWidget())?.content).toBe(widget.content);

    act(() => window.dispatchEvent(new Event('pagehide')));

    await waitFor(async () => {
      expect((await getStoredMarkdownWidget())?.content).toBe(
        '[Docs](docs.example.com)',
      );
    });
  });
});
