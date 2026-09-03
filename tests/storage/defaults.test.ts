import { describe, expect, it } from 'vitest';

import {
  DEFAULT_APPEARANCE,
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
      },
    });
  });

  it('enables Liquid Glass for a new dashboard', () => {
    expect(createDefaultDashboardConfig().appearance.liquidGlassEnabled).toBe(
      true,
    );
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
  });
});
