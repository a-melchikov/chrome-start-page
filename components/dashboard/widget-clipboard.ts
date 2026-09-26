import { loadImageAsset } from '../../storage/image-assets';
import { DEFAULT_APPEARANCE } from '../../storage/defaults';
import { migrateDashboardConfig } from '../../storage/migrations';
import {
  DASHBOARD_CONFIG_VERSION,
  type WidgetConfig,
} from '../../storage/schema';
import {
  decodeWallpaperAsset,
  encodeWallpaperAsset,
  parseWallpaperAsset,
  type LocalWallpaperAssetV1,
} from '../../storage/wallpaper-codec';
import {
  validateImageBytes,
  type ImageWidgetMimeType,
} from '../../widgets/image/image-validation';
import { getWidgetDefinition } from '../../widgets/registry';
import { normalizeWidgetLayout } from './dashboard-layout';

export const WIDGET_CLIPBOARD_FORMAT = 'chrome-start-page-widgets';
export const WIDGET_CLIPBOARD_VERSION = 1;
export const MAX_WIDGET_CLIPBOARD_CHARACTERS = 128 * 1024 * 1024;

export interface WidgetClipboardPayload {
  format: typeof WIDGET_CLIPBOARD_FORMAT;
  version: typeof WIDGET_CLIPBOARD_VERSION;
  widgets: WidgetConfig[];
  localImages: LocalWallpaperAssetV1[];
}

export interface PreparedWidgetCopies {
  widgets: WidgetConfig[];
  localImages: LocalWallpaperAssetV1[];
}

function invalidClipboard(): Error {
  return new Error('Буфер обмена не содержит корректные виджеты');
}

export async function createWidgetClipboardPayload(
  widgets: readonly WidgetConfig[],
): Promise<WidgetClipboardPayload> {
  const localImages: LocalWallpaperAssetV1[] = [];
  const seen = new Set<string>();

  for (const widget of widgets) {
    if (widget.type !== 'image' || widget.source.type !== 'local') continue;
    if (seen.has(widget.source.assetId)) continue;
    seen.add(widget.source.assetId);

    const asset = await loadImageAsset(widget.source.assetId);
    if (!asset) {
      throw new Error('Локальное изображение не найдено');
    }
    await decodeWallpaperAsset(asset);
    localImages.push(asset);
  }

  return {
    format: WIDGET_CLIPBOARD_FORMAT,
    version: WIDGET_CLIPBOARD_VERSION,
    widgets: [...widgets],
    localImages,
  };
}

export function serializeWidgetClipboard(
  payload: WidgetClipboardPayload,
): string {
  const source = JSON.stringify(payload);
  if (source.length > MAX_WIDGET_CLIPBOARD_CHARACTERS) {
    throw new Error('Выбранные виджеты слишком велики для буфера обмена');
  }
  return source;
}

export function parseWidgetClipboard(source: string): WidgetClipboardPayload {
  if (source.length > MAX_WIDGET_CLIPBOARD_CHARACTERS) {
    throw new Error('Данные в буфере обмена слишком велики');
  }

  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw invalidClipboard();
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidClipboard();
  }
  const payload = value as Record<string, unknown>;
  if (
    payload.format !== WIDGET_CLIPBOARD_FORMAT ||
    payload.version !== WIDGET_CLIPBOARD_VERSION ||
    !Array.isArray(payload.widgets) ||
    payload.widgets.length === 0 ||
    !Array.isArray(payload.localImages)
  ) {
    throw invalidClipboard();
  }

  let widgets: WidgetConfig[];
  let localImages: LocalWallpaperAssetV1[];
  try {
    widgets = migrateDashboardConfig({
      version: DASHBOARD_CONFIG_VERSION,
      appearance: DEFAULT_APPEARANCE,
      widgets: payload.widgets,
    }).widgets;
    localImages = payload.localImages.map(parseWallpaperAsset);
  } catch {
    throw invalidClipboard();
  }

  const widgetIds = new Set(widgets.map((widget) => widget.id));
  const imageIds = new Set(localImages.map((asset) => asset.assetId));
  const referencedImageIds = new Set(
    widgets.flatMap((widget) =>
      widget.type === 'image' && widget.source.type === 'local'
        ? [widget.source.assetId]
        : [],
    ),
  );
  if (
    widgetIds.size !== widgets.length ||
    imageIds.size !== localImages.length ||
    imageIds.size !== referencedImageIds.size ||
    [...referencedImageIds].some((id) => !imageIds.has(id))
  ) {
    throw invalidClipboard();
  }

  for (const widget of widgets) {
    const constraints = getWidgetDefinition(widget.type)?.presentation.layout;
    if (!constraints) throw invalidClipboard();
    const normalized = normalizeWidgetLayout(widget.layout, constraints);
    if (
      normalized.x !== widget.layout.x ||
      normalized.y !== widget.layout.y ||
      normalized.w !== widget.layout.w ||
      normalized.h !== widget.layout.h
    ) {
      throw invalidClipboard();
    }
  }

  return {
    format: WIDGET_CLIPBOARD_FORMAT,
    version: WIDGET_CLIPBOARD_VERSION,
    widgets,
    localImages,
  };
}

export async function prepareWidgetCopies(
  payload: WidgetClipboardPayload,
): Promise<PreparedWidgetCopies> {
  const assetIds = new Map<string, string>();
  const localImages: LocalWallpaperAssetV1[] = [];

  for (const asset of payload.localImages) {
    const bytes = await decodeWallpaperAsset(asset);
    await validateImageBytes(bytes, asset.mimeType as ImageWidgetMimeType);
    const newId = crypto.randomUUID();
    assetIds.set(asset.assetId, newId);
    localImages.push(await encodeWallpaperAsset(newId, asset.mimeType, bytes));
  }

  const widgets = payload.widgets.map((widget): WidgetConfig => {
    const id = crypto.randomUUID();
    if (widget.type === 'image' && widget.source.type === 'local') {
      const assetId = assetIds.get(widget.source.assetId);
      if (!assetId) throw invalidClipboard();
      return { ...widget, id, source: { type: 'local', assetId } };
    }
    return { ...widget, id };
  });

  return { widgets, localImages };
}
