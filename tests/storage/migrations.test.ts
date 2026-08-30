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

  it('migrates mixed v1 widgets to v3 without losing data', () => {
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
      version: 3,
      appearance: {
        ...legacyConfig.appearance,
        wallpaper: { type: 'none' },
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

  it('migrates a v2 dashboard to v3 with no wallpaper', () => {
    const legacyConfig = {
      version: 2,
      widgets: [],
      appearance: { theme: 'dark', backgroundColor: '#123456' },
    } as const;

    expect(migrateDashboardConfig(legacyConfig)).toEqual({
      version: 3,
      widgets: [],
      appearance: {
        theme: 'dark',
        backgroundColor: '#123456',
        wallpaper: { type: 'none' },
      },
    });
  });

  it('rejects an unsupported version', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        version: 4,
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
