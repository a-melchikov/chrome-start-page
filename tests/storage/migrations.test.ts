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

  it('rejects an unsupported version', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        version: 2,
      }),
    ).toThrow(UnsupportedDashboardConfigVersionError);
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

  it('rejects a SearchWidget with an unknown engine', () => {
    expect(() =>
      migrateDashboardConfig({
        ...createDefaultDashboardConfig(),
        widgets: [
          {
            id: 'search-widget',
            type: 'search',
            engine: 'unknown',
            layout: { x: 0, y: 0, w: 6, h: 3 },
          },
        ],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });
});
