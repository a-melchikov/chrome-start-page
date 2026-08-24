import type { SearchWidgetConfig } from './types';

const DEFAULT_SEARCH_WIDGET_WIDTH = 6;
const DEFAULT_SEARCH_WIDGET_HEIGHT = 1;
const DEFAULT_WIDGET_VERTICAL_SLOT = 3;

export function createDefaultSearchWidget(
  id: string,
  index: number,
): SearchWidgetConfig {
  return {
    id,
    type: 'search',
    title: '',
    engine: 'google',
    layout: {
      x: 0,
      y: index * DEFAULT_WIDGET_VERTICAL_SLOT,
      w: DEFAULT_SEARCH_WIDGET_WIDTH,
      h: DEFAULT_SEARCH_WIDGET_HEIGHT,
    },
  };
}
