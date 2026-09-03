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
      version: 5,
      appearance: {
        ...legacyConfig.appearance,
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
    });
  });

  it('migrates a v2 dashboard with no wallpaper', () => {
    const legacyConfig = {
      version: 2,
      widgets: [],
      appearance: { theme: 'dark', backgroundColor: '#123456' },
    } as const;

    expect(migrateDashboardConfig(legacyConfig)).toEqual({
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
      version: 5,
      widgets: [legacyConfig.widgets[1]],
      appearance: {
        ...legacyConfig.appearance,
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
      ...v3Config,
      version: 5,
      appearance: {
        ...v3Config.appearance,
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
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
        version: 5,
        widgets: [],
        appearance: {
          theme: 'dark',
          backgroundColor: '#123456',
          wallpaper: { type: 'none' },
          liquidGlass: {
            enabled,
            transparency: 40,
            blur: 18,
            shadow: 50,
          },
        },
      });
    },
  );

  it('rejects an unsupported version', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        version: 6,
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
});
