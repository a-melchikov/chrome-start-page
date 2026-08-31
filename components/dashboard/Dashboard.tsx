import { useState } from 'react';

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

interface DashboardProps {
  appearance: AppearanceConfig;
  config: DashboardConfig | null;
  isLoading: boolean;
  isWallpaperUpdating: boolean;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onAddWidget: (widget: WidgetConfig) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onClearWallpaperError: () => void;
  onFlushWidgetUpdates: () => void;
  onRemoveWallpaper: () => Promise<void>;
  onRemoveWidget: (widgetId: string) => void;
  onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
  onUpdateWidget: (widget: WidgetConfig) => void;
  onUpdateWidgetLayouts: (widgets: readonly WidgetConfig[]) => void;
}

export function Dashboard({
  appearance,
  config,
  isLoading,
  isWallpaperUpdating,
  wallpaperError,
  wallpaperPreviewSrc,
  onAddWidget,
  onAppearanceChange,
  onClearWallpaperError,
  onFlushWidgetUpdates,
  onRemoveWallpaper,
  onRemoveWidget,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
  onUpdateWidget,
  onUpdateWidgetLayouts,
}: DashboardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  const addWidget = (type: WidgetType) => {
    const widget = createWidgetConfig(type, config?.widgets.length ?? 0);

    if (widget) {
      onAddWidget(widget);
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
  };

  return (
    <>
      {config ? (
        <WidgetCanvas
          editingWidgetId={editingWidgetId}
          isEditing={isEditing}
          widgets={config.widgets}
          onFinishWidgetEditing={finishWidgetEditing}
          onRemoveWidget={removeWidget}
          onStartWidgetEditing={startWidgetEditing}
          onUpdateWidget={onUpdateWidget}
          onUpdateWidgetLayouts={onUpdateWidgetLayouts}
        />
      ) : null}

      <DashboardControls
        appearance={appearance}
        canManageWidgets={!isLoading && config !== null}
        isEditing={isEditing}
        isWallpaperUpdating={isWallpaperUpdating}
        wallpaperError={wallpaperError}
        wallpaperPreviewSrc={wallpaperPreviewSrc}
        onAddWidget={addWidget}
        onAppearanceChange={onAppearanceChange}
        onClearWallpaperError={onClearWallpaperError}
        onEditingChange={changeEditing}
        onRemoveWallpaper={onRemoveWallpaper}
        onSetLocalWallpaper={onSetLocalWallpaper}
        onSetUrlWallpaper={onSetUrlWallpaper}
      />
    </>
  );
}
