import { storage } from '#imports';

import { createDefaultDashboardConfig } from './defaults';
import { migrateDashboardConfig } from './migrations';
import type { DashboardConfig } from './schema';

export const DASHBOARD_STORAGE_KEY = 'local:dashboard-config' as const;
export const DASHBOARD_WRITE_LOCK = 'chrome-start-page-dashboard-write';

const dashboardConfigItem = storage.defineItem<unknown>(DASHBOARD_STORAGE_KEY);

export async function readStoredDashboardConfig(): Promise<DashboardConfig | null> {
  const value = await dashboardConfigItem.getValue();
  return value === null ? null : migrateDashboardConfig(value);
}

export function watchDashboardConfig(
  listener: (config: DashboardConfig) => void,
  onError: (error: unknown) => void,
): () => void {
  return dashboardConfigItem.watch((value) => {
    if (value === null) return;
    try {
      listener(migrateDashboardConfig(value));
    } catch (error) {
      onError(error);
    }
  });
}

export async function withDashboardWriteLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return operation();
  }
  return navigator.locks.request(DASHBOARD_WRITE_LOCK, operation);
}

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
