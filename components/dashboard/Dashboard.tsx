import { WidgetAppearanceContext } from './widget-appearance-context';
import { useEffect, useState } from 'react';

import { DEFAULT_GRID_GAP } from '../../storage/defaults';

import type {
  DashboardBackupDownload,
  DashboardImportResult,
} from '../../storage/dashboard-backup';
import type {
  AppearanceConfig,
  InterfacePreferences,
  ToolbarConfig,
  DashboardConfig,
  WidgetConfig,
  WidgetType,
  WorkspaceConfig,
} from '../../storage/schema';
import type { CustomTheme, ThemeRef } from '../../themes/types';
import {
  createMarkdownWidgetConfigWithTemplate,
  createWidgetConfig,
  getWidgetDefinition,
} from '../../widgets/registry';
import type { MarkdownTemplateId } from '../../widgets/markdown/types';
import { Button, Dialog } from '../ui';
import { MotionNotice } from '../ui/MotionNotice';
import { ConfirmWidgetDeleteDialog } from './ConfirmWidgetDeleteDialog';
import { DashboardControls } from './DashboardControls';
import { WidgetCanvas } from './WidgetCanvas';
import {
  calculateNextWidgetPosition,
  getVisibleGridBottomRow,
} from './dashboard-layout';

interface DashboardProps {
  appearance: AppearanceConfig;
  toolbar: ToolbarConfig;
  onToolbarChange: (toolbar: ToolbarConfig) => void;
  onInterfacePreferencesChange: (
    changes: Partial<InterfacePreferences>,
  ) => void;
  backupError: string | null;
  config: DashboardConfig | null;
  canUndo: boolean;
  canRedo: boolean;
  conflict: boolean;
  historyEpoch: number;
  configEpoch: number;
  isBackupProcessing: boolean;
  isLoading: boolean;
  isWallpaperUpdating: boolean;
  isWidgetActionProcessing: boolean;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onAddWidget: (widget: WidgetConfig) => void;
  onCopyWidgets: (ids: readonly string[]) => Promise<string>;
  onDuplicateWidgets: (ids: readonly string[]) => Promise<string[]>;
  onPasteWidgets: (source: string) => Promise<string[]>;
  onMoveWidgets: (
    ids: readonly string[],
    deltaX: number,
    deltaY: number,
    toEdge: boolean,
    visibleBottomRow?: number,
  ) => void;
  onFinishNudge: () => void;
  onRemoveWidgets: (ids: readonly string[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  onResolveConflict: (choice: 'external' | 'mine') => Promise<void>;
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
  onSetWallpaperEnabled: (enabled: boolean) => Promise<void>;
  onRemoveWidget: (widgetId: string) => void;
  onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
  onUpdateWidget: (widget: WidgetConfig) => void;
  onUpdateWidgetLayouts: (widgets: readonly WidgetConfig[]) => void;
  onOpenThemeEditor?: (themeToEdit?: CustomTheme) => void;
  onSelectTheme?: (themeRef: ThemeRef) => void;
  onDuplicateCustomTheme?: (id: string) => void;
  onDeleteCustomTheme?: (id: string) => void;
  reopenAppearanceToken?: number;
  activeWorkspace?: WorkspaceConfig | null;
  activeWorkspaceId?: string | null;
  workspaces?: readonly WorkspaceConfig[];
  onSwitchWorkspace?: (id: string) => void;
  onAddWorkspace?: (
    name?: string,
    options?: { template?: 'blank' | 'work' | 'study' },
  ) => void;
  onRenameWorkspace?: (id: string, name: string) => void;
  onDuplicateWorkspace?: (id: string) => void;
  onDeleteWorkspace?: (id: string) => Promise<void>;
  onRestoreWorkspace?: (id: string) => Promise<void>;
  onPurgeWorkspace?: (id: string) => Promise<void>;
  onReorderWorkspaces?: (orderedIds: readonly string[]) => void;
}

export function Dashboard({
  appearance,
  toolbar,
  onToolbarChange,
  onInterfacePreferencesChange,
  backupError,
  config,
  canUndo,
  canRedo,
  conflict,
  historyEpoch,
  configEpoch,
  isBackupProcessing,
  isLoading,
  isWallpaperUpdating,
  isWidgetActionProcessing,
  wallpaperError,
  wallpaperPreviewSrc,
  onAddWidget,
  onCopyWidgets,
  onDuplicateWidgets,
  onPasteWidgets,
  onMoveWidgets,
  onFinishNudge,
  onRemoveWidgets,
  onUndo,
  onRedo,
  onResolveConflict,
  onAppearanceChange,
  onAppearancePreview,
  onClearBackupError,
  onClearWallpaperError,
  onExportDashboard,
  onFlushAppearancePreview,
  onFlushWidgetUpdates,
  onImportDashboard,
  onRemoveWallpaper,
  onSetWallpaperEnabled,
  onRemoveWidget,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
  onUpdateWidget,
  onUpdateWidgetLayouts,
  onOpenThemeEditor,
  onSelectTheme,
  onDuplicateCustomTheme,
  onDeleteCustomTheme,
  reopenAppearanceToken,
  activeWorkspace,
  activeWorkspaceId,
  workspaces,
  onSwitchWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onRestoreWorkspace,
  onPurgeWorkspace,
  onReorderWorkspaces,
}: DashboardProps) {
  const [isLayoutInteracting, setIsLayoutInteracting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [newWidgetIds, setNewWidgetIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [selectionState, setSelectionState] = useState<{
    epoch: number;
    ids: ReadonlySet<string>;
  }>(() => ({ epoch: historyEpoch, ids: new Set() }));
  const [deleteState, setDeleteState] = useState<{
    epoch: number;
    ids: string[];
  }>(() => ({ epoch: historyEpoch, ids: [] }));
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [prevWorkspaceId, setPrevWorkspaceId] = useState(activeWorkspaceId);
  const [animatedWorkspaceId, setAnimatedWorkspaceId] = useState<string | null>(
    null,
  );

  if (activeWorkspaceId !== prevWorkspaceId) {
    // Initial storage hydration is immediate; only a later workspace change fades in.
    if (prevWorkspaceId && activeWorkspaceId)
      setAnimatedWorkspaceId(activeWorkspaceId);
    setPrevWorkspaceId(activeWorkspaceId);
    setEditingWidgetId(null);
    setNewWidgetIds(new Set());
    setSelectionState({ epoch: historyEpoch, ids: new Set() });
  }

  const activeWidgets = activeWorkspace?.widgets ?? [];
  const validWidgetIds = new Set(activeWidgets.map((widget) => widget.id));
  const selectedWidgetIds = new Set(
    selectionState.epoch === historyEpoch
      ? [...selectionState.ids].filter((id) => validWidgetIds.has(id))
      : [],
  );
  const pendingGroupDeleteIds =
    deleteState.epoch === historyEpoch ? deleteState.ids : [];
  const setSelectedWidgetIds = (
    update:
      | ReadonlySet<string>
      | ((current: ReadonlySet<string>) => ReadonlySet<string>),
  ) => {
    setSelectionState((previous) => {
      const current = new Set(
        previous.epoch === historyEpoch
          ? [...previous.ids].filter((id) => validWidgetIds.has(id))
          : [],
      );
      return {
        epoch: historyEpoch,
        ids: typeof update === 'function' ? update(current) : update,
      };
    });
  };
  const setPendingGroupDeleteIds = (ids: string[]) => {
    setDeleteState({ epoch: historyEpoch, ids });
  };

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  const selectedIds = [...selectedWidgetIds];
  const canEditSelection =
    isEditing && !isBackupProcessing && !isWidgetActionProcessing && !conflict;

  const selectWidget = (widgetId: string, additive: boolean) => {
    setSelectedWidgetIds((ids) => {
      if (!additive) return new Set([widgetId]);
      const next = new Set(ids);
      if (next.has(widgetId)) next.delete(widgetId);
      else next.add(widgetId);
      return next;
    });
  };

  const copySelection = async () => {
    if (!canEditSelection || selectedIds.length === 0) return;
    try {
      const source = await onCopyWidgets(selectedIds);
      await navigator.clipboard.writeText(source);
      setActionNotice('Виджеты скопированы');
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : 'Не удалось скопировать виджеты',
      );
    }
  };

  const pasteSelection = async (source: string) => {
    if (!canEditSelection) return;
    try {
      const ids = await onPasteWidgets(source);
      if (ids.length > 0) setSelectedWidgetIds(new Set(ids));
    } catch (error) {
      setActionNotice(
        error instanceof Error ? error.message : 'Не удалось вставить виджеты',
      );
    }
  };

  const duplicateSelection = async () => {
    if (!canEditSelection || selectedIds.length === 0) return;
    try {
      const ids = await onDuplicateWidgets(selectedIds);
      if (ids.length > 0) setSelectedWidgetIds(new Set(ids));
    } catch (error) {
      setActionNotice(
        error instanceof Error
          ? error.message
          : 'Не удалось дублировать виджеты',
      );
    }
  };

  const addWidget = (type: WidgetType, templateId?: MarkdownTemplateId) => {
    const baseWidget =
      type === 'markdown' && templateId
        ? createMarkdownWidgetConfigWithTemplate(templateId, 0)
        : createWidgetConfig(type, 0);
    if (!baseWidget) return;
    const position = calculateNextWidgetPosition(
      activeWidgets,
      baseWidget.layout,
    );
    setNewWidgetIds((ids) => new Set(ids).add(baseWidget.id));
    onAddWidget({
      ...baseWidget,
      layout: { ...baseWidget.layout, ...position },
    });
    if (type === 'weather') setEditingWidgetId(baseWidget.id);
  };

  const canFinishWidgetEditing = (widgetId: string | null): boolean => {
    if (!widgetId) return true;
    const widget = activeWidgets.find(({ id }) => id === widgetId);
    const definition = widget ? getWidgetDefinition(widget.type) : undefined;
    return widget && definition?.canFinishEditing
      ? definition.canFinishEditing(widget)
      : true;
  };

  const changeEditing = (nextValue: boolean) => {
    if (!nextValue && !canFinishWidgetEditing(editingWidgetId)) return;
    if (!nextValue) {
      setEditingWidgetId(null);
      setSelectedWidgetIds(new Set());
      onFinishNudge();
      onFlushWidgetUpdates();
    }
    setIsEditing(nextValue);
  };

  const startWidgetEditing = (widgetId: string) => {
    if (canFinishWidgetEditing(editingWidgetId)) setEditingWidgetId(widgetId);
  };

  const finishWidgetEditing = () => {
    setEditingWidgetId(null);
    onFlushWidgetUpdates();
  };

  const removeWidget = (widgetId: string) => {
    if (editingWidgetId === widgetId) setEditingWidgetId(null);
    onRemoveWidget(widgetId);
    setSelectedWidgetIds((ids) => {
      const next = new Set(ids);
      next.delete(widgetId);
      return next;
    });
    setNewWidgetIds((ids) => {
      const next = new Set(ids);
      next.delete(widgetId);
      return next;
    });
  };

  const importDashboard = async (file: File, signal?: AbortSignal) => {
    const result = await onImportDashboard(file, signal);
    setEditingWidgetId(null);
    return result;
  };

  const requestGroupDelete = () => {
    if (canEditSelection && selectedIds.length > 0)
      setPendingGroupDeleteIds(selectedIds);
  };

  const confirmGroupDelete = () => {
    onRemoveWidgets(pendingGroupDeleteIds);
    setSelectedWidgetIds(new Set());
    setPendingGroupDeleteIds([]);
  };

  return (
    <>
      {config ? (
        <div
          key={activeWorkspaceId ?? 'default'}
          className={
            animatedWorkspaceId === activeWorkspaceId
              ? 'workspace-switch'
              : undefined
          }
        >
          <WidgetAppearanceContext.Provider value={appearance}>
            <WidgetCanvas
              gridGap={appearance.gridGap}
              gridPadding={appearance.gridPadding}
              key={activeWorkspaceId ?? 'default'}
              topPadding={toolbar.mode === 'top-right' ? 80 : 24}
              onInteractionChange={setIsLayoutInteracting}
              editingWidgetId={editingWidgetId}
              isEditing={canEditSelection}
              newWidgetIds={newWidgetIds}
              selectedWidgetIds={selectedWidgetIds}
              widgets={activeWidgets}
              onClearSelection={() => setSelectedWidgetIds(new Set())}
              onFinishWidgetEditing={finishWidgetEditing}
              onRemoveWidget={removeWidget}
              onSelectWidget={selectWidget}
              onStartWidgetEditing={startWidgetEditing}
              onUpdateWidget={onUpdateWidget}
              onUpdateWidgetLayouts={onUpdateWidgetLayouts}
              onWidgetEnterEnd={(widgetId) => {
                setNewWidgetIds((ids) => {
                  const next = new Set(ids);
                  next.delete(widgetId);
                  return next;
                });
              }}
            />
          </WidgetAppearanceContext.Provider>
        </div>
      ) : null}

      <DashboardControls
        appearance={appearance}
        toolbar={toolbar}
        onToolbarChange={onToolbarChange}
        onInterfacePreferencesChange={onInterfacePreferencesChange}
        configEpoch={configEpoch}
        isLayoutInteracting={isLayoutInteracting}
        backupError={backupError}
        canManageWidgets={
          !isLoading &&
          config !== null &&
          !isBackupProcessing &&
          !isWidgetActionProcessing &&
          !conflict
        }
        canRedo={canRedo}
        canUndo={canUndo}
        config={config}
        isBackupProcessing={isBackupProcessing}
        isEditing={isEditing}
        isWidgetActionProcessing={isWidgetActionProcessing}
        isWallpaperUpdating={isWallpaperUpdating}
        selectedCount={selectedIds.length}
        wallpaperError={wallpaperError}
        wallpaperPreviewSrc={wallpaperPreviewSrc}
        onAddWidget={addWidget}
        onAppearanceChange={onAppearanceChange}
        onAppearancePreview={onAppearancePreview}
        onClearBackupError={onClearBackupError}
        onClearSelection={() => setSelectedWidgetIds(new Set())}
        onClearWallpaperError={onClearWallpaperError}
        onCopySelection={() => void copySelection()}
        onDuplicateSelection={() => void duplicateSelection()}
        onEditingChange={changeEditing}
        onExportDashboard={onExportDashboard}
        onFinishNudge={onFinishNudge}
        onFlushAppearancePreview={onFlushAppearancePreview}
        onImportDashboard={importDashboard}
        onMoveSelection={(dx, dy, toEdge) => {
          const canvas = document.querySelector<HTMLElement>(
            '[data-dashboard-canvas="desktop"]',
          );
          const visibleBottomRow =
            toEdge && dy > 0 && canvas
              ? getVisibleGridBottomRow(
                  canvas.getBoundingClientRect().top,
                  window.innerHeight,
                  appearance.gridGap ?? DEFAULT_GRID_GAP,
                )
              : undefined;
          onMoveWidgets(selectedIds, dx, dy, toEdge, visibleBottomRow);
        }}
        onPasteSelection={(source) => void pasteSelection(source)}
        onRedo={onRedo}
        onRemoveWallpaper={onRemoveWallpaper}
        onSetWallpaperEnabled={onSetWallpaperEnabled}
        onRequestDeleteSelection={requestGroupDelete}
        onSelectAll={() =>
          setSelectedWidgetIds(
            new Set(activeWidgets.map((widget) => widget.id)),
          )
        }
        onSetLocalWallpaper={onSetLocalWallpaper}
        onSetUrlWallpaper={onSetUrlWallpaper}
        onToggleFocusedSelection={(widgetId) => selectWidget(widgetId, true)}
        onUndo={onUndo}
        onOpenThemeEditor={onOpenThemeEditor}
        onSelectTheme={onSelectTheme}
        onDuplicateCustomTheme={onDuplicateCustomTheme}
        onDeleteCustomTheme={onDeleteCustomTheme}
        reopenAppearanceToken={reopenAppearanceToken}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSwitchWorkspace={onSwitchWorkspace}
        onAddWorkspace={onAddWorkspace}
        onRenameWorkspace={onRenameWorkspace}
        onDuplicateWorkspace={onDuplicateWorkspace}
        onDeleteWorkspace={onDeleteWorkspace}
        onRestoreWorkspace={onRestoreWorkspace}
        onPurgeWorkspace={onPurgeWorkspace}
        onReorderWorkspaces={onReorderWorkspaces}
      />
      <ConfirmWidgetDeleteDialog
        open={pendingGroupDeleteIds.length > 0}
        widgetName=""
        widgetCount={pendingGroupDeleteIds.length}
        onCancel={() => setPendingGroupDeleteIds([])}
        onConfirm={confirmGroupDelete}
      />
      <Dialog
        open={conflict}
        showCloseButton={false}
        title="Дашборд изменён в другой вкладке"
        description="В этой вкладке есть несохранённые изменения. Выберите, какую версию сохранить."
        onOpenChange={() => undefined}
        footer={
          <>
            <Button
              data-dialog-initial-focus
              size="small"
              variant="secondary"
              onClick={() =>
                void onResolveConflict('external').catch(() => undefined)
              }
            >
              Загрузить внешнюю
            </Button>
            <Button
              size="small"
              onClick={() =>
                void onResolveConflict('mine').catch(() => undefined)
              }
            >
              Сохранить мою
            </Button>
          </>
        }
      >
        <p className="text-sm text-theme-text-secondary">
          Оба действия начинают новую историю отмены.
        </p>
      </Dialog>
      <MotionNotice
        className="fixed bottom-4 left-1/2 z-30 max-w-[calc(100vw-2rem)] rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-sm shadow-lg"
        message={actionNotice}
        role="status"
      />
    </>
  );
}
