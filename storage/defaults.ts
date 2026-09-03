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
  theme: 'system',
  backgroundColor: '#18181b',
  wallpaper: { type: 'none' },
  liquidGlass: DEFAULT_LIQUID_GLASS,
};

export function createDefaultDashboardConfig(): DashboardConfig {
  return {
    version: DASHBOARD_CONFIG_VERSION,
    widgets: [],
    appearance: {
      ...DEFAULT_APPEARANCE,
      wallpaper: { ...DEFAULT_APPEARANCE.wallpaper },
      liquidGlass: { ...DEFAULT_LIQUID_GLASS },
    },
  };
}
