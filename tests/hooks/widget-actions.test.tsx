import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import { loadImageAsset, saveImageAsset } from '../../storage/image-assets';
import { saveDashboardConfig } from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { encodeWallpaperAsset } from '../../storage/wallpaper-codec';
import {
  WIDGET_CLIPBOARD_FORMAT,
  WIDGET_CLIPBOARD_VERSION,
} from '../../components/dashboard/widget-clipboard';
import type { WidgetConfig } from '../../storage/schema';
import type { MarkdownWidgetConfig } from '../../widgets/markdown/types';
import { createDefaultPomodoroWidget } from '../../widgets/pomodoro/defaults';
import { getPomodoroStorageKey } from '../../widgets/pomodoro/storage';

const IMAGE_ID = '8dc04e26-6465-4e84-bc05-633c0e28415b';

function markdown(id: string): MarkdownWidgetConfig {
  return {
    id,
    type: 'markdown',
    title: id,
    content: id,
    layout: { x: 0, y: 0, w: 3, h: 3 },
  };
}

describe('widget actions', () => {
  beforeEach(() => fakeBrowser.reset());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('branches history and preserves edited content through layout undo', async () => {
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

    act(() => dashboard.result.current.addWidget(markdown('first')));
    act(() =>
      dashboard.result.current.updateWidgetLayouts([
        { ...markdown('first'), layout: { x: 4, y: 0, w: 3, h: 3 } },
      ]),
    );
    act(() =>
      dashboard.result.current.updateWidget({
        ...markdown('first'),
        content: 'edited',
        layout: { x: 4, y: 0, w: 3, h: 3 },
      }),
    );
    act(() => dashboard.result.current.undo());
    expect(dashboard.result.current.config?.widgets[0]).toMatchObject({
      content: 'edited',
      layout: { x: 0 },
    });
    act(() => dashboard.result.current.redo());
    expect(dashboard.result.current.config?.widgets[0]?.layout.x).toBe(4);
    act(() => dashboard.result.current.undo());
    act(() => dashboard.result.current.addWidget(markdown('second')));
    expect(dashboard.result.current.canRedo).toBe(false);
  });

  it('copies and pastes with new IDs, then undoes and redoes the paste', async () => {
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());
    act(() => dashboard.result.current.addWidget(markdown('first')));

    const source = await dashboard.result.current.copyWidgets(['first']);
    let inserted: string[] = [];
    await act(async () => {
      inserted = await dashboard.result.current.pasteWidgets(source);
    });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).not.toBe('first');
    expect(dashboard.result.current.config?.widgets).toHaveLength(2);
    act(() => dashboard.result.current.undo());
    expect(dashboard.result.current.config?.widgets).toHaveLength(1);
    act(() => dashboard.result.current.redo());
    expect(
      dashboard.result.current.config?.widgets.map((widget) => widget.id),
    ).toContain(inserted[0]);
  });

  it('groups repeated keyboard moves into one history step', async () => {
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());
    act(() => dashboard.result.current.addWidget(markdown('first')));

    act(() => dashboard.result.current.moveWidgets(['first'], 1, 0));
    act(() => dashboard.result.current.moveWidgets(['first'], 1, 0));
    act(() => dashboard.result.current.finishNudge());
    expect(dashboard.result.current.config?.widgets[0]?.layout.x).toBe(2);

    act(() => dashboard.result.current.undo());
    expect(dashboard.result.current.config?.widgets[0]?.layout.x).toBe(0);
    act(() => dashboard.result.current.redo());
    expect(dashboard.result.current.config?.widgets[0]?.layout.x).toBe(2);
  });

  it('restores a deleted Pomodoro ID and keeps copies on fresh timer state', async () => {
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());
    const timer = createDefaultPomodoroWidget('timer-original', 0);
    act(() => dashboard.result.current.addWidget(timer));
    await storage.setItem(getPomodoroStorageKey(timer.id), {
      status: 'paused',
      phase: 'work',
      targetEndTime: null,
      remainingSeconds: 321,
      cycleCount: 1,
      completedToday: 2,
      lastResetDate: '2026-09-26',
    });

    let copies: string[] = [];
    await act(async () => {
      copies = await dashboard.result.current.duplicateWidgets([timer.id]);
    });
    expect(copies).toHaveLength(1);
    expect(await storage.getItem(getPomodoroStorageKey(copies[0]!))).toBeNull();

    act(() => dashboard.result.current.removeWidgets([timer.id]));
    act(() => dashboard.result.current.undo());
    expect(
      dashboard.result.current.config?.widgets.some(
        (item) => item.id === timer.id,
      ),
    ).toBe(true);
    expect(
      await storage.getItem(getPomodoroStorageKey(timer.id)),
    ).toMatchObject({
      status: 'paused',
      remainingSeconds: 321,
    });
  });

  it('retains local image bytes while a deletion is undoable', async () => {
    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());
    await saveImageAsset({
      version: 1,
      assetId: IMAGE_ID,
      mimeType: 'image/png',
      encoding: 'base64',
      originalByteLength: 1,
      storedByteLength: 1,
      data: 'AQ==',
    });
    const image: WidgetConfig = {
      id: 'image',
      type: 'image',
      source: { type: 'local', assetId: IMAGE_ID },
      objectPosition: 'center',
      layout: { x: 0, y: 0, w: 4, h: 4 },
    };
    act(() => dashboard.result.current.addWidget(image));
    await waitFor(async () =>
      expect(await loadImageAsset(IMAGE_ID)).not.toBeNull(),
    );
    act(() => dashboard.result.current.removeWidgets(['image']));
    await waitFor(async () =>
      expect(await loadImageAsset(IMAGE_ID)).not.toBeNull(),
    );
    act(() => dashboard.result.current.undo());
    expect(dashboard.result.current.config?.widgets[0]?.id).toBe('image');
  });

  it('applies another tab’s saved state and resets local history', async () => {
    await saveDashboardConfig(createDefaultDashboardConfig());
    const first = renderHook(() => useDashboardConfig());
    const second = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(first.result.current.config).not.toBeNull());
    await waitFor(() => expect(second.result.current.config).not.toBeNull());

    act(() => first.result.current.addWidget(markdown('shared')));
    await waitFor(() =>
      expect(
        second.result.current.config?.widgets.map((widget) => widget.id),
      ).toEqual(['shared']),
    );
    expect(second.result.current.canUndo).toBe(false);
  });

  it('holds a local draft when another tab saves and resolves the conflict explicitly', async () => {
    await saveDashboardConfig({
      ...createDefaultDashboardConfig(),
      widgets: [markdown('shared')],
    });
    const first = renderHook(() => useDashboardConfig());
    const second = renderHook(() => useDashboardConfig());
    await waitFor(() =>
      expect(first.result.current.config?.widgets).toHaveLength(1),
    );
    await waitFor(() =>
      expect(second.result.current.config?.widgets).toHaveLength(1),
    );

    act(() =>
      second.result.current.updateWidget({
        ...markdown('shared'),
        content: 'local draft',
      }),
    );
    act(() => first.result.current.addWidget(markdown('external')));
    await waitFor(() => expect(second.result.current.conflict).toBe(true));
    expect(second.result.current.config?.widgets[0]).toMatchObject({
      content: 'local draft',
    });

    await act(async () => second.result.current.resolveConflict('external'));
    expect(second.result.current.conflict).toBe(false);
    expect(
      second.result.current.config?.widgets.map((widget) => widget.id),
    ).toEqual(['shared', 'external']);
  });

  it('rolls back newly copied local images when the config save fails', async () => {
    class FakeImage {
      naturalWidth = 2;
      naturalHeight = 2;
      decoding = 'async';
      referrerPolicy = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
      async decode() {}
    }
    vi.stubGlobal('Image', FakeImage);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:image'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });

    const dashboard = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());
    const assetId = '8dc04e26-6465-4e84-bc05-633c0e28415b';
    const asset = await encodeWallpaperAsset(
      assetId,
      'image/png',
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    const source = JSON.stringify({
      format: WIDGET_CLIPBOARD_FORMAT,
      version: WIDGET_CLIPBOARD_VERSION,
      widgets: [
        {
          id: 'source-image',
          type: 'image',
          source: { type: 'local', assetId },
          objectPosition: 'center',
          layout: { x: 0, y: 0, w: 4, h: 4 },
        },
      ],
      localImages: [asset],
    });
    const originalSet = fakeBrowser.storage.local.set.bind(
      fakeBrowser.storage.local,
    );
    vi.spyOn(fakeBrowser.storage.local, 'set').mockImplementation(
      async (items) => {
        if ('dashboard-config' in items) throw new Error('save failed');
        return originalSet(items);
      },
    );

    await act(async () => {
      await expect(
        dashboard.result.current.pasteWidgets(source),
      ).rejects.toThrow('save failed');
    });
    expect(dashboard.result.current.config?.widgets).toEqual([]);
    expect(dashboard.result.current.error).toContain('save failed');
    const snapshot = await storage.snapshot('local');
    expect(
      Object.keys(snapshot).filter((key) =>
        key.startsWith('dashboard-image-asset:'),
      ),
    ).toEqual([]);
  });
});
