import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  loadDashboardConfig,
  readStoredDashboardConfig,
  saveDashboardConfig,
  watchDashboardConfig,
  withDashboardWriteLock,
} from '../storage/dashboard-storage';
import {
  cleanupOrphanedImageAssets,
  cleanupUnusedImageAssets,
  collectAllWorkspaceImageAssetIds,
  collectLocalImageAssetIds,
  deleteImageAssets,
  saveHistoryImageLease,
  saveImageAsset,
} from '../storage/image-assets';
import { cleanupUnusedWeatherCaches } from '../storage/weather-cache';

import {
  createDashboardBackup,
  createDashboardBackupFileName,
  prepareDashboardImport,
  replaceDashboardFromBackup,
  serializeDashboardBackup,
  type DashboardBackupDownload,
  type DashboardImportResult,
} from '../storage/dashboard-backup';
import { encodeWallpaperAsset } from '../storage/wallpaper-codec';
import {
  installLocalWallpaper,
  installUrlWallpaper,
  removeWallpaper as removeWallpaperTransaction,
  setWallpaperEnabled as setWallpaperEnabledTransaction,
  type WallpaperTransactionResult,
} from '../storage/wallpaper-transactions';
import { cleanupOrphanedWallpaperAssets } from '../storage/wallpaper-assets';
import {
  getStoredWorkspaces,
  trashWorkspace,
  restoreWorkspace as restoreTrashedWorkspace,
  purgeWorkspace as purgeTrashedWorkspace,
} from '../storage/workspace-trash';
import { DEFAULT_APPEARANCE, DEFAULT_LIQUID_GLASS } from '../storage/defaults';
import type {
  AppearanceConfig,
  InterfacePreferences,
  DashboardConfig,
  ToolbarConfig,
  WidgetConfig,
  WorkspaceConfig,
} from '../storage/schema';
import type { CustomTheme, ThemeRef } from '../themes/types';
import {
  applyWidgetHistoryEntry,
  collectHistoryWidgets,
  createLayoutHistoryEntry,
  WIDGET_HISTORY_LIMIT,
  type WidgetHistoryEntry,
} from '../components/dashboard/widget-history';
import {
  placeWidgetGroup,
  moveWidgetGroup,
  moveWidgetGroupToEdge,
} from '../components/dashboard/dashboard-layout';
import {
  createWidgetClipboardPayload,
  parseWidgetClipboard,
  prepareWidgetCopies,
  serializeWidgetClipboard,
} from '../components/dashboard/widget-clipboard';
import {
  WallpaperValidationAbortedError,
  validateLocalWallpaper,
  validateWallpaperUrl,
} from '../wallpaper/image-validation';

export interface UseDashboardConfigResult {
  config: DashboardConfig | null;
  activeWorkspace: WorkspaceConfig | null;
  activeWorkspaceId: string | null;
  workspaces: readonly WorkspaceConfig[];
  backupError: string | null;
  error: string | null;
  isBackupProcessing: boolean;
  isLoading: boolean;
  isWallpaperUpdating: boolean;
  wallpaperError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  conflict: boolean;
  historyEpoch: number;
  configEpoch: number;
  isWidgetActionProcessing: boolean;
  addWidget: (widget: WidgetConfig) => void;
  copyWidgets: (ids: readonly string[]) => Promise<string>;
  duplicateWidgets: (ids: readonly string[]) => Promise<string[]>;
  pasteWidgets: (source: string) => Promise<string[]>;
  moveWidgets: (
    ids: readonly string[],
    deltaX: number,
    deltaY: number,
    toEdge?: boolean,
    visibleBottomRow?: number,
  ) => void;
  finishNudge: () => void;
  removeWidgets: (ids: readonly string[]) => void;
  undo: () => void;
  redo: () => void;
  resolveConflict: (choice: 'external' | 'mine') => Promise<void>;
  clearBackupError: () => void;
  clearWallpaperError: () => void;
  exportDashboardBackup: () => Promise<DashboardBackupDownload>;
  flushAppearancePreview: () => void;
  flushWidgetUpdates: () => void;
  importDashboardBackup: (
    file: File,
    signal?: AbortSignal,
  ) => Promise<DashboardImportResult>;
  previewAppearance: (changes: Partial<AppearanceConfig>) => void;
  removeWallpaper: () => Promise<void>;
  removeWidget: (widgetId: string) => void;
  setLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  setUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
  setWallpaperEnabled: (enabled: boolean) => Promise<void>;
  updateInterfacePreferences: (changes: Partial<InterfacePreferences>) => void;
  updateToolbar: (toolbar: ToolbarConfig) => void;
  updateAppearance: (changes: Partial<AppearanceConfig>) => void;
  updateWidget: (widget: WidgetConfig) => void;
  updateWidgetLayouts: (widgets: readonly WidgetConfig[]) => void;
  saveCustomTheme: (
    theme: CustomTheme,
    options?: { makeActive?: boolean },
  ) => void;
  deleteCustomTheme: (id: string) => void;
  duplicateCustomTheme: (id: string) => Promise<CustomTheme>;
  selectTheme: (themeRef: ThemeRef) => void;
  switchWorkspace: (workspaceId: string) => void;
  addWorkspace: (name?: string) => void;
  renameWorkspace: (workspaceId: string, name: string) => void;
  duplicateWorkspace: (workspaceId: string) => void;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  restoreWorkspace: (workspaceId: string) => Promise<void>;
  purgeWorkspace: (workspaceId: string) => Promise<void>;
  reorderWorkspaces: (orderedIds: readonly string[]) => void;
}

export const MAX_BACKUP_FILE_BYTES = 32 * 1024 * 1024;
const WIDGET_SAVE_DEBOUNCE_MS = 300;

class DashboardConflictError extends Error {
  constructor() {
    super('Другая вкладка изменила дашборд');
  }
}

function configSnapshot(config: DashboardConfig | null): string {
  return JSON.stringify(config, (_key, value: unknown) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0,
        ),
      );
    }
    return value;
  });
}

function configsEqual(
  left: DashboardConfig | null,
  right: DashboardConfig | null,
) {
  return configSnapshot(left) === configSnapshot(right);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Не удалось загрузить настройки';
}

