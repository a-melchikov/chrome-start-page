import { useState } from 'react';

import type {
  DashboardBackupDownload,
  DashboardImportResult,
} from '../../storage/dashboard-backup';
import type {
  AppearanceConfig,
  DashboardConfig,
  WidgetConfig,
  WidgetType,
} from '../../storage/schema';
import {
  createWidgetConfig,
  getWidgetDefinition,
} from '../../widgets/registry';
import { DashboardControls } from './DashboardControls';
import { WidgetCanvas } from './WidgetCanvas';
import { calculateNextWidgetPosition } from './dashboard-layout';

interface DashboardProps {
  appearance: AppearanceConfig;
  backupError: string | null;
  config: DashboardConfig | null;
  isBackupProcessing: boolean;
  isLoading: boolean;
  isWallpaperUpdating: boolean;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onAddWidget: (widget: WidgetConfig) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onAppearancePreview: (changes: Partial<AppearanceConfig>) => void;
  onClearBackupError: () => void;
  onClearWallpaperError: () => void;
  onExportDashboard: () => Promise<DashboardBackupDownload>;
  onFlushAppearancePreview: () => void;
  onFlushWidgetUpdates: () => void;
  onImportDashboard: (
    file: File,
    signal?: AbortSignal,
  ) => Promise<DashboardImportResult>;
  onRemoveWallpaper: () => Promise<void>;
  onRemoveWidget: (widgetId: string) => void;
  onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
  onUpdateWidget: (widget: WidgetConfig) => void;
  onUpdateWidgetLayouts: (widgets: readonly WidgetConfig[]) => void;
}

export function Dashboard({
  appearance,
  backupError,
  config,
  isBackupProcessing,
  isLoading,
  isWallpaperUpdating,
  wallpaperError,
  wallpaperPreviewSrc,
  onAddWidget,
  onAppearanceChange,
  onAppearancePreview,
  onClearBackupError,
  onClearWallpaperError,
  onExportDashboard,
  onFlushAppearancePreview,
  onFlushWidgetUpdates,
  onImportDashboard,
  onRemoveWallpaper,
  onRemoveWidget,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
  onUpdateWidget,
  onUpdateWidgetLayouts,
}: DashboardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [newWidgetIds, setNewWidgetIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const addWidget = (type: WidgetType) => {
    const baseWidget = createWidgetConfig(type, 0);

    if (baseWidget) {
      const position = calculateNextWidgetPosition(
        config?.widgets ?? [],
        baseWidget.layout,
      );
      setNewWidgetIds((ids) => new Set(ids).add(baseWidget.id));
      onAddWidget({
        ...baseWidget,
        layout: {
          ...baseWidget.layout,
          ...position,
        },
      });
    }
  };

  const canFinishWidgetEditing = (widgetId: string | null): boolean => {
    if (!widgetId) {
      return true;
    }

    const widget = config?.widgets.find(({ id }) => id === widgetId);
    const definition = widget ? getWidgetDefinition(widget.type) : undefined;

    return widget && definition?.canFinishEditing
      ? definition.canFinishEditing(widget)
      : true;
  };

  const changeEditing = (nextValue: boolean) => {
    if (!nextValue && !canFinishWidgetEditing(editingWidgetId)) {
      return;
    }

    if (!nextValue) {
      setEditingWidgetId(null);
      onFlushWidgetUpdates();
    }

    setIsEditing(nextValue);
  };

  const startWidgetEditing = (widgetId: string) => {
    if (!canFinishWidgetEditing(editingWidgetId)) {
      return;
    }

    setEditingWidgetId(widgetId);
  };

  const finishWidgetEditing = () => {
    setEditingWidgetId(null);
    onFlushWidgetUpdates();
  };

  const removeWidget = (widgetId: string) => {
    if (editingWidgetId === widgetId) {
      setEditingWidgetId(null);
    }

    onRemoveWidget(widgetId);
    setNewWidgetIds((ids) => {
      const nextIds = new Set(ids);
      nextIds.delete(widgetId);
      return nextIds;
    });
  };

  const importDashboard = async (file: File, signal?: AbortSignal) => {
    const result = await onImportDashboard(file, signal);
    setEditingWidgetId(null);
    return result;
  };

  return (
    <>
      {config ? (
        <WidgetCanvas
          editingWidgetId={editingWidgetId}
          isEditing={isEditing && !isBackupProcessing}
          newWidgetIds={newWidgetIds}
          widgets={config.widgets}
          onFinishWidgetEditing={finishWidgetEditing}
          onRemoveWidget={removeWidget}
          onStartWidgetEditing={startWidgetEditing}
          onUpdateWidget={onUpdateWidget}
          onUpdateWidgetLayouts={onUpdateWidgetLayouts}
          onWidgetEnterEnd={(widgetId) => {
            setNewWidgetIds((ids) => {
              const nextIds = new Set(ids);
              nextIds.delete(widgetId);
              return nextIds;
            });
          }}
        />
      ) : null}

      <DashboardControls
        appearance={appearance}
        config={config}
        backupError={backupError}
        canManageWidgets={!isLoading && config !== null && !isBackupProcessing}
        isBackupProcessing={isBackupProcessing}
        isEditing={isEditing}
        isWallpaperUpdating={isWallpaperUpdating}
        wallpaperError={wallpaperError}
        wallpaperPreviewSrc={wallpaperPreviewSrc}
        onAddWidget={addWidget}
        onAppearanceChange={onAppearanceChange}
        onAppearancePreview={onAppearancePreview}
        onClearBackupError={onClearBackupError}
        onClearWallpaperError={onClearWallpaperError}
        onEditingChange={changeEditing}
        onExportDashboard={onExportDashboard}
        onFlushAppearancePreview={onFlushAppearancePreview}
        onImportDashboard={importDashboard}
        onRemoveWallpaper={onRemoveWallpaper}
        onSetLocalWallpaper={onSetLocalWallpaper}
        onSetUrlWallpaper={onSetUrlWallpaper}
      />
    </>
  );
}
