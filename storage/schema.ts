import type { AnimationMode } from '../components/ui/animation-preferences';
export type { AnimationMode } from '../components/ui/animation-preferences';
import type { ShortcutOverrides } from '../keyboard/shortcuts';
import type { SettingsPanelPreferences } from './settings-panel';
import type { AnalogClockWidgetConfig } from '../widgets/analog-clock/types';
import type { ClockWidgetConfig } from '../widgets/clock/types';
import type { EventsWidgetConfig } from '../widgets/events/types';
import type { ImageWidgetConfig } from '../widgets/image/types';
import type { MarkdownWidgetConfig } from '../widgets/markdown/types';
import type { PomodoroWidgetConfig } from '../widgets/pomodoro/types';
import type { SearchWidgetConfig } from '../widgets/search/types';
import type { WeatherWidgetConfig } from '../widgets/weather/types';

import type { CustomTheme, ThemeRef } from '../themes/types';

export const DASHBOARD_CONFIG_VERSION = 10 as const;

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
  pointerLight?: boolean;
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
  gridGap?: number;
  gridPadding?: number;
}

export interface WidgetConfigMap {
  events: EventsWidgetConfig;
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

export interface TrashedWorkspace {
  workspace: WorkspaceConfig;
  deletedAt: number;
  originalIndex: number;
}

export type ToolbarMode = 'top-right' | 'left-fixed' | 'left-collapsible';

export interface ToolbarConfig {
  mode: ToolbarMode;
}

export interface InterfacePreferences {
  animationMode?: AnimationMode;
  shortcuts?: ShortcutOverrides;
  settingsPanel?: SettingsPanelPreferences;
}

export interface DashboardConfig extends InterfacePreferences {
  toolbar: ToolbarConfig;
  version: typeof DASHBOARD_CONFIG_VERSION;
  activeWorkspaceId: string;
  workspaces: WorkspaceConfig[];
  trashedWorkspaces?: TrashedWorkspace[];
  customThemes: CustomTheme[];
}
