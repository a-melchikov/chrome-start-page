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
      version: 4,
      appearance: {
        theme: 'light',
        backgroundColor: '#f4f4f5',
        wallpaper: { type: 'none' },
        liquidGlassEnabled: true,
      },
      widgets: [
        {
          id: '12c8b540-4847-45b3-98b7-d13b00833040',
          type: 'markdown',
          title: 'Работа',
          content: '[Mail](https://mail.example.com/)',
          layout: { x: 1, y: 2, w: 3, h: 4 },
        },
        {
          id: 'ec39ba5f-89f2-471c-b774-0b84d592ad87',
          type: 'search',
          title: 'Поиск',
          engine: 'bing',
          layout: { x: 4, y: 2, w: 6, h: 3 },
        },
      ],
    };

    await saveDashboardConfig(config);

    const normalizedConfig = {
      ...config,
      widgets: config.widgets.map((widget) =>
        widget.type === 'search'
          ? { ...widget, layout: { ...widget.layout, h: 1 } }
          : widget,
      ),
    };

    await expect(loadDashboardConfig()).resolves.toEqual(normalizedConfig);
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(normalizedConfig);
  });

  it('migrates a stored v1 LinksWidget and writes v4 back to storage', async () => {
    const legacyConfig = {
      version: 1,
      appearance: { theme: 'system', backgroundColor: '#18181b' },
      widgets: [
        {
          id: 'legacy-links',
          type: 'links',
          title: 'Ссылки',
          content: '[Docs](https://example.com/docs)',
          layout: { x: 3, y: 4, w: 6, h: 5 },
        },
      ],
    };
    await storage.setItem(DASHBOARD_STORAGE_KEY, legacyConfig);

    const migrated = await loadDashboardConfig();

    expect(migrated).toEqual({
      ...legacyConfig,
      version: 4,
      appearance: {
        ...legacyConfig.appearance,
        wallpaper: { type: 'none' },
        liquidGlassEnabled: true,
      },
      widgets: [{ ...legacyConfig.widgets[0], type: 'markdown' }],
    });
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(migrated);
  });
});
