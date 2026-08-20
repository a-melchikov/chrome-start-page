import { storage } from '#imports';

import { createDefaultDashboardConfig } from './defaults';
import { migrateDashboardConfig } from './migrations';
import type { DashboardConfig } from './schema';

export const DASHBOARD_STORAGE_KEY = 'local:dashboard-config' as const;

const dashboardConfigItem = storage.defineItem<unknown>(DASHBOARD_STORAGE_KEY);

export async function loadDashboardConfig(): Promise<DashboardConfig> {
  const storedConfig = await dashboardConfigItem.getValue();

  if (storedConfig === null) {
    const defaultConfig = createDefaultDashboardConfig();
    await dashboardConfigItem.setValue(defaultConfig);
    return defaultConfig;
  }

  const migratedConfig = migrateDashboardConfig(storedConfig);

  if (migratedConfig !== storedConfig) {
    await dashboardConfigItem.setValue(migratedConfig);
  }

  return migratedConfig;
}

export async function saveDashboardConfig(
  config: DashboardConfig,
): Promise<void> {
  await dashboardConfigItem.setValue(migrateDashboardConfig(config));
}
