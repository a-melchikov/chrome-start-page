import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadDashboardConfig,
  saveDashboardConfig,
} from '../storage/dashboard-storage';
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
  addWidget: (widget: WidgetConfig) => void;
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
  const configRef = useRef<DashboardConfig | null>(null);
  const isMountedRef = useRef(false);
  const pendingAppearanceConfigRef = useRef<DashboardConfig | null>(null);
  const pendingWidgetConfigRef = useRef<DashboardConfig | null>(null);
  const backupOperationRef = useRef(false);
  const wallpaperOperationRef = useRef(false);
  const widgetSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

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

  const enqueueConfigSave = useCallback(
    (nextConfig: DashboardConfig) => {
      void enqueueStorageOperation(() => saveDashboardConfig(nextConfig)).catch(
        (saveError: unknown) => {
          if (isMountedRef.current) {
            setError(getErrorMessage(saveError));
          }
        },
      );
    },
    [enqueueStorageOperation],
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
    isMountedRef.current = true;

    void loadDashboardConfig()
      .then((loadedConfig) => {
        if (!isActive) {
          return;
        }

        configRef.current = loadedConfig;
        setConfig(loadedConfig);
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

      flushPendingUpdates();
    };
  }, [flushPendingUpdates]);

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

      return enqueueStorageOperation(() => {
        const currentConfig = configRef.current;

        if (!currentConfig) {
          throw new Error('Настройки дашборда ещё не загружены');
        }

        return transaction(currentConfig);
      });
    },
    [enqueueStorageOperation, flushPendingUpdates],
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
        const result = await enqueueStorageOperation(() => {
          const currentConfig = configRef.current;

          if (!currentConfig) {
            throw new Error('Настройки дашборда ещё не загружены');
          }

          return replaceDashboardFromBackup(currentConfig, preparedImport);
        });

        configRef.current = result.config;
        pendingAppearanceConfigRef.current = null;
        pendingWidgetConfigRef.current = null;

        if (isMountedRef.current) {
          setConfig(result.config);
          setError(null);
          setWallpaperError(null);
        }

        return result;
      }),
    [enqueueStorageOperation, flushPendingUpdates, runBackupOperation],
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

      if (!currentConfig) {
        return;
      }

      const nextConfig = update(currentConfig);

      configRef.current = nextConfig;
      setConfig(nextConfig);
      setError(null);

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
    [enqueueConfigSave],
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
      commitConfig((currentConfig) => ({
        ...currentConfig,
        widgets: [...currentConfig.widgets, widget],
      }));
    },
    [commitConfig],
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      commitConfig((currentConfig) => ({
        ...currentConfig,
        widgets: currentConfig.widgets.filter(
          (widget) => widget.id !== widgetId,
        ),
      }));
    },
    [commitConfig],
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
      commitConfig((currentConfig) => ({
        ...currentConfig,
        widgets: [...widgets],
      }));
    },
    [commitConfig],
  );

  return {
    config,
    backupError,
    error,
    isBackupProcessing,
    isLoading,
    isWallpaperUpdating,
    wallpaperError,
    addWidget,
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
