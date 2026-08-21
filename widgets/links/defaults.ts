import type { LinksWidgetConfig } from './types';

const DEFAULT_LINKS_WIDGET_WIDTH = 4;
const DEFAULT_LINKS_WIDGET_HEIGHT = 3;

export function createDefaultLinksWidget(
  id: string,
  index: number,
): LinksWidgetConfig {
  return {
    id,
    type: 'links',
    title: '',
    content: '',
    layout: {
      x: 0,
      y: index * DEFAULT_LINKS_WIDGET_HEIGHT,
      w: DEFAULT_LINKS_WIDGET_WIDTH,
      h: DEFAULT_LINKS_WIDGET_HEIGHT,
    },
  };
}
