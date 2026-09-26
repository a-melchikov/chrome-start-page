import { describe, expect, it } from 'vitest';

import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  InvalidDashboardConfigError,
  UnsupportedDashboardConfigVersionError,
  migrateDashboardConfig,
} from '../../storage/migrations';

describe('migrateDashboardConfig', () => {
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

    expect(migrateDashboardConfig(legacyConfig)).toEqual({
      version: 6,
      appearance: {
        theme: { type: 'builtin', id: 'light' },
        backgroundColor: { type: 'custom', color: '#f4f4f5' },
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
      widgets: [
        {
          ...legacyConfig.widgets[0],
          type: 'markdown',
        },
        {
          ...legacyConfig.widgets[1],
          layout: { ...legacyConfig.widgets[1].layout, h: 1 },
        },
      ],
      customThemes: [],
    });
  });

  it('migrates a v2 dashboard with no wallpaper', () => {
    const legacyConfig = {
      version: 2,
      widgets: [],
      appearance: { theme: 'dark', backgroundColor: '#123456' },
    } as const;

    expect(migrateDashboardConfig(legacyConfig)).toEqual({
      version: 6,
      widgets: [],
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

    expect(migrateDashboardConfig(legacyConfig)).toEqual({
      version: 6,
      widgets: [legacyConfig.widgets[1]],
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
    });
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

    expect(migrateDashboardConfig(v3Config)).toEqual({
      version: 6,
      widgets: [],
      appearance: {
        theme: { type: 'builtin', id: 'dark' },
        backgroundColor: { type: 'custom', color: '#123456' },
        wallpaper: {
          type: 'url',
          url: 'https://example.com/wallpaper.jpg',
        },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
      customThemes: [],
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

      expect(migrateDashboardConfig(v4Config)).toEqual({
        version: 6,
        widgets: [],
        appearance: {
          theme: { type: 'builtin', id: 'dark' },
          backgroundColor: { type: 'custom', color: '#123456' },
          wallpaper: { type: 'none' },
          liquidGlass: {
            enabled,
            transparency: 40,
            blur: 18,
            shadow: 50,
          },
        },
        customThemes: [],
      });
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

    expect(migrateDashboardConfig(v5Config)).toEqual({
      version: 6,
      widgets: [],
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
    });
  });

  it('rejects an unsupported version', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        version: 7,
      }),
    ).toThrow(UnsupportedDashboardConfigVersionError);
  });

  it.each([
    { type: 'url', url: 'http://example.com/wallpaper.jpg' },
    { type: 'url', url: 'not a url' },
    { type: 'local', assetId: 'not-a-uuid' },
    { type: 'unknown' },
  ])('rejects invalid wallpaper config %#', (wallpaper) => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        appearance: {
          ...createDefaultDashboardConfig().appearance,
          wallpaper,
        },
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it.each([
    'system',
    'light',
    'dark',
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
    expect(result.appearance.theme).toEqual({ type: 'builtin', id: theme });
  });

  it.each([
    'system',
    'light',
    'dark',
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
      appearance: {
        ...config.appearance,
        theme: { type: 'builtin', id: theme },
      },
    });
    expect(result.appearance.theme).toEqual({ type: 'builtin', id: theme });
  });

  it('rejects malformed current-version data', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        appearance: { theme: 'unknown', backgroundColor: '#18181b' },
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
        appearance: {
          ...config.appearance,
          liquidGlass: { enabled: true, ...values },
        },
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('rejects a non-boolean Liquid Glass toggle', () => {
    const config = createDefaultDashboardConfig();

    expect(() =>
      migrateDashboardConfig({
        ...config,
        appearance: {
          ...config.appearance,
          liquidGlass: {
            ...config.appearance.liquidGlass,
            enabled: 'yes',
          },
        },
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('normalizes a saved SearchWidget to the compact height', () => {
    const config = {
      ...createDefaultDashboardConfig(),
      widgets: [
        {
          id: 'search-widget',
          type: 'search',
          title: 'Поиск',
          engine: 'duckduckgo',
          layout: { x: 0, y: 0, w: 6, h: 3 },
        },
      ],
    } as const;

    expect(migrateDashboardConfig(config)).toEqual({
      ...config,
      widgets: [
        {
          ...config.widgets[0],
          layout: { ...config.widgets[0].layout, h: 1 },
        },
      ],
    });
  });

  it('rejects a MarkdownWidget without string content', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'markdown-widget',
            type: 'markdown',
            content: null,
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('rejects a SearchWidget with an unknown engine', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'search-widget',
            type: 'search',
            engine: 'unknown',
            layout: { x: 0, y: 0, w: 6, h: 1 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('accepts a valid PomodoroWidget config', () => {
    const validConfig = {
      ...createDefaultDashboardConfig(),
      widgets: [
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
      ],
    };

    expect(migrateDashboardConfig(validConfig)).toEqual(validConfig);
  });

  it('rejects a PomodoroWidget with invalid durations or sound flag', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
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
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
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
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('rejects widgets with invalid, empty, or oversized widget IDs', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: '',
            type: 'markdown',
            content: 'text',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'a'.repeat(65),
            type: 'markdown',
            content: 'text',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: '../path-traversal',
            type: 'markdown',
            content: 'text',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'widget<script>',
            type: 'markdown',
            content: 'text',
            layout: { x: 0, y: 0, w: 4, h: 3 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('accepts valid image widgets with none, url, and local sources', () => {
    const validConfig = {
      ...createDefaultDashboardConfig(),
      widgets: [
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
      ],
    };

    expect(migrateDashboardConfig(validConfig)).toEqual(validConfig);
  });

  it('rejects image widgets with invalid sources or positions', () => {
    // Insecure HTTP url
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'img-bad-url',
            type: 'image',
            source: { type: 'url', url: 'http://insecure.example.com/pic.png' },
            objectPosition: 'center',
            layout: { x: 0, y: 0, w: 4, h: 4 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid local assetId
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'img-bad-asset',
            type: 'image',
            source: { type: 'local', assetId: 'not-a-valid-uuid' },
            objectPosition: 'center',
            layout: { x: 0, y: 0, w: 4, h: 4 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid object position
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'img-bad-pos',
            type: 'image',
            source: { type: 'none' },
            objectPosition: 'diagonal-center',
            layout: { x: 0, y: 0, w: 4, h: 4 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('accepts valid clock widgets in v5 config', () => {
    const validConfig = {
      ...createDefaultDashboardConfig(),
      widgets: [
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
      ],
    };

    expect(migrateDashboardConfig(validConfig)).toEqual(validConfig);
  });

  it('rejects clock widgets with invalid formats or timezone', () => {
    // Invalid timeFormat
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
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
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid dateFormat
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
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
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid timezone
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
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
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('accepts valid weather widgets in v5 config', () => {
    const migrated = migrateDashboardConfig({
      ...createDefaultDashboardConfig(),
      widgets: [
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
      ],
    });

    expect(migrated.widgets).toHaveLength(3);
    expect(migrated.widgets[0]?.type).toBe('weather');
    expect(migrated.widgets[1]?.type).toBe('weather');
    expect(migrated.widgets[2]?.type).toBe('weather');
  });

  it('rejects weather widgets with invalid mode, coordinates, or timezone', () => {
    // Invalid mode
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'weather-bad-mode',
            type: 'weather',
            mode: 'animated',
            location: { type: 'unset' },
            layout: { x: 0, y: 0, w: 5, h: 5 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid latitude
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
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
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);

    // Invalid city timezone ('local' is disallowed for city)
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
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
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });
});
