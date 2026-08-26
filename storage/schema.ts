import type { MarkdownWidgetConfig } from '../widgets/markdown/types';
import type { SearchWidgetConfig } from '../widgets/search/types';

export const DASHBOARD_CONFIG_VERSION = 2 as const;

export type Theme = 'system' | 'light' | 'dark';

export interface AppearanceConfig {
  theme: Theme;
  backgroundColor: string;
}

export interface WidgetConfigMap {
  markdown: MarkdownWidgetConfig;
  search: SearchWidgetConfig;
}

export type WidgetType = keyof WidgetConfigMap;
export type WidgetConfig = WidgetConfigMap[WidgetType];

export interface DashboardConfig {
  version: typeof DASHBOARD_CONFIG_VERSION;
  widgets: WidgetConfig[];
  appearance: AppearanceConfig;
}
