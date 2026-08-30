import type { MarkdownWidgetConfig } from '../widgets/markdown/types';
import type { SearchWidgetConfig } from '../widgets/search/types';

export const DASHBOARD_CONFIG_VERSION = 3 as const;

export type Theme = 'system' | 'light' | 'dark';

export type WallpaperConfig =
  | { type: 'none' }
  | { type: 'url'; url: string }
  | { type: 'local'; assetId: string };

export function isWallpaperAssetId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export interface AppearanceConfig {
  theme: Theme;
  backgroundColor: string;
  wallpaper: WallpaperConfig;
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