function generateUniqueThemeName(
  baseName: string,
  existingThemes: readonly CustomTheme[],
): string {
  const isTaken = (name: string) =>
    existingThemes.some(
      (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );

  let candidate = `${baseName} (копия)`.slice(0, 64);
  if (!isTaken(candidate)) {
    return candidate;
  }

  let counter = 2;
  while (counter < 1000) {
    candidate = `${baseName} (копия ${counter})`.slice(0, 64);
    if (!isTaken(candidate)) {
      return candidate;
    }
    counter++;
  }
  return `${baseName} ${Date.now()}`.slice(0, 64);
}

async function readBackupFile(file: File): Promise<string> {
  if (file.size > MAX_BACKUP_FILE_BYTES) {
    throw new Error('Файл резервной копии превышает допустимый размер (32 МБ)');
  }

  try {
    return await file.text();
  } catch {
    throw new Error('Не удалось прочитать файл резервной копии');
  }
}

function getActiveWorkspaceWidgets(
  config: DashboardConfig | null,
): WidgetConfig[] {
  if (!config) return [];
  const targetId = config.activeWorkspaceId;
  const workspace =
    config.workspaces.find((w) => w.id === targetId) ?? config.workspaces[0];
  return workspace ? workspace.widgets : [];
}

function updateActiveWorkspaceInConfig(
  config: DashboardConfig,
  updater: (workspace: WorkspaceConfig) => WorkspaceConfig,
): DashboardConfig {
  const targetId = config.activeWorkspaceId;
  const targetIndex = config.workspaces.findIndex((w) => w.id === targetId);
  const actualIndex = targetIndex >= 0 ? targetIndex : 0;
  if (!config.workspaces[actualIndex]) return config;

  const updatedWorkspace = updater(config.workspaces[actualIndex]);
  return {
    ...config,
    workspaces: config.workspaces.map((w, idx) =>
      idx === actualIndex ? updatedWorkspace : w,
    ),
  };
}

function updateActiveWorkspaceWidgets(
  config: DashboardConfig,
  updater: (widgets: WidgetConfig[]) => WidgetConfig[],
): DashboardConfig {
  return updateActiveWorkspaceInConfig(config, (workspace) => ({
    ...workspace,
    widgets: updater(workspace.widgets),
  }));
}

export function useDashboardConfig(): UseDashboardConfigResult {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBackupProcessing, setIsBackupProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWallpaperUpdating, setIsWallpaperUpdating] = useState(false);
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const [historyAvailability, setHistoryAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });
  const [conflict, setConflict] = useState(false);
  const [historyEpoch, setHistoryEpoch] = useState(0);
  const [configEpoch, setConfigEpoch] = useState(0);
  const [isWidgetActionProcessing, setIsWidgetActionProcessing] =
    useState(false);
  const configRef = useRef<DashboardConfig | null>(null);
  const undoStackRef = useRef<WidgetHistoryEntry[]>([]);
  const redoStackRef = useRef<WidgetHistoryEntry[]>([]);
  const conflictRef = useRef(false);
  const externalConfigRef = useRef<DashboardConfig | null>(null);
  const acceptedConfigRef = useRef<DashboardConfig | null>(null);
  const ownedSnapshotsRef = useRef<Set<string>>(new Set());
  const ownTransactionRef = useRef(false);
  const widgetActionRef = useRef(false);
  const leaseTabIdRef = useRef<string>(crypto.randomUUID());
  const nudgeActiveRef = useRef(false);
  const nudgeSelectionRef = useRef('');
  const isMountedRef = useRef(false);
  const pendingAppearanceConfigRef = useRef<DashboardConfig | null>(null);
  const pendingWidgetConfigRef = useRef<DashboardConfig | null>(null);
  const backupOperationRef = useRef(false);
  const wallpaperOperationRef = useRef(false);
  const widgetSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const activeWorkspace = useMemo(() => {
    if (!config) return null;
    return (
      config.workspaces.find((w) => w.id === config.activeWorkspaceId) ??
      config.workspaces[0] ??
      null
    );
  }, [config]);

  const activeWorkspaceId = activeWorkspace?.id ?? null;
  const workspaces = config?.workspaces ?? [];

  const refreshHistory = useCallback(() => {
    setHistoryAvailability({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  }, []);

  const syncHistoryImageLease = useCallback(
    (snapshot: DashboardConfig | null = configRef.current) => {
      const historyWidgets = [
        ...(snapshot
          ? getStoredWorkspaces(snapshot).flatMap((w) => w.widgets)
          : []),
        ...collectHistoryWidgets(undoStackRef.current),
        ...collectHistoryWidgets(redoStackRef.current),
      ];
      return saveHistoryImageLease(leaseTabIdRef.current, [
        ...collectLocalImageAssetIds(historyWidgets),
      ]);
    },
    [],
  );

  const cleanupHistoryAssets = useCallback(
    (previous: readonly WidgetConfig[]) => {
      const current = configRef.current
        ? getStoredWorkspaces(configRef.current).flatMap((w) => w.widgets)
        : [];
      const retained = [
        ...current,
        ...collectHistoryWidgets(undoStackRef.current),
        ...collectHistoryWidgets(redoStackRef.current),
      ];
      void withDashboardWriteLock(() =>
        cleanupUnusedImageAssets(previous, retained),
      ).catch(() => undefined);
    },
    [],
  );

  const clearHistory = useCallback(() => {
    const previous = [
      ...collectHistoryWidgets(undoStackRef.current),
      ...collectHistoryWidgets(redoStackRef.current),
    ];
    undoStackRef.current = [];
    redoStackRef.current = [];
    nudgeActiveRef.current = false;
    nudgeSelectionRef.current = '';
    refreshHistory();
    setHistoryEpoch((value) => value + 1);
    void syncHistoryImageLease()
      .then(() => cleanupHistoryAssets(previous))
      .catch(() => undefined);
  }, [cleanupHistoryAssets, refreshHistory, syncHistoryImageLease]);

  const pushHistory = useCallback(
    (entry: WidgetHistoryEntry | null) => {
      if (!entry) return;
      nudgeActiveRef.current = false;
      nudgeSelectionRef.current = '';
      const dropped = [
        ...collectHistoryWidgets(redoStackRef.current),
        ...collectHistoryWidgets(
          undoStackRef.current.slice(
            0,
            Math.max(0, undoStackRef.current.length + 1 - WIDGET_HISTORY_LIMIT),
          ),
        ),
      ];
      undoStackRef.current = [...undoStackRef.current, entry].slice(
        -WIDGET_HISTORY_LIMIT,
      );
      redoStackRef.current = [];
      refreshHistory();
      void syncHistoryImageLease()
        .then(() => cleanupHistoryAssets(dropped))
        .catch(() => undefined);
    },
    [cleanupHistoryAssets, refreshHistory, syncHistoryImageLease],
  );

  const enqueueStorageOperation = useCallback(
    <T>(operation: () => Promise<T>): Promise<T> => {
      const result = saveQueueRef.current
        .catch(() => undefined)
        .then(operation);
      saveQueueRef.current = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    [],
  );

  const rememberOwned = useCallback((nextConfig: DashboardConfig) => {
    const snapshots = ownedSnapshotsRef.current;
    snapshots.add(configSnapshot(nextConfig));
    if (snapshots.size > 100) {
      snapshots.delete(snapshots.values().next().value as string);
    }
  }, []);

  const signalConflict = useCallback((external: DashboardConfig) => {
    externalConfigRef.current = external;
    conflictRef.current = true;
    if (isMountedRef.current) setConflict(true);
  }, []);

  const runCheckedWrite = useCallback(
    async <T extends { config: DashboardConfig }>(
      operation: () => Promise<T>,
    ): Promise<T> =>
      withDashboardWriteLock(async () => {
        if (conflictRef.current) throw new DashboardConflictError();
        const latest = await readStoredDashboardConfig();
        if (!configsEqual(latest, acceptedConfigRef.current)) {
          if (latest) signalConflict(latest);
          throw new DashboardConflictError();
        }

        ownTransactionRef.current = true;
        try {
          await syncHistoryImageLease();
          const result = await operation();
          const previous = acceptedConfigRef.current;
          acceptedConfigRef.current = result.config;
          rememberOwned(result.config);
          if (previous) {
            const currentWidgets = getStoredWorkspaces(result.config).flatMap(
              (w) => w.widgets,
            );
            const retained = [
              ...currentWidgets,
              ...collectHistoryWidgets(undoStackRef.current),
              ...collectHistoryWidgets(redoStackRef.current),
            ];
            const previousWidgets = getStoredWorkspaces(previous).flatMap(
              (w) => w.widgets,
            );
            await cleanupUnusedImageAssets(previousWidgets, retained).catch(
              () => undefined,
            );
            await cleanupUnusedWeatherCaches(
              previousWidgets,
              currentWidgets,
            ).catch(() => undefined);
            const wallpaperIds = getStoredWorkspaces(result.config).flatMap(
              (w) =>
                w.appearance.wallpaper.type === 'local'
                  ? [w.appearance.wallpaper.assetId]
                  : [],
            );
            await cleanupOrphanedWallpaperAssets(wallpaperIds).catch(
              () => undefined,
            );
          }
          return result;
        } finally {
          ownTransactionRef.current = false;
        }
      }),
    [rememberOwned, signalConflict, syncHistoryImageLease],
  );

  const enqueueConfigSave = useCallback(
    (nextConfig: DashboardConfig) => {
      void enqueueStorageOperation(() =>
        runCheckedWrite(async () => {
          await saveDashboardConfig(nextConfig);
          return { config: nextConfig };
        }),
      ).catch((saveError: unknown) => {
        if (
          isMountedRef.current &&
          !(saveError instanceof DashboardConflictError)
        ) {
          setError(getErrorMessage(saveError));
        }
      });
    },
    [enqueueStorageOperation, runCheckedWrite],
  );

  const flushWidgetUpdates = useCallback(() => {
    if (widgetSaveTimerRef.current !== null) {
      clearTimeout(widgetSaveTimerRef.current);
      widgetSaveTimerRef.current = null;
    }

    const pendingConfig = pendingWidgetConfigRef.current;
    pendingWidgetConfigRef.current = null;

    if (pendingConfig) {
      if (pendingAppearanceConfigRef.current === pendingConfig) {
        pendingAppearanceConfigRef.current = null;
      }
      enqueueConfigSave(pendingConfig);
    }
  }, [enqueueConfigSave]);

  const flushAppearancePreview = useCallback(() => {
    const pendingConfig = pendingAppearanceConfigRef.current;
    pendingAppearanceConfigRef.current = null;

    if (pendingConfig) {
      if (pendingWidgetConfigRef.current === pendingConfig) {
        pendingWidgetConfigRef.current = null;

        if (widgetSaveTimerRef.current !== null) {
          clearTimeout(widgetSaveTimerRef.current);
          widgetSaveTimerRef.current = null;
        }
      }

      enqueueConfigSave(pendingConfig);
    }
  }, [enqueueConfigSave]);

  const flushPendingUpdates = useCallback(() => {
    flushWidgetUpdates();
    flushAppearancePreview();
  }, [flushAppearancePreview, flushWidgetUpdates]);

  useEffect(() => {
    window.addEventListener('pagehide', flushPendingUpdates);

    return () => window.removeEventListener('pagehide', flushPendingUpdates);
  }, [flushPendingUpdates]);

  useEffect(() => {
    let isActive = true;
    let unwatch: (() => void) | null = null;
    isMountedRef.current = true;

    void browser.tabs
      .getCurrent()
      .then(async (tab) => {
        if (!isActive || tab?.id === undefined) return;
        const previousLeaseId = leaseTabIdRef.current;
        leaseTabIdRef.current = String(tab.id);
        await syncHistoryImageLease();
        await saveHistoryImageLease(previousLeaseId, []);
      })
      .catch(() => undefined);

    void withDashboardWriteLock(loadDashboardConfig)
      .then((loadedConfig) => {
        if (!isActive) {
          return;
        }

        configRef.current = loadedConfig;
        acceptedConfigRef.current = loadedConfig;
        setConfig(loadedConfig);
        void syncHistoryImageLease().catch(() => undefined);
        unwatch = watchDashboardConfig(
          (external) => {
            const snapshot = configSnapshot(external);
            if (
              ownedSnapshotsRef.current.has(snapshot) ||
              ownTransactionRef.current
            )
              return;
            if (configsEqual(external, acceptedConfigRef.current)) return;
            const hasLocalChanges = !configsEqual(
              configRef.current,
              acceptedConfigRef.current,
            );
            if (
              hasLocalChanges ||
              backupOperationRef.current ||
              wallpaperOperationRef.current ||
              widgetActionRef.current
            ) {
              signalConflict(external);
            } else {
              acceptedConfigRef.current = external;
              configRef.current = external;
              setConfig(external);
              setConfigEpoch((epoch) => epoch + 1);
              clearHistory();
            }
          },
          (watchError) => setError(getErrorMessage(watchError)),
        );
        void withDashboardWriteLock(async () => {
          const latest = await readStoredDashboardConfig();
          if (latest) {
            await cleanupOrphanedImageAssets(
              collectAllWorkspaceImageAssetIds(getStoredWorkspaces(latest)),
            );
          }
        }).catch(() => undefined);
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(getErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      isMountedRef.current = false;
      unwatch?.();

      flushPendingUpdates();
      void saveQueueRef.current
        .then(() => saveHistoryImageLease(leaseTabIdRef.current, []))
        .then(() =>
          withDashboardWriteLock(async () => {
            const latest = await readStoredDashboardConfig();
            if (latest)
              await cleanupOrphanedImageAssets(
                collectAllWorkspaceImageAssetIds(getStoredWorkspaces(latest)),
              );
          }),
        )
        .catch(() => undefined);
    };
  }, [
    clearHistory,
    flushPendingUpdates,
    signalConflict,
    syncHistoryImageLease,
  ]);

  const runWallpaperOperation = useCallback(
    async (operation: () => Promise<void>): Promise<void> => {
      if (backupOperationRef.current) {
        throw new Error('Дождитесь завершения операции с резервной копией');
      }

      if (wallpaperOperationRef.current) {
        throw new Error('Операция с обоями уже выполняется');
      }

      wallpaperOperationRef.current = true;

      if (isMountedRef.current) {
        setIsWallpaperUpdating(true);
        setWallpaperError(null);
      }

      try {
        await operation();
      } catch (operationError) {
        if (
          isMountedRef.current &&
          !(operationError instanceof WallpaperValidationAbortedError)
        ) {
          setWallpaperError(getErrorMessage(operationError));
        }

        throw operationError;
      } finally {
        wallpaperOperationRef.current = false;

        if (isMountedRef.current) {
          setIsWallpaperUpdating(false);
        }
      }
    },
    [],
  );

  const enqueueWallpaperTransaction = useCallback(
    (
      transaction: (
        currentConfig: DashboardConfig,
      ) => Promise<WallpaperTransactionResult>,
    ) => {
      flushPendingUpdates();

      return enqueueStorageOperation(() =>
        runCheckedWrite(async () => {
          const currentConfig = configRef.current;

          if (!currentConfig) {
            throw new Error('Настройки дашборда ещё не загружены');
          }

          const result = await transaction(currentConfig);
          configRef.current = result.config;

          if (isMountedRef.current) {
            setConfig(result.config);
            setError(null);
            setWallpaperError(result.warning);
          }

          return result;
        }),
      );
    },
    [enqueueStorageOperation, flushPendingUpdates, runCheckedWrite],
  );

  const setLocalWallpaper = useCallback(
    (file: File, signal?: AbortSignal) =>
      runWallpaperOperation(async () => {
        const { bytes, mimeType } = await validateLocalWallpaper(file, signal);
        const asset = await encodeWallpaperAsset(
          crypto.randomUUID(),
          mimeType,
          bytes,
        );

        await enqueueWallpaperTransaction((currentConfig) =>
          installLocalWallpaper(currentConfig, asset),
        );
      }),
    [enqueueWallpaperTransaction, runWallpaperOperation],
  );

  const setUrlWallpaper = useCallback(
    (url: string, signal?: AbortSignal) =>
      runWallpaperOperation(async () => {
        const validatedUrl = await validateWallpaperUrl(url, signal);
        await enqueueWallpaperTransaction((currentConfig) =>
          installUrlWallpaper(currentConfig, validatedUrl),
        );
      }),
    [enqueueWallpaperTransaction, runWallpaperOperation],
  );

  const removeWallpaper = useCallback(
    () =>
      runWallpaperOperation(async () => {
        await enqueueWallpaperTransaction(removeWallpaperTransaction);
      }),
    [enqueueWallpaperTransaction, runWallpaperOperation],
  );

  const setWallpaperEnabled = useCallback(
    (enabled: boolean) =>
      runWallpaperOperation(async () => {
        await enqueueWallpaperTransaction((currentConfig) =>
          setWallpaperEnabledTransaction(currentConfig, enabled),
        );
      }),
    [enqueueWallpaperTransaction, runWallpaperOperation],
  );

  const clearWallpaperError = useCallback(() => {
    setWallpaperError(null);
  }, []);

  const runBackupOperation = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      if (wallpaperOperationRef.current) {
        throw new Error('Дождитесь завершения операции с обоями');
      }

      if (backupOperationRef.current) {
        throw new Error('Операция с резервной копией уже выполняется');
      }

      backupOperationRef.current = true;

      if (isMountedRef.current) {
        setIsBackupProcessing(true);
        setBackupError(null);
      }

      try {
        return await operation();
      } catch (operationError) {
        if (
          isMountedRef.current &&
          !(operationError instanceof WallpaperValidationAbortedError)
        ) {
          setBackupError(getErrorMessage(operationError));
        }

        throw operationError;
      } finally {
        backupOperationRef.current = false;

        if (isMountedRef.current) {
          setIsBackupProcessing(false);
        }
      }
    },
    [],
  );

  const exportDashboardBackup = useCallback(
    () =>
      runBackupOperation(async () => {
        flushPendingUpdates();

        return enqueueStorageOperation(async () => {
          const currentConfig = configRef.current;

          if (!currentConfig) {
            throw new Error('Настройки дашборда ещё не загружены');
          }

          const backup = await createDashboardBackup(currentConfig);

          return {
            fileName: createDashboardBackupFileName(backup.exportedAt),
            contents: serializeDashboardBackup(backup),
          };
        });
      }),
    [enqueueStorageOperation, flushPendingUpdates, runBackupOperation],
  );

  const importDashboardBackup = useCallback(
    (file: File, signal?: AbortSignal) =>
      runBackupOperation(async () => {
        const source = await readBackupFile(file);
        const preparedImport = await prepareDashboardImport(source, signal);

        if (signal?.aborted) {
          throw new WallpaperValidationAbortedError();
        }

        flushPendingUpdates();
        const result = await enqueueStorageOperation(() =>
          runCheckedWrite(() => {
            const currentConfig = configRef.current;

            if (!currentConfig) {
              throw new Error('Настройки дашборда ещё не загружены');
            }

            return replaceDashboardFromBackup(currentConfig, preparedImport);
          }),
        );

        configRef.current = result.config;
        pendingAppearanceConfigRef.current = null;
        pendingWidgetConfigRef.current = null;
        clearHistory();

        if (isMountedRef.current) {
          setConfig(result.config);
          setConfigEpoch((epoch) => epoch + 1);
          setError(null);
          setWallpaperError(null);
        }

        return result;
      }),
    [
      clearHistory,
      enqueueStorageOperation,
      flushPendingUpdates,
      runBackupOperation,
      runCheckedWrite,
    ],
  );

  const clearBackupError = useCallback(() => {
    setBackupError(null);
  }, []);

  const commitConfig = useCallback(
    (
      update: (currentConfig: DashboardConfig) => DashboardConfig,
      persistence: 'immediate' | 'debounced' = 'immediate',
    ) => {
      const currentConfig = configRef.current;

      if (!currentConfig || conflictRef.current || widgetActionRef.current) {
        return;
      }

      const nextConfig = update(currentConfig);

      configRef.current = nextConfig;
      setConfig(nextConfig);
      setError(null);
      void syncHistoryImageLease().catch((leaseError: unknown) => {
        if (isMountedRef.current) setError(getErrorMessage(leaseError));
      });

      if (persistence === 'debounced') {
        pendingWidgetConfigRef.current = nextConfig;
        if (pendingAppearanceConfigRef.current) {
          pendingAppearanceConfigRef.current = nextConfig;
        }

        if (widgetSaveTimerRef.current !== null) {
          clearTimeout(widgetSaveTimerRef.current);
        }

        widgetSaveTimerRef.current = setTimeout(() => {
          widgetSaveTimerRef.current = null;
          const pendingConfig = pendingWidgetConfigRef.current;
          pendingWidgetConfigRef.current = null;

          if (pendingConfig) {
            enqueueConfigSave(pendingConfig);
          }
        }, WIDGET_SAVE_DEBOUNCE_MS);
        return;
      }

      if (widgetSaveTimerRef.current !== null) {
        clearTimeout(widgetSaveTimerRef.current);
        widgetSaveTimerRef.current = null;
      }

      pendingWidgetConfigRef.current = null;
      pendingAppearanceConfigRef.current = null;
      enqueueConfigSave(nextConfig);
    },
    [enqueueConfigSave, syncHistoryImageLease],
  );

  const updateInterfacePreferences = useCallback(
    (changes: Partial<InterfacePreferences>) => {
      commitConfig((current) => ({ ...current, ...changes }));
    },
    [commitConfig],
  );

  const updateToolbar = useCallback(
    (toolbar: ToolbarConfig) => {
      if (configRef.current?.toolbar.mode === toolbar.mode) return;
      commitConfig((current) => ({ ...current, toolbar: { ...toolbar } }));
    },
    [commitConfig],
  );

  const updateAppearance = useCallback(
    (changes: Partial<AppearanceConfig>) => {
      commitConfig((currentConfig) =>
        updateActiveWorkspaceInConfig(currentConfig, (workspace) => ({
          ...workspace,
          appearance: {
            ...workspace.appearance,
            ...changes,
          },
        })),
      );
    },
    [commitConfig],
  );

  const previewAppearance = useCallback(
    (changes: Partial<AppearanceConfig>) => {
      const currentConfig = configRef.current;

      if (!currentConfig) {
        return;
      }

      const nextConfig = updateActiveWorkspaceInConfig(
        currentConfig,
        (workspace) => ({
          ...workspace,
          appearance: {
            ...workspace.appearance,
            ...changes,
          },
        }),
      );

      configRef.current = nextConfig;
      pendingAppearanceConfigRef.current = nextConfig;
      if (pendingWidgetConfigRef.current) {
        pendingWidgetConfigRef.current = nextConfig;
      }
      setConfig(nextConfig);
      setError(null);
    },
    [],
  );

  const selectTheme = useCallback(
    (themeRef: ThemeRef) => {
      commitConfig((currentConfig) =>
        updateActiveWorkspaceInConfig(currentConfig, (workspace) => ({
          ...workspace,
          appearance: {
            ...workspace.appearance,
            theme: themeRef,
            backgroundColor: { type: 'theme' },
          },
        })),
      );
    },
    [commitConfig],
  );

  const saveCustomTheme = useCallback(
    (theme: CustomTheme, options?: { makeActive?: boolean }) => {
      commitConfig((currentConfig) => {
        const existingIndex = currentConfig.customThemes.findIndex(
          (t) => t.id === theme.id,
        );
        let nextThemes: CustomTheme[];
        if (existingIndex >= 0) {
          nextThemes = currentConfig.customThemes.map((t, idx) =>
            idx === existingIndex ? theme : t,
          );
        } else {
          nextThemes = [...currentConfig.customThemes, theme];
        }

        const shouldActivate = options?.makeActive ?? false;
        let nextConfig: DashboardConfig = {
          ...currentConfig,
          customThemes: nextThemes,
        };

        if (shouldActivate) {
          nextConfig = updateActiveWorkspaceInConfig(
            nextConfig,
            (workspace) => ({
              ...workspace,
              appearance: {
                ...workspace.appearance,
                theme: { type: 'custom', id: theme.id },
                backgroundColor: { type: 'theme' },
              },
            }),
          );
        }

        return nextConfig;
      });
    },
    [commitConfig],
  );

  const deleteCustomTheme = useCallback(
    (id: string) => {
      const resetTheme = (workspace: WorkspaceConfig): WorkspaceConfig =>
        workspace.appearance.theme.type === 'custom' &&
        workspace.appearance.theme.id === id
          ? {
              ...workspace,
              appearance: {
                ...workspace.appearance,
                theme: { type: 'builtin', id: 'system' },
                backgroundColor: { type: 'theme' },
              },
            }
          : workspace;
      commitConfig((currentConfig) => ({
        ...currentConfig,
        customThemes: currentConfig.customThemes.filter((t) => t.id !== id),
        workspaces: currentConfig.workspaces.map(resetTheme),
        trashedWorkspaces: currentConfig.trashedWorkspaces?.map((entry) => ({
          ...entry,
          workspace: resetTheme(entry.workspace),
        })),
      }));
    },
    [commitConfig],
  );

  const duplicateCustomTheme = useCallback(
    async (id: string): Promise<CustomTheme> => {
      const currentConfig = configRef.current;
      if (!currentConfig) {
        throw new Error('Настройки дашборда ещё не загружены');
      }
      const original = currentConfig.customThemes.find((t) => t.id === id);
      if (!original) {
        throw new Error('Тема для копирования не найдена');
      }

      const newId = crypto.randomUUID();
      const newName = generateUniqueThemeName(
        original.name,
        currentConfig.customThemes,
      );
      const copy: CustomTheme = {
        ...original,
        id: newId,
        name: newName,
        colors: { ...original.colors },
        manualOverrides: [...original.manualOverrides],
      };

      commitConfig((config) => {
        const next = {
          ...config,
          customThemes: [...config.customThemes, copy],
        };
        return updateActiveWorkspaceInConfig(next, (workspace) => ({
          ...workspace,
          appearance: {
            ...workspace.appearance,
            theme: { type: 'custom', id: newId },
            backgroundColor: { type: 'theme' },
          },
        }));
      });

      return copy;
    },
    [commitConfig],
  );

  const addWidget = useCallback(
    (widget: WidgetConfig) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;
      const currentWidgets = getActiveWorkspaceWidgets(currentConfig);
      pushHistory({
        kind: 'insert',
        items: [{ widget, index: currentWidgets.length }],
      });
      commitConfig((config) =>
        updateActiveWorkspaceWidgets(config, (widgets) => [...widgets, widget]),
      );
    },
    [commitConfig, pushHistory],
  );

  const removeWidgets = useCallback(
    (widgetIds: readonly string[]) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;
      const ids = new Set(widgetIds);
      const currentWidgets = getActiveWorkspaceWidgets(currentConfig);
      const items = currentWidgets.flatMap((widget, index) =>
        ids.has(widget.id) ? [{ widget, index }] : [],
      );
      if (items.length === 0) return;
      pushHistory({ kind: 'remove', items });
      commitConfig((config) =>
        updateActiveWorkspaceWidgets(config, (widgets) =>
          widgets.filter((widget) => !ids.has(widget.id)),
        ),
      );
    },
    [commitConfig, pushHistory],
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      removeWidgets([widgetId]);
    },
    [removeWidgets],
  );

  const updateWidget = useCallback(
    (widget: WidgetConfig) => {
      commitConfig(
        (config) =>
          updateActiveWorkspaceWidgets(config, (widgets) =>
            widgets.map((w) => (w.id === widget.id ? widget : w)),
          ),
        'debounced',
      );
    },
    [commitConfig],
  );

  const updateWidgetLayouts = useCallback(
    (widgets: readonly WidgetConfig[]) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;
      const currentWidgets = getActiveWorkspaceWidgets(currentConfig);
      const incomingLayouts = new Map(
        widgets.map((widget) => [widget.id, widget.layout]),
      );
      const nextWidgets = currentWidgets.map((widget) => {
        const layout = incomingLayouts.get(widget.id);
        return layout ? { ...widget, layout } : widget;
      });
      const entry = createLayoutHistoryEntry(currentWidgets, nextWidgets);
      if (!entry) return;
      pushHistory(entry);
      commitConfig((config) =>
        updateActiveWorkspaceWidgets(config, () => nextWidgets),
      );
    },
    [commitConfig, pushHistory],
  );

  const moveWidgets = useCallback(
    (
      ids: readonly string[],
      deltaX: number,
      deltaY: number,
      toEdge = false,
      visibleBottomRow?: number,
    ) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;
      const currentWidgets = getActiveWorkspaceWidgets(currentConfig);
      const selectedIds = new Set(ids);
      const nextWidgets = toEdge
        ? moveWidgetGroupToEdge(
            currentWidgets,
            selectedIds,
            deltaX,
            deltaY,
            visibleBottomRow,
          )
        : moveWidgetGroup(currentWidgets, selectedIds, deltaX, deltaY);
      if (nextWidgets === currentWidgets) return;
      const entry = createLayoutHistoryEntry(currentWidgets, nextWidgets);
      if (!entry || entry.kind !== 'layout') return;
      const selectionKey = [...ids].sort().join('\u0000');
      const previous = undoStackRef.current.at(-1);
      if (
        nudgeActiveRef.current &&
        nudgeSelectionRef.current === selectionKey &&
        previous?.kind === 'layout'
      ) {
        undoStackRef.current[undoStackRef.current.length - 1] = {
          kind: 'layout',
          before: previous.before,
          after: new Map([...previous.after, ...entry.after]),
        };
        refreshHistory();
      } else {
        pushHistory(entry);
      }
      nudgeActiveRef.current = true;
      nudgeSelectionRef.current = selectionKey;
      commitConfig((config) =>
        updateActiveWorkspaceWidgets(config, () => [...nextWidgets]),
      );
    },
    [commitConfig, pushHistory, refreshHistory],
  );

  const finishNudge = useCallback(() => {
    nudgeActiveRef.current = false;
    nudgeSelectionRef.current = '';
  }, []);

  const travelHistory = useCallback(
    (direction: 'undo' | 'redo') => {
      if (conflictRef.current || widgetActionRef.current) return;
      const from =
        direction === 'undo' ? undoStackRef.current : redoStackRef.current;
      const to =
        direction === 'undo' ? redoStackRef.current : undoStackRef.current;
      const entry = from.at(-1);
      const currentConfig = configRef.current;
      if (!entry || !currentConfig) return;
      const currentWidgets = getActiveWorkspaceWidgets(currentConfig);
      const result = applyWidgetHistoryEntry(currentWidgets, entry, direction);
      from.pop();
      to.push(result.entry);
      refreshHistory();
      commitConfig((config) =>
        updateActiveWorkspaceWidgets(config, () => result.widgets),
      );
      cleanupHistoryAssets(
        entry.kind === 'layout' ? [] : entry.items.map(({ widget }) => widget),
      );
    },
    [cleanupHistoryAssets, commitConfig, refreshHistory],
  );

  const undo = useCallback(() => travelHistory('undo'), [travelHistory]);
  const redo = useCallback(() => travelHistory('redo'), [travelHistory]);

  const copyWidgets = useCallback(async (ids: readonly string[]) => {
    const currentConfig = configRef.current;
    if (!currentConfig) throw new Error('Настройки дашборда ещё не загружены');
    const selected = new Set(ids);
    const currentWidgets = getActiveWorkspaceWidgets(currentConfig);
    const widgets = currentWidgets.filter((widget) => selected.has(widget.id));
    if (widgets.length === 0)
      throw new Error('Выберите виджеты для копирования');
    return serializeWidgetClipboard(
      await createWidgetClipboardPayload(widgets),
    );
  }, []);

  const installCopies = useCallback(
    async (
      sourceWidgets: readonly WidgetConfig[],
      localImages: readonly import('../storage/wallpaper-codec').LocalWallpaperAssetV1[],
    ): Promise<string[]> => {
      if (widgetActionRef.current || conflictRef.current) return [];
      widgetActionRef.current = true;
      setIsWidgetActionProcessing(true);
      const savedAssetIds: string[] = [];
      try {
        const result = await enqueueStorageOperation(() =>
          runCheckedWrite(async () => {
            const currentConfig = configRef.current;
            if (!currentConfig)
              throw new Error('Настройки дашборда ещё не загружены');
            const currentWidgets = getActiveWorkspaceWidgets(currentConfig);
            const placed = placeWidgetGroup(currentWidgets, sourceWidgets);
            const nextConfig = updateActiveWorkspaceWidgets(
              currentConfig,
              (widgets) => [...widgets, ...placed],
            );
            try {
              for (const asset of localImages) {
                await saveImageAsset(asset);
                savedAssetIds.push(asset.assetId);
              }
              await saveDashboardConfig(nextConfig);
            } catch (error) {
              await deleteImageAssets(savedAssetIds).catch(() => undefined);
              throw error;
            }
            return { config: nextConfig, widgets: placed };
          }),
        );
        configRef.current = result.config;
        setConfig(result.config);
        setError(null);
        const activeWidgets = getActiveWorkspaceWidgets(result.config);
        pushHistory({
          kind: 'insert',
          items: result.widgets.map((widget, index) => ({
            widget,
            index: activeWidgets.length - result.widgets.length + index,
          })),
        });
        return result.widgets.map((widget) => widget.id);
      } catch (actionError) {
        setError(getErrorMessage(actionError));
        throw actionError;
      } finally {
        widgetActionRef.current = false;
        setIsWidgetActionProcessing(false);
      }
    },
    [enqueueStorageOperation, pushHistory, runCheckedWrite],
  );

  const duplicateWidgets = useCallback(
    async (ids: readonly string[]) => {
      const currentConfig = configRef.current;
      if (!currentConfig)
        throw new Error('Настройки дашборда ещё не загружены');
      const selected = new Set(ids);
      const currentWidgets = getActiveWorkspaceWidgets(currentConfig);
      const widgets = currentWidgets.filter((widget) =>
        selected.has(widget.id),
      );
      if (widgets.length === 0) return [];
      const payload = await createWidgetClipboardPayload(widgets);
      const copies = await prepareWidgetCopies(payload);
      return installCopies(copies.widgets, copies.localImages);
    },
    [installCopies],
  );

  const pasteWidgets = useCallback(
    async (source: string) => {
      const payload = parseWidgetClipboard(source);
      const copies = await prepareWidgetCopies(payload);
      return installCopies(copies.widgets, copies.localImages);
    },
    [installCopies],
  );

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const currentConfig = configRef.current;
      if (
        !currentConfig ||
        currentConfig.activeWorkspaceId === workspaceId ||
        conflictRef.current ||
        widgetActionRef.current
      ) {
        return;
      }

      const targetExists = currentConfig.workspaces.some(
        (w) => w.id === workspaceId,
      );
      if (!targetExists) return;

      flushPendingUpdates();
      clearHistory();

      commitConfig((config) => ({
        ...config,
        activeWorkspaceId: workspaceId,
      }));
    },
    [clearHistory, commitConfig, flushPendingUpdates],
  );

  const addWorkspace = useCallback(
    (name?: string) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;

      flushPendingUpdates();
      clearHistory();

      const newId = crypto.randomUUID();
      const newName =
        name?.trim() || `Пространство ${currentConfig.workspaces.length + 1}`;

      const newWorkspace: WorkspaceConfig = {
        id: newId,
        name: newName.slice(0, 64),
        appearance: {
          ...DEFAULT_APPEARANCE,
          theme: { ...DEFAULT_APPEARANCE.theme },
          backgroundColor: { ...DEFAULT_APPEARANCE.backgroundColor },
          wallpaper: { ...DEFAULT_APPEARANCE.wallpaper },
          liquidGlass: { ...DEFAULT_LIQUID_GLASS },
        },
        widgets: [],
      };

      commitConfig((config) => ({
        ...config,
        activeWorkspaceId: newId,
        workspaces: [...config.workspaces, newWorkspace],
      }));
    },
    [clearHistory, commitConfig, flushPendingUpdates],
  );

  const renameWorkspace = useCallback(
    (workspaceId: string, name: string) => {
      const trimmed = name.trim().slice(0, 64);
      if (!trimmed) return;

      commitConfig((config) => ({
        ...config,
        workspaces: config.workspaces.map((w) =>
          w.id === workspaceId ? { ...w, name: trimmed } : w,
        ),
      }));
    },
    [commitConfig],
  );

  const duplicateWorkspace = useCallback(
    (workspaceId: string) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;

      const original = currentConfig.workspaces.find(
        (w) => w.id === workspaceId,
      );
      if (!original) return;

      flushPendingUpdates();
      clearHistory();

      const newId = crypto.randomUUID();
      const newName = `${original.name} (копия)`.slice(0, 64);
      const duplicatedWidgets = original.widgets.map((widget) => ({
        ...widget,
        id: crypto.randomUUID(),
      }));

      const copy: WorkspaceConfig = {
        id: newId,
        name: newName,
        appearance: {
          ...original.appearance,
          theme: { ...original.appearance.theme },
          backgroundColor: { ...original.appearance.backgroundColor },
          wallpaper: { ...original.appearance.wallpaper },
          liquidGlass: { ...original.appearance.liquidGlass },
        },
        widgets: duplicatedWidgets,
      };

      const originalIndex = currentConfig.workspaces.findIndex(
        (w) => w.id === workspaceId,
      );
      const nextWorkspaces = [...currentConfig.workspaces];
      nextWorkspaces.splice(originalIndex + 1, 0, copy);

      commitConfig((config) => ({
        ...config,
        activeWorkspaceId: newId,
        workspaces: nextWorkspaces,
      }));
    },
    [clearHistory, commitConfig, flushPendingUpdates],
  );

  const runWorkspaceTrashAction = useCallback(
    async (update: (current: DashboardConfig) => DashboardConfig) => {
      if (
        widgetActionRef.current ||
        conflictRef.current ||
        backupOperationRef.current ||
        wallpaperOperationRef.current
      ) {
        throw new Error('Дождитесь завершения текущей операции');
      }
      flushPendingUpdates();
      widgetActionRef.current = true;
      setIsWidgetActionProcessing(true);
      try {
        const result = await enqueueStorageOperation(() =>
          runCheckedWrite(async () => {
            const current = configRef.current;
            if (!current)
              throw new Error('Настройки дашборда ещё не загружены');
            const next = update(current);
            if (next !== current) {
              await saveDashboardConfig(next);
              await syncHistoryImageLease(next).catch(() => undefined);
            }
            return { config: next };
          }),
        );
        const switched =
          configRef.current?.activeWorkspaceId !==
          result.config.activeWorkspaceId;
        configRef.current = result.config;
        if (isMountedRef.current) {
          setConfig(result.config);
          setError(null);
          if (switched) clearHistory();
        }
      } catch (actionError) {
        if (
          isMountedRef.current &&
          !(actionError instanceof DashboardConflictError)
        )
          setError(getErrorMessage(actionError));
        throw actionError;
      } finally {
        widgetActionRef.current = false;
        if (isMountedRef.current) setIsWidgetActionProcessing(false);
      }
    },
    [
      clearHistory,
      enqueueStorageOperation,
      flushPendingUpdates,
      runCheckedWrite,
      syncHistoryImageLease,
    ],
  );

  const deleteWorkspace = useCallback(
    (workspaceId: string) =>
      runWorkspaceTrashAction((current) =>
        trashWorkspace(current, workspaceId),
      ),
    [runWorkspaceTrashAction],
  );
  const restoreWorkspace = useCallback(
    (workspaceId: string) =>
      runWorkspaceTrashAction((current) =>
        restoreTrashedWorkspace(current, workspaceId),
      ),
    [runWorkspaceTrashAction],
  );
  const purgeWorkspace = useCallback(
    (workspaceId: string) =>
      runWorkspaceTrashAction((current) =>
        purgeTrashedWorkspace(current, workspaceId),
      ),
    [runWorkspaceTrashAction],
  );

  const reorderWorkspaces = useCallback(
    (orderedIds: readonly string[]) => {
      commitConfig((config) => {
        const workspaceMap = new Map(config.workspaces.map((w) => [w.id, w]));
        const reordered: WorkspaceConfig[] = [];
        for (const id of orderedIds) {
          const item = workspaceMap.get(id);
          if (item) {
            reordered.push(item);
            workspaceMap.delete(id);
          }
        }
        for (const remaining of workspaceMap.values()) {
          reordered.push(remaining);
        }
        return {
          ...config,
          workspaces: reordered,
        };
      });
    },
    [commitConfig],
  );

  const resolveConflict = useCallback(
    async (choice: 'external' | 'mine') => {
      if (!conflictRef.current) return;
      if (widgetSaveTimerRef.current !== null) {
        clearTimeout(widgetSaveTimerRef.current);
        widgetSaveTimerRef.current = null;
      }
      pendingWidgetConfigRef.current = null;
      pendingAppearanceConfigRef.current = null;

      try {
        const resolved = await enqueueStorageOperation(() =>
          withDashboardWriteLock(async () => {
            if (choice === 'external') {
              const latest = await readStoredDashboardConfig();
              if (!latest)
                throw new Error(
                  'Не удалось загрузить изменения другой вкладки',
                );
              return latest;
            }

            const mine = configRef.current;
            if (!mine) throw new Error('Настройки дашборда ещё не загружены');
            ownTransactionRef.current = true;
            try {
              await saveDashboardConfig(mine);
              rememberOwned(mine);
              return mine;
            } finally {
              ownTransactionRef.current = false;
            }
          }),
        );

        configRef.current = resolved;
        acceptedConfigRef.current = resolved;
        externalConfigRef.current = null;
        conflictRef.current = false;
        setConfig(resolved);
        setConfigEpoch((epoch) => epoch + 1);
        setConflict(false);
        setError(null);
        clearHistory();
        void withDashboardWriteLock(() =>
          cleanupOrphanedImageAssets(
            collectAllWorkspaceImageAssetIds(getStoredWorkspaces(resolved)),
          ),
        ).catch(() => undefined);
      } catch (resolutionError) {
        setError(getErrorMessage(resolutionError));
        throw resolutionError;
      }
    },
    [clearHistory, enqueueStorageOperation, rememberOwned],
  );

  return {
    config,
    activeWorkspace,
    activeWorkspaceId,
    workspaces,
    backupError,
    error,
    isBackupProcessing,
    isLoading,
    isWallpaperUpdating,
    wallpaperError,
    canUndo: historyAvailability.canUndo,
    canRedo: historyAvailability.canRedo,
    conflict,
    historyEpoch,
    configEpoch,
    isWidgetActionProcessing,
    addWidget,
    copyWidgets,
    duplicateWidgets,
    pasteWidgets,
    moveWidgets,
    finishNudge,
    removeWidgets,
    undo,
    redo,
    resolveConflict,
    clearBackupError,
    clearWallpaperError,
    exportDashboardBackup,
    flushAppearancePreview,
    flushWidgetUpdates,
    importDashboardBackup,
    previewAppearance,
    removeWallpaper,
    removeWidget,
    setLocalWallpaper,
    setUrlWallpaper,
    setWallpaperEnabled,
    updateAppearance,
    updateToolbar,
    updateInterfacePreferences,
    updateWidget,
    updateWidgetLayouts,
    saveCustomTheme,
    deleteCustomTheme,
    duplicateCustomTheme,
    selectTheme,
    switchWorkspace,
    addWorkspace,
    renameWorkspace,
    duplicateWorkspace,
    deleteWorkspace,
    restoreWorkspace,
    purgeWorkspace,
    reorderWorkspaces,
  };
}
