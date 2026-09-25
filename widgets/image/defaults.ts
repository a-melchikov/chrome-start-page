import type { ImageWidgetConfig } from './types';

export const DEFAULT_IMAGE_WIDGET_LAYOUT = {
  w: 4,
  h: 4,
  minW: 2,
  minH: 2,
} as const;

export function createDefaultImageWidget(
  id: string,
  index: number,
): ImageWidgetConfig {
  return {
    id,
    type: 'image',
    source: { type: 'none' },
    objectPosition: 'center',
    fitMode: 'cover',
    zoom: 1,
    layout: {
      x: 0,
      y: index * DEFAULT_IMAGE_WIDGET_LAYOUT.h,
      w: DEFAULT_IMAGE_WIDGET_LAYOUT.w,
      h: DEFAULT_IMAGE_WIDGET_LAYOUT.h,
    },
  };
}
