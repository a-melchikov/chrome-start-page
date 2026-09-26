import { useCallback, useEffect, useRef, useState } from 'react';
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
  type WallpaperTransactionResult,
} from '../storage/wallpaper-transactions';
import type {
  AppearanceConfig,
  DashboardConfig,
  WidgetConfig,
} from '../storage/schema';
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

interface UseDashboardConfigResult {
  config: DashboardConfig | null;
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
  isWidgetActionProcessing: boolean;
  addWidget: (widget: WidgetConfig) => void;
  copyWidgets: (ids: readonly string[]) => Promise<string>;
  duplicateWidgets: (ids: readonly string[]) => Promise<string[]>;
  pasteWidgets: (source: string) => Promise<string[]>;
  moveWidgets: (ids: readonly string[], deltaX: number, deltaY: number) => void;
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
  updateAppearance: (changes: Partial<AppearanceConfig>) => void;
  updateWidget: (widget: WidgetConfig) => void;
  updateWidgetLayouts: (widgets: readonly WidgetConfig[]) => void;
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

  const refreshHistory = useCallback(() => {
    setHistoryAvailability({
      canUndo: undoStackRef.current.length > 0,
      canRedo: redoStackRef.current.length > 0,
    });
  }, []);

  const syncHistoryImageLease = useCallback(() => {
    const historyWidgets = [
      ...(configRef.current?.widgets ?? []),
      ...collectHistoryWidgets(undoStackRef.current),
      ...collectHistoryWidgets(redoStackRef.current),
    ];
    return saveHistoryImageLease(leaseTabIdRef.current, [
      ...collectLocalImageAssetIds(historyWidgets),
    ]);
  }, []);

