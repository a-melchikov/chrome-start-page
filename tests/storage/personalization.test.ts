import { describe, expect, it } from 'vitest';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { migrateDashboardConfig } from '../../storage/migrations';
import { parseDashboardBackup } from '../../storage/dashboard-backup';
import { createDefaultMarkdownWidget } from '../../widgets/markdown/defaults';
import { DEFAULT_MARKDOWN_TYPOGRAPHY } from '../../widgets/markdown/typography';
import { isShortcutOverrides } from '../../keyboard/shortcuts';

function personalizedConfig() {
  const config = createDefaultDashboardConfig();
  config.animationMode = 'off';
  config.shortcuts = {
    edit: [{ code: 'KeyQ', ctrl: false, alt: false, shift: true, meta: false }],
    help: [],
  };
  config.workspaces[0]!.appearance.gridGap = 0;
  config.workspaces[0]!.appearance.gridPadding = 64;
  config.workspaces[0]!.widgets = [
    {
      ...createDefaultMarkdownWidget('note', 0),
      typography: {
        ...DEFAULT_MARKDOWN_TYPOGRAPHY,
        fontSize: 22,
        lineSpacing: 'relaxed',
        readerWidth: 90,
        titleAlign: 'center',
      },
    },
  ];
  return config;
}

describe('Personalization storage boundary', () => {
  it('preserves settings and disabled shortcuts through JSON loading and backup parsing', () => {
    const config = personalizedConfig();
    expect(migrateDashboardConfig(JSON.parse(JSON.stringify(config)))).toEqual(
      config,
    );
    expect(
      parseDashboardBackup({
        format: 'chrome-start-page-backup',
        formatVersion: 3,
        exportedAt: '2026-11-01T10:00:00.000Z',
        dashboard: config,
        localWallpapers: [],
        localImages: [],
      }).dashboard,
    ).toEqual(config);
  });

  it('accepts old dashboards without the optional settings', () => {
    const config = createDefaultDashboardConfig();
    expect(migrateDashboardConfig(config)).toEqual(config);
  });

  it.each([-1, 49, 1.5, '16', null])(
    'rejects invalid grid gaps: %s',
    (gridGap) => {
      const config = personalizedConfig();
      const workspace = config.workspaces[0]!;
      expect(() =>
        migrateDashboardConfig({
          ...config,
          workspaces: [
            { ...workspace, appearance: { ...workspace.appearance, gridGap } },
          ],
        }),
      ).toThrow();
    },
  );

  it.each([-1, 65, NaN, '24'])(
    'rejects invalid outer padding: %s',
    (gridPadding) => {
      const config = personalizedConfig();
      const workspace = config.workspaces[0]!;
      expect(() =>
        migrateDashboardConfig({
          ...config,
          workspaces: [
            {
              ...workspace,
              appearance: { ...workspace.appearance, gridPadding },
            },
          ],
        }),
      ).toThrow();
    },
  );

  it.each([
    { fontSize: '18' },
    { fontSize: 29 },
    { readerWidth: 0 },
    { titleSize: 100 },
    { titleAlign: 'justify' },
    { lineSpacing: 'bad' },
  ])('rejects malformed typography: %j', (invalid) => {
    const config = personalizedConfig();
    const workspace = config.workspaces[0]!;
    const invalidWidget = {
      ...createDefaultMarkdownWidget('note', 0),
      typography: { ...DEFAULT_MARKDOWN_TYPOGRAPHY, ...invalid },
    };
    expect(() =>
      migrateDashboardConfig({
        ...config,
        workspaces: [{ ...workspace, widgets: [invalidWidget] }],
      }),
    ).toThrow();
  });

  it('rejects unknown motion modes, reserved keys and conflicting assignments', () => {
    expect(() =>
      migrateDashboardConfig({
        ...personalizedConfig(),
        animationMode: 'fast',
      }),
    ).toThrow();
    expect(
      isShortcutOverrides({
        edit: [
          { code: 'KeyC', ctrl: true, alt: false, shift: false, meta: false },
        ],
      }),
    ).toBe(false);
    expect(
      isShortcutOverrides({
        edit: [
          { code: 'KeyB', ctrl: false, alt: false, shift: false, meta: false },
        ],
      }),
    ).toBe(false);
    expect(isShortcutOverrides({ unknown: [] })).toBe(false);
    expect(isShortcutOverrides({ edit: [] })).toBe(true);
  });
});
