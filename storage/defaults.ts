import {
  DASHBOARD_CONFIG_VERSION,
  type AppearanceConfig,
  type DashboardConfig,
} from './schema';

export const DEFAULT_APPEARANCE: Readonly<AppearanceConfig> = {
  theme: 'system',
  backgroundColor: '#18181b',
  wallpaper: { type: 'none' },
  liquidGlassEnabled: true,
};

export function createDefaultDashboardConfig(): DashboardConfig {
  return {
    version: DASHBOARD_CONFIG_VERSION,
    widgets: [],
    appearance: {
      ...DEFAULT_APPEARANCE,
      wallpaper: { ...DEFAULT_APPEARANCE.wallpaper },
    },
  };
}
