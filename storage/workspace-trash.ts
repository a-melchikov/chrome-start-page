import type { DashboardConfig, WorkspaceConfig } from './schema';

/** Includes the trash so resource cleanup and backups retain recoverable data. */
export function getStoredWorkspaces(
  config: DashboardConfig,
): WorkspaceConfig[] {
  return [
    ...config.workspaces,
    ...(config.trashedWorkspaces ?? []).map((entry) => entry.workspace),
  ];
}

export function trashWorkspace(
  config: DashboardConfig,
  workspaceId: string,
  deletedAt = Date.now(),
): DashboardConfig {
  if (config.workspaces.length <= 1) return config;
  const originalIndex = config.workspaces.findIndex(
    (w) => w.id === workspaceId,
  );
  const workspace = config.workspaces[originalIndex];
  if (!workspace) return config;
  const workspaces = config.workspaces.filter((w) => w.id !== workspaceId);
  return {
    ...config,
    workspaces,
    activeWorkspaceId:
      config.activeWorkspaceId === workspaceId
        ? workspaces[Math.min(originalIndex, workspaces.length - 1)]!.id
        : config.activeWorkspaceId,
    trashedWorkspaces: [
      { workspace, deletedAt, originalIndex },
      ...(config.trashedWorkspaces ?? []),
    ],
  };
}

export function restoreWorkspace(
  config: DashboardConfig,
  workspaceId: string,
): DashboardConfig {
  const entry = config.trashedWorkspaces?.find(
    (w) => w.workspace.id === workspaceId,
  );
  if (!entry || config.workspaces.some((w) => w.id === workspaceId))
    return config;
  const workspaces = [...config.workspaces];
  workspaces.splice(
    Math.min(entry.originalIndex, workspaces.length),
    0,
    entry.workspace,
  );
  return {
    ...config,
    workspaces,
    activeWorkspaceId: workspaceId,
    trashedWorkspaces: config.trashedWorkspaces?.filter((w) => w !== entry),
  };
}

export function purgeWorkspace(
  config: DashboardConfig,
  workspaceId: string,
): DashboardConfig {
  if (!config.trashedWorkspaces?.some((w) => w.workspace.id === workspaceId))
    return config;
  return {
    ...config,
    trashedWorkspaces: config.trashedWorkspaces.filter(
      (w) => w.workspace.id !== workspaceId,
    ),
  };
}
