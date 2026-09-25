import type { ImageWidgetConfig } from '../widgets/image/types';
import type { MarkdownWidgetConfig } from '../widgets/markdown/types';
import type { PomodoroWidgetConfig } from '../widgets/pomodoro/types';
import type { SearchWidgetConfig } from '../widgets/search/types';

import type { ThemeId } from '../themes/types';

export const DASHBOARD_CONFIG_VERSION = 5 as const;

export type Theme = ThemeId;

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

export function isImageAssetId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export interface LiquidGlassConfig {
  enabled: boolean;
  transparency: number;
  blur: number;
  shadow: number;
}

export interface AppearanceConfig {
  theme: Theme;
  backgroundColor: string;
  wallpaper: WallpaperConfig;
  liquidGlass: LiquidGlassConfig;
}

export interface WidgetConfigMap {
  markdown: MarkdownWidgetConfig;
  search: SearchWidgetConfig;
  pomodoro: PomodoroWidgetConfig;
  image: ImageWidgetConfig;
}

export type WidgetType = keyof WidgetConfigMap;
export type WidgetConfig = WidgetConfigMap[WidgetType];

export interface DashboardConfig {
  version: typeof DASHBOARD_CONFIG_VERSION;
  widgets: WidgetConfig[];
  appearance: AppearanceConfig;
}