  const cleanupHistoryAssets = useCallback(
    (previous: readonly WidgetConfig[]) => {
      const current = configRef.current?.widgets ?? [];
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
            const retained = [
              ...result.config.widgets,
              ...collectHistoryWidgets(undoStackRef.current),
              ...collectHistoryWidgets(redoStackRef.current),
            ];
            await cleanupUnusedImageAssets(previous.widgets, retained).catch(
              () => undefined,
            );
            await cleanupUnusedWeatherCaches(
              previous.widgets,
              result.config.widgets,
            ).catch(() => undefined);
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
              clearHistory();
            }
          },
          (watchError) => setError(getErrorMessage(watchError)),
        );
        void withDashboardWriteLock(async () => {
          const latest = await readStoredDashboardConfig();
          if (latest) {
            await cleanupOrphanedImageAssets(
              collectLocalImageAssetIds(latest.widgets),
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
                collectLocalImageAssetIds(latest.widgets),
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
    async (
      operation: () => Promise<WallpaperTransactionResult>,
    ): Promise<void> => {
      if (backupOperationRef.current) {
        throw new Error('Операция с резервной копией уже выполняется');
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
        const result = await operation();
        configRef.current = result.config;

        if (isMountedRef.current) {
          setConfig(result.config);
          setError(null);
          setWallpaperError(result.warning);
        }
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
        runCheckedWrite(() => {
          const currentConfig = configRef.current;

          if (!currentConfig) {
            throw new Error('Настройки дашборда ещё не загружены');
          }

          return transaction(currentConfig);
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

        return enqueueWallpaperTransaction((currentConfig) =>
          installLocalWallpaper(currentConfig, asset),
        );
      }),
    [enqueueWallpaperTransaction, runWallpaperOperation],
  );

  const setUrlWallpaper = useCallback(
    (url: string, signal?: AbortSignal) =>
      runWallpaperOperation(async () => {
        const validatedUrl = await validateWallpaperUrl(url, signal);
        return enqueueWallpaperTransaction((currentConfig) =>
          installUrlWallpaper(currentConfig, validatedUrl),
        );
      }),
    [enqueueWallpaperTransaction, runWallpaperOperation],
  );

  const removeWallpaper = useCallback(
    () =>
      runWallpaperOperation(() =>
        enqueueWallpaperTransaction(removeWallpaperTransaction),
      ),
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

  const updateAppearance = useCallback(
    (changes: Partial<AppearanceConfig>) => {
      commitConfig((currentConfig) => ({
        ...currentConfig,
        appearance: {
          ...currentConfig.appearance,
          ...changes,
        },
      }));
    },
    [commitConfig],
  );

  const previewAppearance = useCallback(
    (changes: Partial<AppearanceConfig>) => {
      const currentConfig = configRef.current;

      if (!currentConfig) {
        return;
      }

      const nextConfig = {
        ...currentConfig,
        appearance: {
          ...currentConfig.appearance,
          ...changes,
        },
      };

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

  const addWidget = useCallback(
    (widget: WidgetConfig) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;
      pushHistory({
        kind: 'insert',
        items: [{ widget, index: currentConfig.widgets.length }],
      });
      commitConfig((currentConfig) => ({
        ...currentConfig,
        widgets: [...currentConfig.widgets, widget],
      }));
    },
    [commitConfig, pushHistory],
  );

  const removeWidgets = useCallback(
    (widgetIds: readonly string[]) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;
      const ids = new Set(widgetIds);
      const items = currentConfig.widgets.flatMap((widget, index) =>
        ids.has(widget.id) ? [{ widget, index }] : [],
      );
      if (items.length === 0) return;
      pushHistory({ kind: 'remove', items });
      commitConfig((currentConfig) => ({
        ...currentConfig,
        widgets: currentConfig.widgets.filter((widget) => !ids.has(widget.id)),
      }));
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
        (currentConfig) => ({
          ...currentConfig,
          widgets: currentConfig.widgets.map((currentWidget) =>
            currentWidget.id === widget.id ? widget : currentWidget,
          ),
        }),
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
      const incomingLayouts = new Map(
        widgets.map((widget) => [widget.id, widget.layout]),
      );
      const nextWidgets = currentConfig.widgets.map((widget) => {
        const layout = incomingLayouts.get(widget.id);
        return layout ? { ...widget, layout } : widget;
      });
      const entry = createLayoutHistoryEntry(
        currentConfig.widgets,
        nextWidgets,
      );
      if (!entry) return;
      pushHistory(entry);
      commitConfig((currentConfig) => ({
        ...currentConfig,
        widgets: nextWidgets,
      }));
    },
    [commitConfig, pushHistory],
  );

  const moveWidgets = useCallback(
    (ids: readonly string[], deltaX: number, deltaY: number) => {
      const currentConfig = configRef.current;
      if (!currentConfig || conflictRef.current || widgetActionRef.current)
        return;
      const nextWidgets = moveWidgetGroup(
        currentConfig.widgets,
        new Set(ids),
        deltaX,
        deltaY,
      );
      if (nextWidgets === currentConfig.widgets) return;
      const entry = createLayoutHistoryEntry(
        currentConfig.widgets,
        nextWidgets,
      );
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
      commitConfig((config) => ({ ...config, widgets: [...nextWidgets] }));
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
      const result = applyWidgetHistoryEntry(
        currentConfig.widgets,
        entry,
        direction,
      );
      from.pop();
      to.push(result.entry);
      refreshHistory();
      commitConfig((config) => ({ ...config, widgets: result.widgets }));
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
    const widgets = currentConfig.widgets.filter((widget) =>
      selected.has(widget.id),
    );
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
            const widgets = placeWidgetGroup(
              currentConfig.widgets,
              sourceWidgets,
            );
            const nextConfig = {
              ...currentConfig,
              widgets: [...currentConfig.widgets, ...widgets],
            };
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
            return { config: nextConfig, widgets };
          }),
        );
        configRef.current = result.config;
        setConfig(result.config);
        setError(null);
        pushHistory({
          kind: 'insert',
          items: result.widgets.map((widget, index) => ({
            widget,
            index: result.config.widgets.length - result.widgets.length + index,
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
      const widgets = currentConfig.widgets.filter((widget) =>
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
        setConflict(false);
        setError(null);
        clearHistory();
        void withDashboardWriteLock(() =>
          cleanupOrphanedImageAssets(
            collectLocalImageAssetIds(resolved.widgets),
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
    updateAppearance,
    updateWidget,
    updateWidgetLayouts,
  };
}
