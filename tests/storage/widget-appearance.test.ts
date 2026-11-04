import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  createDashboardBackup,
  parseDashboardBackupJson,
  serializeDashboardBackup,
} from '../../storage/dashboard-backup';
import {
  InvalidDashboardConfigError,
  migrateDashboardConfig,
} from '../../storage/migrations';
import { getAvailableWidgetDefinitions } from '../../widgets/registry';
import { resolveWidgetGlass } from '../../storage/widget-appearance';
import { DEFAULT_LIQUID_GLASS } from '../../storage/defaults';

describe('interface scale and widget appearance storage', () => {
  beforeEach(() => fakeBrowser.reset());

  it('inherits omitted values while keeping explicit false and zero overrides', () => {
    expect(
      resolveWidgetGlass(
        { ...DEFAULT_LIQUID_GLASS, pointerLight: true },
        {
          enabled: false,
          transparency: 0,
          blur: undefined,
          shadow: 0,
          pointerLight: false,
        },
      ),
    ).toEqual({
      enabled: false,
      transparency: 0,
      blur: 18,
      shadow: 0,
      pointerLight: false,
    });
  });

  it.each([undefined, 80, 100, 150])(
    'accepts compatible text scale %s',
    (interfaceTextScale) => {
      const config = { ...createDefaultDashboardConfig(), interfaceTextScale };
      expect(migrateDashboardConfig(config)).toBe(config);
    },
  );

  it.each([null, '100', 79, 151, 99.5, NaN, Infinity])(
    'rejects invalid text scale %s',
    (interfaceTextScale) => {
      expect(() =>
        migrateDashboardConfig({
          ...createDefaultDashboardConfig(),
          interfaceTextScale,
        }),
      ).toThrow(InvalidDashboardConfigError);
    },
  );

  it.each([
    null,
    [],
    { borderRadius: 41 },
    { borderRadius: -1 },
    { borderRadius: 1.5 },
    { liquidGlass: null },
    { liquidGlass: [] },
    { liquidGlass: { enabled: 'true' } },
    { liquidGlass: { pointerLight: 1 } },
    { liquidGlass: { transparency: 101 } },
    { liquidGlass: { blur: -1 } },
    { liquidGlass: { blur: 41 } },
    { liquidGlass: { shadow: NaN } },
  ])('rejects malformed widget appearance %j', (appearance) => {
    const config = createDefaultDashboardConfig();
    const widget = getAvailableWidgetDefinitions()[0]!.create('note', 0);
    const invalid = {
      ...config,
      workspaces: [
        { ...config.workspaces[0]!, widgets: [{ ...widget, appearance }] },
      ],
    };
    expect(() => migrateDashboardConfig(invalid)).toThrow(
      InvalidDashboardConfigError,
    );
    expect(() =>
      migrateDashboardConfig({
        ...config,
        trashedWorkspaces: [
          { workspace: invalid.workspaces[0], deletedAt: 1, originalIndex: 0 },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('round trips all widget types and partial overrides in a backup without changing legacy defaults', async () => {
    const config = createDefaultDashboardConfig();
    config.interfaceTextScale = 125;
    const appearance = {
      borderRadius: 0,
      liquidGlass: {
        enabled: false,
        transparency: 100,
        blur: 0,
        shadow: 100,
        pointerLight: true,
      },
    };
    config.workspaces[0]!.widgets = getAvailableWidgetDefinitions().map(
      (definition, index) => ({
        ...definition.create(`widget-${index}`, index),
        appearance,
      }),
    );
    config.workspaces[0]!.widgets.push({
      ...getAvailableWidgetDefinitions()[0]!.create('partial', 0),
      appearance: { liquidGlass: { blur: 15 } },
    });
    const restored = parseDashboardBackupJson(
      serializeDashboardBackup(await createDashboardBackup(config)),
    ).dashboard;
    expect(restored).toEqual(config);
    expect(
      migrateDashboardConfig(createDefaultDashboardConfig()).interfaceTextScale,
    ).toBeUndefined();
  });
});
