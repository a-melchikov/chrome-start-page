import { DASHBOARD_CONFIG_VERSION } from '../../storage/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  DASHBOARD_STORAGE_KEY,
  loadDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';

describe('dashboard storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('creates and persists the default config when storage is empty', async () => {
    const config = await loadDashboardConfig();

    expect(config.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(config.workspaces).toHaveLength(2);
    expect(config.activeWorkspaceId).toBe(config.workspaces[0]!.id);
    expect(config.workspaces[0]!.name).toBe('Основной');
    expect(config.workspaces[1]!.name).toBe('Работа');
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(config);
  });

  it('saves and loads a config without losing widget data', async () => {
    const workspaceId = '12c8b540-4847-45b3-98b7-d13b00833041';
    const config: DashboardConfig = {
      version: 9,
      toolbar: { mode: 'top-right' },
      activeWorkspaceId: workspaceId,
      workspaces: [
        {
          id: workspaceId,
          name: 'Основной',
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
              id: '12c8b540-4847-45b3-98b7-d13b00833040',
              type: 'markdown',
              title: 'Работа',
              content: '[Mail](https://mail.example.com/)',
              layout: { x: 1, y: 2, w: 3, h: 4 },
              template: 'blank',
              quickAddEnabled: false,
              hideCompletedTasks: false,
            },
            {
              id: 'ec39ba5f-89f2-471c-b774-0b84d592ad87',
              type: 'search',
              title: 'Поиск',
              engine: 'bing',
              layout: { x: 4, y: 2, w: 6, h: 3 },
            },
          ],
        },
      ],
      customThemes: [],
    };

    await saveDashboardConfig(config);

    const normalizedConfig: DashboardConfig = {
      ...config,
      workspaces: [
        {
          ...config.workspaces[0]!,
          widgets: config.workspaces[0]!.widgets.map((widget) =>
            widget.type === 'search'
              ? { ...widget, layout: { ...widget.layout, h: 1 } }
              : widget,
          ),
        },
      ],
    };

    await expect(loadDashboardConfig()).resolves.toEqual(normalizedConfig);
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(normalizedConfig);
  });

  it('migrates a stored v1 LinksWidget and writes v8 back to storage', async () => {
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

    expect(migrated.version).toBe(DASHBOARD_CONFIG_VERSION);
    expect(migrated.workspaces).toHaveLength(2);
    expect(migrated.activeWorkspaceId).toBe(migrated.workspaces[0]!.id);
    expect(migrated.workspaces[0]!.name).toBe('Основной');
    expect(migrated.workspaces[0]!.widgets).toEqual([
      {
        ...legacyConfig.widgets[0],
        type: 'markdown',
        template: 'blank',
        quickAddEnabled: false,
        hideCompletedTasks: false,
      },
    ]);
    expect(migrated.workspaces[1]!.name).toBe('Работа');
    expect(migrated.workspaces[1]!.widgets).toHaveLength(3);
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(migrated);
  });
});
