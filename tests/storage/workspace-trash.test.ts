import { describe, expect, it } from 'vitest';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { DASHBOARD_CONFIG_VERSION } from '../../storage/schema';
import {
  InvalidDashboardConfigError,
  migrateDashboardConfig,
} from '../../storage/migrations';
import {
  getStoredWorkspaces,
  purgeWorkspace,
  restoreWorkspace,
  trashWorkspace,
} from '../../storage/workspace-trash';

describe('workspace trash', () => {
  it('preserves the whole workspace, switches to a neighbour and restores its position and IDs', () => {
    const config = createDefaultDashboardConfig();
    const original = config.workspaces[1]!;
    const active = { ...config, activeWorkspaceId: original.id };
    const trashed = trashWorkspace(active, original.id, 1234);
    expect(trashed.workspaces).toEqual([config.workspaces[0]]);
    expect(trashed.activeWorkspaceId).toBe(config.workspaces[0]!.id);
    expect(trashed.trashedWorkspaces).toEqual([
      { workspace: original, deletedAt: 1234, originalIndex: 1 },
    ]);
    expect(getStoredWorkspaces(trashed)).toEqual(config.workspaces);
    const restored = restoreWorkspace(trashed, original.id);
    expect(restored.workspaces).toEqual(config.workspaces);
    expect(restored.workspaces[1]).toBe(original);
    expect(restored.activeWorkspaceId).toBe(original.id);
    expect(restored.trashedWorkspaces).toEqual([]);
  });

  it('never trashes the last workspace or creates duplicate trash entries', () => {
    const config = createDefaultDashboardConfig();
    const trashed = trashWorkspace(config, config.workspaces[1]!.id);
    expect(trashWorkspace(trashed, config.workspaces[0]!.id)).toBe(trashed);
    expect(trashWorkspace(trashed, config.workspaces[1]!.id)).toBe(trashed);
    expect(restoreWorkspace(trashed, 'missing')).toBe(trashed);
  });

  it('only permanently removes the requested entry, without changing active workspaces', () => {
    const config = createDefaultDashboardConfig();
    const trashed = trashWorkspace(config, config.workspaces[1]!.id);
    const purged = purgeWorkspace(trashed, config.workspaces[1]!.id);
    expect(purged.workspaces).toBe(trashed.workspaces);
    expect(purged.trashedWorkspaces).toEqual([]);
    expect(purgeWorkspace(config, config.workspaces[0]!.id)).toBe(config);
  });

  it('migrates v9 without losing interface settings or workspace data', () => {
    const current = createDefaultDashboardConfig();
    const legacy = {
      ...current,
      version: 9,
      animationMode: 'off',
      shortcuts: { edit: [] },
    };
    const migrated = migrateDashboardConfig(legacy);
    expect(migrated).toEqual({
      ...legacy,
      version: DASHBOARD_CONFIG_VERSION,
      trashedWorkspaces: [],
    });
    expect(migrated.workspaces).toBe(current.workspaces);
    expect(migrateDashboardConfig(migrated)).toBe(migrated);
  });

  it.each([
    (entry: Record<string, unknown>) => ({ ...entry, deletedAt: -1 }),
    (entry: Record<string, unknown>) => ({ ...entry, deletedAt: NaN }),
    (entry: Record<string, unknown>) => ({ ...entry, originalIndex: 0.5 }),
    (entry: Record<string, unknown>) => ({ ...entry, workspace: null }),
  ])('rejects malformed trash metadata', (change) => {
    const config = createDefaultDashboardConfig();
    const trashed = trashWorkspace(config, config.workspaces[1]!.id);
    expect(() =>
      migrateDashboardConfig({
        ...trashed,
        trashedWorkspaces: [change({ ...trashed.trashedWorkspaces![0] })],
      }),
    ).toThrow(InvalidDashboardConfigError);
  });

  it('rejects duplicate trash IDs and IDs already present in active workspaces', () => {
    const config = createDefaultDashboardConfig();
    const trashed = trashWorkspace(config, config.workspaces[1]!.id);
    const entry = trashed.trashedWorkspaces![0]!;
    expect(() =>
      migrateDashboardConfig({ ...trashed, trashedWorkspaces: [entry, entry] }),
    ).toThrow(InvalidDashboardConfigError);
    expect(() =>
      migrateDashboardConfig({ ...config, trashedWorkspaces: [entry] }),
    ).toThrow(InvalidDashboardConfigError);
  });
});
