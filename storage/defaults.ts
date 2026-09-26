import {
  DASHBOARD_CONFIG_VERSION,
  type AppearanceConfig,
  type DashboardConfig,
  type LiquidGlassConfig,
} from './schema';

export const DEFAULT_LIQUID_GLASS: Readonly<LiquidGlassConfig> = {
  enabled: true,
  transparency: 40,
  blur: 18,
  shadow: 50,
};

export const DEFAULT_APPEARANCE: Readonly<AppearanceConfig> = {
  theme: { type: 'builtin', id: 'system' },
  backgroundColor: { type: 'theme' },
  wallpaper: { type: 'none' },
  liquidGlass: DEFAULT_LIQUID_GLASS,
};

export function createDefaultDashboardConfig(): DashboardConfig {
  return {
    version: DASHBOARD_CONFIG_VERSION,
    widgets: [],
    appearance: {
      ...DEFAULT_APPEARANCE,
      theme: { ...DEFAULT_APPEARANCE.theme },
      backgroundColor: { ...DEFAULT_APPEARANCE.backgroundColor },
      wallpaper: { ...DEFAULT_APPEARANCE.wallpaper },
      liquidGlass: { ...DEFAULT_LIQUID_GLASS },
    },
    customThemes: [],
  };
}
