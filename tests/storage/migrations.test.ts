import { DASHBOARD_CONFIG_VERSION } from '../../storage/schema';
import { describe, expect, it } from 'vitest';

import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  InvalidDashboardConfigError,
  UnsupportedDashboardConfigVersionError,
  migrateDashboardConfig,
} from '../../storage/migrations';

function createTestDashboardWithWidgets(widgets: unknown[]) {
  const config = createDefaultDashboardConfig();
  return {
    ...config,
    workspaces: [
      {
        ...config.workspaces[0]!,
        widgets,
      },
      ...config.workspaces.slice(1),
    ],
  };
}

describe('migrateDashboardConfig', () => {
  it.each([undefined, 0, 12, 40])(
    'preserves compatible widget rounding %s without changing other spaces',
    (widgetBorderRadius) => {
      const config = createDefaultDashboardConfig();
      if (widgetBorderRadius !== undefined) {
        config.workspaces[0]!.appearance.widgetBorderRadius =
          widgetBorderRadius;
      }
      expect(migrateDashboardConfig(config)).toBe(config);
      expect(
        config.workspaces[1]!.appearance.widgetBorderRadius,
      ).toBeUndefined();
    },
  );

  it.each([-1, 41, 12.5, NaN, Infinity, '12', null])(
    'rejects malformed widget rounding %s',
    (widgetBorderRadius) => {
      const config = createDefaultDashboardConfig();
      const invalid = {
        ...config,
        workspaces: config.workspaces.map((workspace) => ({
          ...workspace,
          appearance: { ...workspace.appearance, widgetBorderRadius },
        })),
      };
      expect(() => migrateDashboardConfig(invalid)).toThrow(
        InvalidDashboardConfigError,
      );
    },
  );

  it.each([undefined, false, true])(
    'accepts the optional website button setting %s',
    (showWebsiteSetButton) => {
      const widget = {
        id: 'sites',
        type: 'markdown',
        content: '[A](https://example.com)',
        template: 'blank',
        quickAddEnabled: false,
        hideCompletedTasks: false,
        layout: { x: 0, y: 0, w: 4, h: 3 },
        ...(showWebsiteSetButton === undefined ? {} : { showWebsiteSetButton }),
      };
      const config = createTestDashboardWithWidgets([widget]);
      expect(migrateDashboardConfig(config).workspaces[0]!.widgets[0]).toEqual(
        widget,
      );
    },
  );

  it.each(['true', 1, null])(
    'rejects malformed website button setting %s',
    (showWebsiteSetButton) => {
      const config = createTestDashboardWithWidgets([
        {
          id: 'sites',
          type: 'markdown',
          content: '',
          template: 'blank',
          quickAddEnabled: false,
          hideCompletedTasks: false,
          showWebsiteSetButton,
          layout: { x: 0, y: 0, w: 4, h: 3 },
        },
      ]);
      expect(() => migrateDashboardConfig(config)).toThrow(
        InvalidDashboardConfigError,
      );
    },
  );

  it('accepts the current version without changing it', () => {
    const config = createDefaultDashboardConfig();

    expect(migrateDashboardConfig(config)).toBe(config);
  });

  it('migrates mixed v1 widgets to the current version without losing data', () => {
    const legacyConfig = {
      version: 1,
      appearance: { theme: 'light', backgroundColor: '#f4f4f5' },
      widgets: [
        {
          id: 'links-widget',
          type: 'links',
          title: 'Работа',
          content: '[Mail](https://mail.example.com/)',
          layout: { x: 2, y: 3, w: 7, h: 5 },
        },
        {
          id: 'search-widget',
          type: 'search',
          title: '',
          engine: 'bing',
          layout: { x: 0, y: 8, w: 6, h: 3 },
        },
      ],
    } as const;

    const migrated = migrateDashboardConfig(legacyConfig);
    expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(migrated.workspaces).toHaveLength(2);
    expect(migrated.activeWorkspaceId).toBe(migrated.workspaces[0]!.id);
    expect(migrated.workspaces[0]!.name).toBe('Основной');
    expect(migrated.workspaces[0]!.appearance).toEqual({
      theme: { type: 'builtin', id: 'light' },
      backgroundColor: { type: 'custom', color: '#f4f4f5' },
      wallpaper: { type: 'none' },
      liquidGlass: {
        enabled: true,
        transparency: 40,
        blur: 18,
        shadow: 50,
      },
    });
    expect(migrated.workspaces[0]!.widgets).toEqual([
      {
        ...legacyConfig.widgets[0],
        type: 'markdown',
        template: 'blank',
        quickAddEnabled: false,
        hideCompletedTasks: false,
      },
      {
        ...legacyConfig.widgets[1],
        layout: { ...legacyConfig.widgets[1].layout, h: 1 },
      },
    ]);
    expect(migrated.workspaces[1]!.name).toBe('Работа');
    expect(migrated.workspaces[1]!.widgets).toHaveLength(3);
  });

  it('migrates a v2 dashboard with no wallpaper', () => {
    const legacyConfig = {
      version: 2,
      widgets: [],
      appearance: { theme: 'dark', backgroundColor: '#123456' },
    } as const;

    const migrated = migrateDashboardConfig(legacyConfig);
    expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(migrated.workspaces).toHaveLength(2);
    expect(migrated.workspaces[0]!.widgets).toEqual([]);
    expect(migrated.workspaces[0]!.appearance.theme).toEqual({
      type: 'builtin',
      id: 'dark',
    });
  });

  it('removes a retired Google Calendar widget while migrating v2', () => {
    const legacyConfig = {
      version: 2,
      widgets: [
        {
          id: 'calendar-widget',
          type: 'google-calendar',
          title: 'Календарь',
          selectedCalendarIds: ['primary'],
          layout: { x: 0, y: 0, w: 6, h: 5 },
        },
        {
          id: 'markdown-widget',
          type: 'markdown',
          title: 'Заметки',
          content: 'Сохранить меня',
          layout: { x: 6, y: 0, w: 6, h: 3 },
        },
      ],
      appearance: { theme: 'dark', backgroundColor: '#123456' },
    } as const;

    const migrated = migrateDashboardConfig(legacyConfig);
    expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(migrated.workspaces[0]!.widgets).toEqual([
      {
        ...legacyConfig.widgets[1],
        template: 'blank',
        quickAddEnabled: false,
        hideCompletedTasks: false,
      },
    ]);
  });

  it('migrates v3 wallpaper appearance to v5 with Liquid Glass defaults', () => {
    const v3Config = {
      version: 3,
      widgets: [],
      appearance: {
        theme: 'dark',
        backgroundColor: '#123456',
        wallpaper: {
          type: 'url',
          url: 'https://example.com/wallpaper.jpg',
        },
      },
    } as const;

    const migrated = migrateDashboardConfig(v3Config);
    expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(migrated.workspaces[0]!.appearance.wallpaper).toEqual({
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
      enabled: true,
    });
  });

  it.each([true, false])(
    'migrates v4 and preserves Liquid Glass enabled=%s',
    (enabled) => {
      const v4Config = {
        version: 4,
        widgets: [],
        appearance: {
          theme: 'dark',
          backgroundColor: '#123456',
          wallpaper: { type: 'none' },
          liquidGlassEnabled: enabled,
        },
      } as const;

      const migrated = migrateDashboardConfig(v4Config);
      expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
      expect(migrated.workspaces[0]!.appearance.liquidGlass.enabled).toBe(
        enabled,
      );
    },
  );

  it('migrates a v5 dashboard to v6 with customThemes and theme ref', () => {
    const v5Config = {
      version: 5,
      widgets: [],
      appearance: {
        theme: 'dark',
        backgroundColor: '#123456',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    } as const;

    const migrated = migrateDashboardConfig(v5Config);
    expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(migrated.workspaces).toHaveLength(2);
    expect(migrated.workspaces[0]!.appearance.theme).toEqual({
      type: 'builtin',
      id: 'dark',
    });
  });

  it('migrates a v6 dashboard to v7 with markdown template defaults', () => {
    const v6Config = {
      version: 6,
      widgets: [
        {
          id: 'v6-markdown',
          type: 'markdown',
          title: 'Заметки',
          content: 'Текст',
          layout: { x: 0, y: 0, w: 4, h: 3 },
        },
      ],
      customThemes: [],
      appearance: {
        theme: { type: 'builtin', id: 'dark' },
        backgroundColor: { type: 'custom', color: '#123456' },
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    } as const;

    const migrated = migrateDashboardConfig(v6Config);
    expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(migrated.workspaces[0]!.widgets[0]).toMatchObject({
      type: 'markdown',
      template: 'blank',
    });
  });

  it('migrates a v7 dashboard to v8 with workspaces and default work workspace', () => {
    const v7Config = {
      version: 7,
      widgets: [
        {
          id: 'v7-md',
          type: 'markdown',
          title: 'Мои заметки',
          content: 'Текст',
          template: 'blank',
          quickAddEnabled: false,
          hideCompletedTasks: false,
          layout: { x: 0, y: 0, w: 4, h: 4 },
        },
      ],
      appearance: {
        theme: { type: 'builtin', id: 'dark' },
        backgroundColor: { type: 'custom', color: '#123456' },
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
      customThemes: [],
    };
    const migrated = migrateDashboardConfig(v7Config);
    expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(migrated.workspaces).toHaveLength(2);
    expect(migrated.workspaces[0]!.name).toBe('Основной');
    expect(migrated.workspaces[0]!.widgets).toEqual(v7Config.widgets);
    expect(migrated.workspaces[1]!.name).toBe('Работа');
    expect(migrated.workspaces[1]!.widgets).toHaveLength(3);
    expect(migrated.activeWorkspaceId).toBe(migrated.workspaces[0]!.id);
  });

  it('rejects an unsupported version', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        version: 99,
      }),
    ).toThrow(UnsupportedDashboardConfigVersionError);
  });

  it.each([
    { type: 'url', url: 'http://example.com/wallpaper.jpg' },
    { type: 'url', url: 'not a url' },
    { type: 'url', url: 'https://example.com/wallpaper.jpg', enabled: 'yes' },
    { type: 'local', assetId: 'not-a-uuid' },
    {
      type: 'local',
      assetId: '8dc04e26-6465-4e84-bc05-633c0e28415b',
      enabled: 1,
    },
    { type: 'unknown' },
  ])('rejects invalid wallpaper config %#', (wallpaper) => {
    const config = createDefaultDashboardConfig();
    expect(() =>
      migrateDashboardConfig({
        ...config,
        workspaces: [
          {
            ...config.workspaces[0]!,
            appearance: {
              ...config.workspaces[0]!.appearance,
              wallpaper,
            },
          },
          ...config.workspaces.slice(1),
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('preserves wallpaper enabled=false in v8 config', () => {
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.appearance.wallpaper = {
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
      enabled: false,
    };

    const migrated = migrateDashboardConfig(config);
    expect(migrated.workspaces[0]!.appearance.wallpaper).toEqual({
      type: 'url',
      url: 'https://example.com/wallpaper.jpg',
      enabled: false,
    });
  });

  it.each([
    'system',
    'light',
    'dark',
    'graphite-mint',
    'tokyo-night',
    'rainy-tokyo',
    'cozy-lofi-night',
    'catppuccin-mocha',
    'catppuccin-latte',
    'paper-sage',
    'apricot-noon',
    'nord',
    'synthwave-84',
    'solarized-dark',
  ] as const)('accepts valid theme %s in schema v5', (theme) => {
    const v5Config = {
      version: 5,
      widgets: [],
      appearance: {
        theme,
        backgroundColor: '#18181b',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    };
    const result = migrateDashboardConfig(v5Config);
    expect(result.workspaces[0]!.appearance.theme).toEqual({
      type: 'builtin',
      id: theme,
    });
  });

  it.each([
    'system',
    'light',
    'dark',
    'graphite-mint',
    'tokyo-night',
    'rainy-tokyo',
    'cozy-lofi-night',
    'catppuccin-mocha',
    'catppuccin-latte',
    'paper-sage',
    'apricot-noon',
    'nord',
    'synthwave-84',
    'solarized-dark',
  ] as const)('accepts valid builtin theme %s in schema v6', (theme) => {
    const config = createDefaultDashboardConfig();
    const result = migrateDashboardConfig({
      ...config,
      workspaces: [
        {
          ...config.workspaces[0]!,
          appearance: {
            ...config.workspaces[0]!.appearance,
            theme: { type: 'builtin', id: theme },
          },
        },
      ],
    });
    expect(result.workspaces[0]!.appearance.theme).toEqual({
      type: 'builtin',
      id: theme,
    });
  });

  it('rejects malformed current-version data', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        workspaces: [
          {
            ...createDefaultDashboardConfig().workspaces[0]!,
            appearance: { theme: 'unknown', backgroundColor: '#18181b' },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it.each([
    { transparency: -1, blur: 18, shadow: 50 },
    { transparency: 101, blur: 18, shadow: 50 },
    { transparency: 40.5, blur: 18, shadow: 50 },
    { transparency: 40, blur: -1, shadow: 50 },
    { transparency: 40, blur: 41, shadow: 50 },
    { transparency: 40, blur: 18.5, shadow: 50 },
    { transparency: 40, blur: 18, shadow: -1 },
    { transparency: 40, blur: 18, shadow: 101 },
    { transparency: 40, blur: 18, shadow: 50.5 },
  ])('rejects invalid Liquid Glass values %#', (values) => {
    const config = createDefaultDashboardConfig();

    expect(() =>
      migrateDashboardConfig({
        ...config,
        workspaces: [
          {
            ...config.workspaces[0]!,
            appearance: {
              ...config.workspaces[0]!.appearance,
              liquidGlass: { enabled: true, ...values },
            },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('rejects a non-boolean Liquid Glass toggle', () => {
    const config = createDefaultDashboardConfig();

    expect(() =>
      migrateDashboardConfig({
        ...config,
        workspaces: [
          {
            ...config.workspaces[0]!,
            appearance: {
              ...config.workspaces[0]!.appearance,
              liquidGlass: {
                ...config.workspaces[0]!.appearance.liquidGlass,
                enabled: 'yes',
              },
            },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('normalizes a saved SearchWidget to the compact height', () => {
    const config = createTestDashboardWithWidgets([
      {
        id: 'search-widget',
        type: 'search',
        title: 'Поиск',
        engine: 'duckduckgo',
        layout: { x: 0, y: 0, w: 6, h: 3 },
      },
    ]);

    const migrated = migrateDashboardConfig(config);
    expect(migrated.workspaces[0]!.widgets[0]!.layout.h).toBe(1);
  });

  it('rejects a MarkdownWidget without string content', () => {
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'markdown-widget',
            type: 'markdown',
            content: null,
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('rejects a SearchWidget with an unknown engine', () => {
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'search-widget',
            type: 'search',
            engine: 'unknown',
            layout: { x: 0, y: 0, w: 6, h: 1 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('accepts a valid PomodoroWidget config', () => {
    const validConfig = createTestDashboardWithWidgets([
      {
        id: 'pomodoro-widget',
        type: 'pomodoro',
        title: 'Помодоро',
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        soundEnabled: true,
        layout: { x: 0, y: 0, w: 4, h: 3 },
      },
    ]);

    expect(migrateDashboardConfig(validConfig)).toEqual(validConfig);
  });

  it('rejects a PomodoroWidget with invalid durations or sound flag', () => {
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'pomodoro-widget',
            type: 'pomodoro',
            workDuration: 0,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            soundEnabled: true,
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'pomodoro-widget',
            type: 'pomodoro',
            workDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            soundEnabled: 'yes',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('rejects widgets with invalid, empty, or oversized widget IDs', () => {
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: '',
            type: 'markdown',
            content: 'text',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'a'.repeat(65),
            type: 'markdown',
            content: 'text',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: '../path-traversal',
            type: 'markdown',
            content: 'text',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'widget<script>',
            type: 'markdown',
            content: 'text',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('accepts valid image widgets with none, url, and local sources', () => {
    const validConfig = createTestDashboardWithWidgets([
      {
        id: 'img-1',
        type: 'image' as const,
        source: { type: 'none' as const },
        objectPosition: 'center' as const,
        layout: { x: 0, y: 0, w: 4, h: 4 },
      },
      {
        id: 'img-2',
        type: 'image' as const,
        source: {
          type: 'url' as const,
          url: 'https://example.com/photo.webp',
        },
        objectPosition: 'top-left' as const,
        altText: 'Красивое фото',
        layout: { x: 4, y: 0, w: 6, h: 4 },
      },
      {
        id: 'img-3',
        type: 'image' as const,
        source: {
          type: 'local' as const,
          assetId: '8dc04e26-6465-4e84-bc05-633c0e28415b',
        },
        objectPosition: 'bottom' as const,
        layout: { x: 0, y: 4, w: 4, h: 4 },
      },
    ]);

    expect(migrateDashboardConfig(validConfig)).toEqual(validConfig);
  });

  it('rejects image widgets with invalid sources or positions', () => {
    // Insecure HTTP url
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'img-bad-url',
            type: 'image',
            source: { type: 'url', url: 'http://insecure.example.com/pic.png' },
            objectPosition: 'center',
            layout: { x: 0, y: 0, w: 4, h: 4 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid local assetId
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'img-bad-asset',
            type: 'image',
            source: { type: 'local', assetId: 'not-a-valid-uuid' },
            objectPosition: 'center',
            layout: { x: 0, y: 0, w: 4, h: 4 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid object position
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'img-bad-pos',
            type: 'image',
            source: { type: 'none' },
            objectPosition: 'diagonal-center',
            layout: { x: 0, y: 0, w: 4, h: 4 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('accepts valid clock widgets in v8 config', () => {
    const validConfig = createTestDashboardWithWidgets([
      {
        id: 'clock-local',
        type: 'clock' as const,
        timeFormat: '24h' as const,
        showTime: true,
        showSeconds: false,
        showDate: true,
        dateFormat: 'full' as const,
        showDayOfWeek: true,
        timezone: 'local',
        showTimezoneName: true,
        showTimezoneAbbr: false,
        layout: { x: 0, y: 0, w: 4, h: 2 },
      },
      {
        id: 'clock-custom',
        type: 'clock' as const,
        title: 'Лондон',
        timeFormat: '12h' as const,
        showTime: true,
        showSeconds: true,
        showDate: false,
        dateFormat: 'numeric' as const,
        showDayOfWeek: false,
        timezone: 'Europe/London',
        showTimezoneName: false,
        showTimezoneAbbr: true,
        layout: { x: 4, y: 0, w: 2, h: 2 },
      },
    ]);

    expect(migrateDashboardConfig(validConfig)).toEqual(validConfig);
  });

  it('rejects clock widgets with invalid formats or timezone', () => {
    // Invalid timeFormat
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'clock-bad-time-format',
            type: 'clock',
            timeFormat: '48h',
            showTime: true,
            showSeconds: false,
            showDate: true,
            dateFormat: 'full',
            showDayOfWeek: true,
            timezone: 'local',
            showTimezoneName: true,
            showTimezoneAbbr: false,
            layout: { x: 0, y: 0, w: 4, h: 2 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid dateFormat
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'clock-bad-date-format',
            type: 'clock',
            timeFormat: '24h',
            showTime: true,
            showSeconds: false,
            showDate: true,
            dateFormat: 'unsupported-format',
            showDayOfWeek: true,
            timezone: 'local',
            showTimezoneName: true,
            showTimezoneAbbr: false,
            layout: { x: 0, y: 0, w: 4, h: 2 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid timezone
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'clock-bad-tz',
            type: 'clock',
            timeFormat: '24h',
            showTime: true,
            showSeconds: false,
            showDate: true,
            dateFormat: 'full',
            showDayOfWeek: true,
            timezone: 'Invalid/Non_Existent_Timezone_123',
            showTimezoneName: true,
            showTimezoneAbbr: false,
            layout: { x: 0, y: 0, w: 4, h: 2 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('accepts valid weather widgets in v8 config', () => {
    const migrated = migrateDashboardConfig(
      createTestDashboardWithWidgets([
        {
          id: 'weather-unset',
          type: 'weather',
          mode: 'visual',
          location: { type: 'unset' },
          layout: { x: 0, y: 0, w: 5, h: 5 },
        },
        {
          id: 'weather-auto',
          type: 'weather',
          mode: 'compact',
          location: { type: 'auto' },
          layout: { x: 5, y: 0, w: 5, h: 5 },
        },
        {
          id: 'weather-city',
          type: 'weather',
          mode: 'visual',
          location: {
            type: 'city',
            id: 524901,
            name: 'Москва',
            region: 'Москва',
            country: 'Россия',
            latitude: 55.75,
            longitude: 37.62,
            timezone: 'Europe/Moscow',
          },
          layout: { x: 0, y: 5, w: 5, h: 5 },
        },
      ]),
    );

    expect(migrated.workspaces[0]!.widgets).toHaveLength(3);
    expect(migrated.workspaces[0]!.widgets[0]?.type).toBe('weather');
    expect(migrated.workspaces[0]!.widgets[1]?.type).toBe('weather');
    expect(migrated.workspaces[0]!.widgets[2]?.type).toBe('weather');
  });

  it('rejects weather widgets with invalid mode, coordinates, or timezone', () => {
    // Invalid mode
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'weather-bad-mode',
            type: 'weather',
            mode: 'animated',
            location: { type: 'unset' },
            layout: { x: 0, y: 0, w: 5, h: 5 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid latitude
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'weather-bad-lat',
            type: 'weather',
            mode: 'visual',
            location: {
              type: 'city',
              id: 123,
              name: 'Test',
              region: '',
              country: 'Country',
              latitude: 95,
              longitude: 37,
              timezone: 'Europe/Moscow',
            },
            layout: { x: 0, y: 0, w: 5, h: 5 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid city timezone ('local' is disallowed for city)
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'weather-bad-tz',
            type: 'weather',
            mode: 'visual',
            location: {
              type: 'city',
              id: 123,
              name: 'Test',
              region: '',
              country: 'Country',
              latitude: 55,
              longitude: 37,
              timezone: 'local',
            },
            layout: { x: 0, y: 0, w: 5, h: 5 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);
  });
});

describe('toolbar configuration migration', () => {
  it('adds the top-right default to v8 without altering workspace data', () => {
    const current = createDefaultDashboardConfig();
    const legacy = {
      version: 8,
      workspaces: current.workspaces,
      activeWorkspaceId: current.activeWorkspaceId,
      customThemes: current.customThemes,
    };
    const migrated = migrateDashboardConfig(legacy);
    expect(migrated).toEqual({
      ...legacy,
      version: DASHBOARD_CONFIG_VERSION,
      toolbar: { mode: 'top-right' },
    });
    expect(migrated.workspaces).toBe(legacy.workspaces);
  });

  it.each(['top-right', 'left-fixed', 'left-collapsible'] as const)(
    'preserves a valid current toolbar mode %s',
    (mode) => {
      const config = { ...createDefaultDashboardConfig(), toolbar: { mode } };
      expect(migrateDashboardConfig(config)).toBe(config);
    },
  );

  it.each([undefined, null, {}, { mode: 'left' }, { mode: 1 }, 'top-right'])(
    'rejects malformed current toolbar settings: %j',
    (toolbar) => {
      expect(() =>
        migrateDashboardConfig({ ...createDefaultDashboardConfig(), toolbar }),
      ).toThrow(InvalidDashboardConfigError);
    },
  );

  it('accepts valid analog-clock widgets in dashboard config', () => {
    const migrated = migrateDashboardConfig(
      createTestDashboardWithWidgets([
        {
          id: 'analog-clock-1',
          type: 'analog-clock',
          dialStyle: 'minimal',
          showSeconds: true,
          showDate: true,
          showTimezone: false,
          timezone: 'local',
          layout: { x: 0, y: 0, w: 3, h: 3 },
        },
        {
          id: 'analog-clock-2',
          type: 'analog-clock',
          dialStyle: 'numbers',
          showSeconds: false,
          showDate: false,
          showTimezone: true,
          timezone: 'Europe/Moscow',
          layout: { x: 3, y: 0, w: 3, h: 3 },
        },
        {
          id: 'analog-clock-3',
          type: 'analog-clock',
          dialStyle: 'bauhaus',
          showSeconds: true,
          showDate: true,
          showTimezone: true,
          timezone: 'UTC',
          layout: { x: 6, y: 0, w: 3, h: 3 },
        },
      ]),
    );

    expect(migrated.workspaces[0]!.widgets).toHaveLength(3);
    expect(migrated.workspaces[0]!.widgets[0]?.type).toBe('analog-clock');
    expect(migrated.workspaces[0]!.widgets[1]?.type).toBe('analog-clock');
    expect(migrated.workspaces[0]!.widgets[2]?.type).toBe('analog-clock');
  });

  it('rejects analog-clock widgets with invalid dialStyle or timezone', () => {
    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'analog-bad-style',
            type: 'analog-clock',
            dialStyle: 'roman',
            showSeconds: true,
            showDate: true,
            showTimezone: false,
            timezone: 'local',
            layout: { x: 0, y: 0, w: 3, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig(
        createTestDashboardWithWidgets([
          {
            id: 'analog-bad-tz',
            type: 'analog-clock',
            dialStyle: 'minimal',
            showSeconds: true,
            showDate: true,
            showTimezone: false,
            timezone: 'Invalid/Timezone',
            layout: { x: 0, y: 0, w: 3, h: 3 },
          },
        ]),
      ),
    ).toThrow(InvalidDashboardConfigError);
  });
});
