import { describe, expect, it } from 'vitest';

import {
  DEFAULT_APPEARANCE,
  DEFAULT_LIQUID_GLASS,
  createDefaultDashboardConfig,
} from '../../storage/defaults';
import { DASHBOARD_CONFIG_VERSION } from '../../storage/schema';

describe('createDefaultDashboardConfig', () => {
  it('creates an empty current-version dashboard with neutral appearance', () => {
    expect(createDefaultDashboardConfig()).toEqual({
      version: DASHBOARD_CONFIG_VERSION,
      widgets: [],
      appearance: {
        ...DEFAULT_APPEARANCE,
        wallpaper: { type: 'none' },
        liquidGlass: { ...DEFAULT_LIQUID_GLASS },
      },
    });
  });

  it('uses the standard Liquid Glass controls for a new dashboard', () => {
    expect(createDefaultDashboardConfig()).toMatchObject({
      version: 5,
      appearance: {
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    });
  });

  it('returns a fresh config on every call', () => {
    const firstConfig = createDefaultDashboardConfig();
    const secondConfig = createDefaultDashboardConfig();

    expect(firstConfig).not.toBe(secondConfig);
    expect(firstConfig.widgets).not.toBe(secondConfig.widgets);
    expect(firstConfig.appearance).not.toBe(secondConfig.appearance);
    expect(firstConfig.appearance.wallpaper).not.toBe(
      secondConfig.appearance.wallpaper,
    );
    expect(firstConfig.appearance.liquidGlass).not.toBe(
      secondConfig.appearance.liquidGlass,
    );
  });
});
