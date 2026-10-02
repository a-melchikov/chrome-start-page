import { describe, expect, it } from 'vitest';

import { createDefaultDashboardConfig } from '../../storage/defaults';
import { DASHBOARD_CONFIG_VERSION } from '../../storage/schema';

describe('createDefaultDashboardConfig', () => {
  it('creates a current-version dashboard with default workspaces and neutral appearance', () => {
    const config = createDefaultDashboardConfig();
    expect(config.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(config.workspaces).toHaveLength(2);
    expect(config.activeWorkspaceId).toBe(config.workspaces[0]!.id);
    expect(config.workspaces[0]!.name).toBe('Основной');
    expect(config.workspaces[1]!.name).toBe('Работа');
    expect(config.workspaces[0]!.widgets).toHaveLength(0);
    expect(config.workspaces[1]!.widgets).toHaveLength(3);
    expect(config.customThemes).toEqual([]);
    expect(config.toolbar).toEqual({ mode: 'top-right' });
  });

  it('uses the standard Liquid Glass controls for workspaces', () => {
    const config = createDefaultDashboardConfig();
    expect(config.workspaces[0]!.appearance.liquidGlass).toEqual({
      enabled: true,
      transparency: 40,
      blur: 18,
      shadow: 50,
    });
  });

  it('returns a fresh config on every call', () => {
    const firstConfig = createDefaultDashboardConfig();
    const secondConfig = createDefaultDashboardConfig();

    expect(firstConfig).not.toBe(secondConfig);
    expect(firstConfig.toolbar).not.toBe(secondConfig.toolbar);
    expect(firstConfig.workspaces).not.toBe(secondConfig.workspaces);
    expect(firstConfig.workspaces[0]!.widgets).not.toBe(
      secondConfig.workspaces[0]!.widgets,
    );
    expect(firstConfig.workspaces[0]!.appearance).not.toBe(
      secondConfig.workspaces[0]!.appearance,
    );
    expect(firstConfig.workspaces[0]!.appearance.wallpaper).not.toBe(
      secondConfig.workspaces[0]!.appearance.wallpaper,
    );
    expect(firstConfig.workspaces[0]!.appearance.liquidGlass).not.toBe(
      secondConfig.workspaces[0]!.appearance.liquidGlass,
    );
  });
});
