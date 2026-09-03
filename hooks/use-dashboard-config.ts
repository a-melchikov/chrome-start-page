import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadDashboardConfig,
  saveDashboardConfig,
} from '../storage/dashboard-storage';
import { cleanupOrphanedWallpaperAssets } from '../storage/wallpaper-assets';
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
  error: string | null;
  isLoading: boolean;
  isWallpaperUpdating: boolean;
  wallpaperError: string | null;
  addWidget: (widget: WidgetConfig) => void;
  clearWallpaperError: () => void;
  flushAppearancePreview: () => void;
  flushWidgetUpdates: () => void;
  previewAppearance: (changes: Partial<AppearanceConfig>) => void;
  removeWallpaper: () => Promise<void>;
  removeWidget: (widgetId: string) => void;
  setLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  setUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
  updateAppearance: (changes: Partial<AppearanceConfig>) => void;
  updateWidget: (widget: WidgetConfig) => void;
  updateWidgetLayouts: (widgets: readonly WidgetConfig[]) => void;
}

const WIDGET_SAVE_DEBOUNCE_MS = 300;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Не удалось загрузить настройки';
}

export function useDashboardConfig(): UseDashboardConfigResult {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWallpaperUpdating, setIsWallpaperUpdating] = useState(false);
  const [wallpaperError, setWallpaperError] = useState<string | null>(null);
  const configRef = useRef<DashboardConfig | null>(null);
  const isMountedRef = useRef(false);
  const pendingAppearanceConfigRef = useRef<DashboardConfig | null>(null);
  const pendingWidgetConfigRef = useRef<DashboardConfig | null>(null);
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
      .then(async (loadedConfig) => {
        if (!isActive) {
          return;
        }

        configRef.current = loadedConfig;
        setConfig(loadedConfig);

        const wallpaper = loadedConfig.appearance.wallpaper;
        const activeAssetId =
          wallpaper.type === 'local' ? wallpaper.assetId : null;

        try {
          await cleanupOrphanedWallpaperAssets(activeAssetId);
        } catch (cleanupError) {
          if (isActive) {
            setWallpaperError(getErrorMessage(cleanupError));
          }
        }
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
    error,
    isLoading,
    isWallpaperUpdating,
    wallpaperError,
    addWidget,
    clearWallpaperError,
    flushAppearancePreview,
    flushWidgetUpdates,
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
