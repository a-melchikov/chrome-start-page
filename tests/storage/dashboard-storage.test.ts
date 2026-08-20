import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  DASHBOARD_STORAGE_KEY,
  loadDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import type { DashboardConfig } from '../../storage/schema';

describe('dashboard storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('creates and persists the default config when storage is empty', async () => {
    const config = await loadDashboardConfig();

    expect(config).toEqual(createDefaultDashboardConfig());
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(config);
  });

  it('saves and loads a config without losing widget data', async () => {
    const config: DashboardConfig = {
      version: 1,
      appearance: {
        theme: 'light',
        backgroundColor: '#f4f4f5',
      },
      widgets: [
        {
          id: '12c8b540-4847-45b3-98b7-d13b00833040',
          type: 'links',
          title: 'Работа',
          content: '[Mail](https://mail.example.com/)',
          layout: { x: 1, y: 2, w: 3, h: 4 },
        },
      ],
    };

    await saveDashboardConfig(config);

    await expect(loadDashboardConfig()).resolves.toEqual(config);
  });
});
