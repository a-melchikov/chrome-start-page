import type { AnalogClockWidgetConfig } from '../widgets/analog-clock/types';
import type { ClockWidgetConfig } from '../widgets/clock/types';
import type { ImageWidgetConfig } from '../widgets/image/types';
import type { MarkdownWidgetConfig } from '../widgets/markdown/types';
import type { PomodoroWidgetConfig } from '../widgets/pomodoro/types';
import type { SearchWidgetConfig } from '../widgets/search/types';
import type { WeatherWidgetConfig } from '../widgets/weather/types';

import type { CustomTheme, ThemeRef } from '../themes/types';

export const DASHBOARD_CONFIG_VERSION = 9 as const;

export type Theme = ThemeRef;

export type BackgroundColorConfig =
  { type: 'theme' } | { type: 'custom'; color: string };

export type WallpaperConfig =
  | { type: 'none' }
  | { type: 'url'; url: string; enabled?: boolean }
  | { type: 'local'; assetId: string; enabled?: boolean };

export function isWallpaperEnabled(wallpaper: WallpaperConfig): boolean {
  return wallpaper.type !== 'none' && wallpaper.enabled !== false;
}

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
  backgroundColor: BackgroundColorConfig;
  wallpaper: WallpaperConfig;
  liquidGlass: LiquidGlassConfig;
  widgetBorderRadius?: number;
}

export interface WidgetConfigMap {
  markdown: MarkdownWidgetConfig;
  search: SearchWidgetConfig;
  pomodoro: PomodoroWidgetConfig;
  image: ImageWidgetConfig;
  clock: ClockWidgetConfig;
  weather: WeatherWidgetConfig;
  'analog-clock': AnalogClockWidgetConfig;
}

export type WidgetType = keyof WidgetConfigMap;
export type WidgetConfig = WidgetConfigMap[WidgetType];

export interface WorkspaceConfig {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  appearance: AppearanceConfig;
}

export type ToolbarMode = 'top-right' | 'left-fixed' | 'left-collapsible';

export interface ToolbarConfig {
  mode: ToolbarMode;
}

export interface DashboardConfig {
  toolbar: ToolbarConfig;
  version: typeof DASHBOARD_CONFIG_VERSION;
  activeWorkspaceId: string;
  workspaces: WorkspaceConfig[];
  customThemes: CustomTheme[];
}
