import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadDashboardConfig,
  saveDashboardConfig,
} from '../storage/dashboard-storage';
import type {
  AppearanceConfig,
  DashboardConfig,
  WidgetConfig,
} from '../storage/schema';

interface UseDashboardConfigResult {
  config: DashboardConfig | null;
  error: string | null;
  isLoading: boolean;
  addWidget: (widget: WidgetConfig) => void;
  flushWidgetUpdates: () => void;
  removeWidget: (widgetId: string) => void;
  updateAppearance: (changes: Partial<AppearanceConfig>) => void;
  updateWidget: (widget: WidgetConfig) => void;
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
  const configRef = useRef<DashboardConfig | null>(null);
  const isMountedRef = useRef(false);
  const pendingWidgetConfigRef = useRef<DashboardConfig | null>(null);
  const widgetSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueConfigSave = useCallback((nextConfig: DashboardConfig) => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => saveDashboardConfig(nextConfig))
      .catch((saveError: unknown) => {
        if (isMountedRef.current) {
          setError(getErrorMessage(saveError));
        }
      });
  }, []);

  const flushWidgetUpdates = useCallback(() => {
    if (widgetSaveTimerRef.current !== null) {
      clearTimeout(widgetSaveTimerRef.current);
      widgetSaveTimerRef.current = null;
    }

    const pendingConfig = pendingWidgetConfigRef.current;
    pendingWidgetConfigRef.current = null;

    if (pendingConfig) {
      enqueueConfigSave(pendingConfig);
    }
  }, [enqueueConfigSave]);

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

      if (widgetSaveTimerRef.current !== null) {
        clearTimeout(widgetSaveTimerRef.current);
        widgetSaveTimerRef.current = null;
      }

      const pendingConfig = pendingWidgetConfigRef.current;
      pendingWidgetConfigRef.current = null;

      if (pendingConfig) {
        enqueueConfigSave(pendingConfig);
      }
    };
  }, [enqueueConfigSave]);

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

  return {
    config,
    error,
    isLoading,
    addWidget,
    flushWidgetUpdates,
    removeWidget,
    updateAppearance,
    updateWidget,
  };
}
