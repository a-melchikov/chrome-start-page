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
});
