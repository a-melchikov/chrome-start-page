import type { BaseWidgetConfig } from '../types';

export type SearchEngine = 'google' | 'yandex' | 'bing' | 'duckduckgo';

export interface SearchWidgetConfig extends BaseWidgetConfig<'search'> {
  engine: SearchEngine;
}
