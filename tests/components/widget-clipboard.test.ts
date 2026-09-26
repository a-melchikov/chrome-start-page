import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  parseWidgetClipboard,
  createWidgetClipboardPayload,
  prepareWidgetCopies,
  serializeWidgetClipboard,
  WIDGET_CLIPBOARD_FORMAT,
  WIDGET_CLIPBOARD_VERSION,
} from '../../components/dashboard/widget-clipboard';
import type { WidgetConfig } from '../../storage/schema';
import { saveImageAsset } from '../../storage/image-assets';
import { createWidgetConfig } from '../../widgets/registry';
import {
  decodeWallpaperAsset,
  encodeWallpaperAsset,
} from '../../storage/wallpaper-codec';

const widgets: WidgetConfig[] = [
  {
    id: 'note',
    type: 'markdown',
    title: 'Заметка',
    content: '# Текст',
    layout: { x: 0, y: 0, w: 4, h: 3 },
  },
  {
    id: 'timer',
    type: 'pomodoro',
    title: 'Таймер',
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    soundEnabled: true,
    layout: { x: 4, y: 0, w: 3, h: 5 },
  },
];

describe('widget clipboard', () => {
  beforeEach(() => fakeBrowser.reset());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('round trips configurations and clones with new IDs', async () => {
    const source = serializeWidgetClipboard({
      format: WIDGET_CLIPBOARD_FORMAT,
      version: WIDGET_CLIPBOARD_VERSION,
      widgets,
      localImages: [],
    });
    const parsed = parseWidgetClipboard(source);
    const prepared = await prepareWidgetCopies(parsed);

    expect(prepared.widgets).toHaveLength(2);
    expect(prepared.widgets.map((widget) => widget.id)).not.toEqual([
      'note',
      'timer',
    ]);
    expect(prepared.widgets[0]).toMatchObject({
      type: 'markdown',
      content: '# Текст',
    });
    expect(prepared.widgets[1]).toMatchObject({
      type: 'pomodoro',
      workDuration: 25,
    });
    expect(prepared.localImages).toEqual([]);
  });

  it('copies every registered widget type', async () => {
    const types = [
      'markdown',
      'search',
      'pomodoro',
      'image',
      'clock',
      'weather',
    ] as const;
    const originals = types.map((type, index) => {
      const widget = createWidgetConfig(type, index);
      if (!widget) throw new Error(`Missing ${type} widget factory`);
      return widget;
    });
    const payload = await createWidgetClipboardPayload(originals);
    const prepared = await prepareWidgetCopies(
      parseWidgetClipboard(serializeWidgetClipboard(payload)),
    );

    expect(prepared.widgets.map((widget) => widget.type)).toEqual(types);
    expect(prepared.widgets.map((widget) => widget.id)).not.toEqual(
      originals.map((widget) => widget.id),
    );
  });

  it('rejects unsupported, malformed, duplicate, and out-of-bounds payloads', () => {
    expect(() => parseWidgetClipboard('ordinary text')).toThrow();
    expect(() =>
      parseWidgetClipboard(
        JSON.stringify({
          format: WIDGET_CLIPBOARD_FORMAT,
          version: 2,
          widgets,
          localImages: [],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseWidgetClipboard(
        JSON.stringify({
          format: WIDGET_CLIPBOARD_FORMAT,
          version: WIDGET_CLIPBOARD_VERSION,
          widgets: [widgets[0], widgets[0]],
          localImages: [],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseWidgetClipboard(
        JSON.stringify({
          format: WIDGET_CLIPBOARD_FORMAT,
          version: WIDGET_CLIPBOARD_VERSION,
          widgets: [{ ...widgets[0], layout: { x: 20, y: 0, w: 4, h: 3 } }],
          localImages: [],
        }),
      ),
    ).toThrow();
  });

  it('carries local image bytes and assigns new widget and asset IDs', async () => {
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

    const oldId = '8dc04e26-6465-4e84-bc05-633c0e28415b';
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    await saveImageAsset(await encodeWallpaperAsset(oldId, 'image/png', bytes));
    const image: WidgetConfig = {
      id: 'image',
      type: 'image',
      source: { type: 'local', assetId: oldId },
      objectPosition: 'center',
      layout: { x: 0, y: 0, w: 4, h: 4 },
    };
    const payload = await createWidgetClipboardPayload([image]);
    const prepared = await prepareWidgetCopies(
      parseWidgetClipboard(serializeWidgetClipboard(payload)),
    );
    const cloned = prepared.widgets[0];
    expect(cloned?.id).not.toBe('image');
    if (cloned?.type !== 'image' || cloned.source.type !== 'local')
      throw new Error('Expected a local image');
    expect(cloned.source.assetId).not.toBe(oldId);
    expect(prepared.localImages[0]?.assetId).toBe(cloned.source.assetId);
    expect(await decodeWallpaperAsset(prepared.localImages[0]!)).toEqual(bytes);
  });
});
