import type { LinksWidgetConfig } from '../widgets/links/types';
import type { SearchWidgetConfig } from '../widgets/search/types';

export const DASHBOARD_CONFIG_VERSION = 1 as const;

export type Theme = 'system' | 'light' | 'dark';

export interface AppearanceConfig {
  theme: Theme;
  backgroundColor: string;
}

export interface WidgetConfigMap {
  links: LinksWidgetConfig;
  search: SearchWidgetConfig;
}

export type WidgetType = keyof WidgetConfigMap;
export type WidgetConfig = WidgetConfigMap[WidgetType];

export interface DashboardConfig {
  version: typeof DASHBOARD_CONFIG_VERSION;
  widgets: WidgetConfig[];
  appearance: AppearanceConfig;
}
