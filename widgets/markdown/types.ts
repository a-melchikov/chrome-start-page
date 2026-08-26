import type { BaseWidgetConfig } from '../types';

export interface MarkdownWidgetConfig extends BaseWidgetConfig<'markdown'> {
  content: string;
}
