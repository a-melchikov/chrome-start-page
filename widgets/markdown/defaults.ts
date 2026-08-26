import type { MarkdownWidgetConfig } from './types';

const DEFAULT_MARKDOWN_WIDGET_WIDTH = 4;
const DEFAULT_MARKDOWN_WIDGET_HEIGHT = 3;

export function createDefaultMarkdownWidget(
  id: string,
  index: number,
): MarkdownWidgetConfig {
  return {
    id,
    type: 'markdown',
    title: '',
    content: '',
    layout: {
      x: 0,
      y: index * DEFAULT_MARKDOWN_WIDGET_HEIGHT,
      w: DEFAULT_MARKDOWN_WIDGET_WIDTH,
      h: DEFAULT_MARKDOWN_WIDGET_HEIGHT,
    },
  };
}
