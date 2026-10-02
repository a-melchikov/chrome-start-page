import { lazy, Suspense, useEffect, useState } from 'react';

import { useDashboardShortcuts } from '../../hooks/use-dashboard-shortcuts';
import type {
  DashboardBackupDownload,
  DashboardImportResult,
} from '../../storage/dashboard-backup';
import {
  isWallpaperEnabled,
  type AppearanceConfig,
  type DashboardConfig,
  type WidgetType,
  type WorkspaceConfig,
} from '../../storage/schema';
import type { CustomTheme, ThemeRef } from '../../themes/types';
import {
  CopyIcon,
  DuplicateIcon,
  HelpCircleIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  RotateCwIcon,
  SearchIcon,
  TrashIcon,
  TransferIcon,
} from '../icons';
import { Button, IconButton } from '../ui';
import { MotionNotice } from '../ui/MotionNotice';
import { AddWidgetDialog } from './AddWidgetDialog';
import { SelectTemplateDialog } from '../../widgets/markdown/SelectTemplateDialog';
import type { MarkdownTemplateId } from '../../widgets/markdown/types';
import { ShortcutsHelpDialog } from './ShortcutsHelpDialog';
import { WorkspaceSelector } from './WorkspaceSelector';
import { WorkspaceManagerDialog } from './WorkspaceManagerDialog';
import { downloadBackup } from './download-backup';
import type { AppearanceSection, PaletteCommand } from './command-catalog';

const AppearanceDialog = lazy(() =>
  import('./AppearanceDialog').then((module) => ({
    default: module.AppearanceDialog,
  })),
);
const BackupDialog = lazy(() =>
  import('./BackupDialog').then((module) => ({
    default: module.BackupDialog,
  })),
);
const CommandPalette = lazy(() =>
  import('./CommandPalette').then((module) => ({
    default: module.CommandPalette,
  })),
);

interface DashboardControlsProps {
  appearance: AppearanceConfig;
  config: DashboardConfig | null;
  backupError: string | null;
  canManageWidgets: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isBackupProcessing: boolean;
  isEditing: boolean;
  isWallpaperUpdating: boolean;
  selectedCount: number;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onAddWidget: (type: WidgetType, templateId?: MarkdownTemplateId) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onAppearancePreview: (changes: Partial<AppearanceConfig>) => void;
  onClearBackupError: () => void;
  onClearSelection: () => void;
  onClearWallpaperError: () => void;
  onCopySelection: () => void;
  onDuplicateSelection: () => void;
  onEditingChange: (isEditing: boolean) => void;
  onExportDashboard: () => Promise<DashboardBackupDownload>;
  onFinishNudge: () => void;
  onFlushAppearancePreview: () => void;
  onImportDashboard: (
    file: File,
    signal?: AbortSignal,
  ) => Promise<DashboardImportResult>;
  onRemoveWallpaper: () => Promise<void>;
  onSetWallpaperEnabled: (enabled: boolean) => Promise<void>;
  onMoveSelection: (deltaX: number, deltaY: number, toEdge: boolean) => void;
  onPasteSelection: (source: string) => void;
  onRedo: () => void;
  onRequestDeleteSelection: () => void;
  onSelectAll: () => void;
  onToggleFocusedSelection: (widgetId: string) => void;
  onUndo: () => void;
  onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
  onOpenThemeEditor?: (themeToEdit?: CustomTheme) => void;
  onSelectTheme?: (themeRef: ThemeRef) => void;
  onDuplicateCustomTheme?: (id: string) => void;
  onDeleteCustomTheme?: (id: string) => void;
  reopenAppearanceToken?: number;
  workspaces?: readonly WorkspaceConfig[];
  activeWorkspaceId?: string | null;
  onSwitchWorkspace?: (id: string) => void;
  onAddWorkspace?: (
    name?: string,
    options?: { template?: 'blank' | 'work' | 'study' },
  ) => void;
  onRenameWorkspace?: (id: string, name: string) => void;
  onDuplicateWorkspace?: (id: string) => void;
  onDeleteWorkspace?: (id: string) => void;
  onReorderWorkspaces?: (orderedIds: readonly string[]) => void;
}

export function DashboardControls({
  appearance,
  config,
  backupError,
  canManageWidgets,
  canUndo,
  canRedo,
  isBackupProcessing,
  isEditing,
  isWallpaperUpdating,
  selectedCount,
  wallpaperError,
  wallpaperPreviewSrc,
  onAddWidget,
  onAppearanceChange,
  onAppearancePreview,
  onClearBackupError,
  onClearSelection,
  onClearWallpaperError,
  onCopySelection,
  onDuplicateSelection,
  onEditingChange,
  onExportDashboard,
  onFinishNudge,
  onFlushAppearancePreview,
  onImportDashboard,
  onRemoveWallpaper,
  onSetWallpaperEnabled,
  onMoveSelection,
  onPasteSelection,
  onRedo,
  onRequestDeleteSelection,
  onSelectAll,
  onToggleFocusedSelection,
  onUndo,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
  onOpenThemeEditor,
  onSelectTheme,
  onDuplicateCustomTheme,
  onDeleteCustomTheme,
  reopenAppearanceToken,
  workspaces,
  activeWorkspaceId,
  onSwitchWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onReorderWorkspaces,
}: DashboardControlsProps) {
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [isMarkdownTemplateOpen, setIsMarkdownTemplateOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [hasOpenedPalette, setHasOpenedPalette] = useState(false);
  const [requestedSection, setRequestedSection] = useState<{
    section: AppearanceSection;
    token: number;
  } | null>(null);
  const [paletteFeedback, setPaletteFeedback] = useState<string | null>(null);

  const [prevReopenToken, setPrevReopenToken] = useState(
    reopenAppearanceToken ?? 0,
  );

  if (reopenAppearanceToken && reopenAppearanceToken > prevReopenToken) {
    setPrevReopenToken(reopenAppearanceToken);
    setRequestedSection({ section: 'theme', token: reopenAppearanceToken });
    setIsAppearanceOpen(true);
  }

  const handleOpenThemeEditor = (themeToEdit?: CustomTheme) => {
    setIsAppearanceOpen(false);
    setRequestedSection(null);
    onOpenThemeEditor?.(themeToEdit);
  };

  useEffect(() => {
    if (!paletteFeedback) return;

    const timeout = window.setTimeout(() => setPaletteFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [paletteFeedback]);

  const openPalette = () => {
    setHasOpenedPalette(true);
    setIsPaletteOpen(true);
  };

  const toggleEditing = () => {
    const nextValue = !isEditing;
    onEditingChange(nextValue);

    if (!nextValue) {
      setIsAppearanceOpen(false);
      setIsAddWidgetOpen(false);
      setIsBackupOpen(false);
      setIsHelpOpen(false);
      setIsPaletteOpen(false);
      setIsWorkspaceMenuOpen(false);
      setIsWorkspaceManagerOpen(false);
    }
  };

  useDashboardShortcuts({
    canManageWidgets,
    isEditing,
    isHelpOpen,
    onToggleEditing: toggleEditing,
    onOpenHelp: () => setIsHelpOpen(true),
    onCloseHelp: () => setIsHelpOpen(false),
    onOpenAddWidget: () => setIsAddWidgetOpen(true),
    onOpenAppearance: () => {
      setRequestedSection(null);
      setIsAppearanceOpen(true);
    },
    onOpenBackup: () => {
      onClearBackupError();
      setIsBackupOpen(true);
    },
    onOpenPalette: openPalette,
    onOpenWorkspaceMenu: () => setIsWorkspaceMenuOpen((open) => !open),
    selectedCount,
    onClearSelection,
    onCopySelection,
    onPasteSelection,
    onDuplicateSelection,
    onSelectAll,
    onToggleFocusedSelection,
    onRequestDeleteSelection,
    onMoveSelection,
    onFinishNudge,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  });

  const executeCommand = (command: PaletteCommand) => {
    if (!canManageWidgets) return;

    if (command.kind === 'action') {
      if (command.action === 'edit') onEditingChange(!isEditing);
      if (command.action === 'add-dialog') {
        if (!isEditing) onEditingChange(true);
        setIsAddWidgetOpen(true);
      }
      if (command.action === 'appearance') {
        setRequestedSection(null);
        setIsAppearanceOpen(true);
      }
      if (command.action === 'backup' && !isWallpaperUpdating) {
        onClearBackupError();
        setIsBackupOpen(true);
      }
      if (command.action === 'export' && !isWallpaperUpdating) {
        onClearBackupError();
        setPaletteFeedback(null);
        void onExportDashboard()
          .then((download) => {
            downloadBackup(download);
            setPaletteFeedback('Резервная копия скачана');
          })
          .catch(() =>
            setPaletteFeedback('Не удалось экспортировать dashboard'),
          );
      }
      if (command.action === 'add-custom-theme') {
        handleOpenThemeEditor();
      }
      if (command.action === 'workspaces') {
        setIsWorkspaceManagerOpen(true);
      }
      if (command.action === 'add-workspace') {
        onAddWorkspace?.();
      }
      if (command.action === 'toggle-wallpaper') {
        const currentEnabled = isWallpaperEnabled(appearance.wallpaper);
        void onSetWallpaperEnabled(!currentEnabled);
      }
      return;
    }

    if (command.kind === 'workspace') {
      onSwitchWorkspace?.(command.workspaceId);
      return;
    }

    if (command.kind === 'section') {
      setRequestedSection({ section: command.section, token: Date.now() });
      setIsAppearanceOpen(true);
    } else if (command.kind === 'add') {
      if (command.widgetType === 'markdown') {
        setIsMarkdownTemplateOpen(true);
      } else {
        onAddWidget(command.widgetType);
      }
      if (!isEditing) onEditingChange(true);
    } else if (command.kind === 'focus') {
      const widget = Array.from(
        document.querySelectorAll<HTMLElement>('[data-widget-id]'),
      ).find((element) => element.dataset.widgetId === command.widgetId);
      widget?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      widget?.focus({ preventScroll: true });
    } else if (command.kind === 'theme') {
      if (onSelectTheme) {
        onSelectTheme(command.themeId);
      } else {
        onAppearanceChange({
          theme: command.themeId,
          backgroundColor: { type: 'theme' },
        });
      }
    } else if (command.kind === 'link') {
      window.location.assign(command.href);
    }
  };

  return (
    <>
      <MotionNotice
        className="fixed bottom-4 left-1/2 z-30 max-w-[calc(100vw-2rem)] rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-sm shadow-lg"
        message={paletteFeedback}
        role="status"
      />
      <div className="dashboard-toolbar liquid-glass-surface fixed top-4 right-4 z-10 flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-2 rounded-xl p-1">
        {workspaces && workspaces.length > 0 && onSwitchWorkspace ? (
          <WorkspaceSelector
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId ?? null}
            canManage={canManageWidgets}
            isOpen={isWorkspaceMenuOpen}
            onOpenChange={setIsWorkspaceMenuOpen}
            onSwitchWorkspace={onSwitchWorkspace}
            onAddWorkspace={onAddWorkspace ?? (() => {})}
            onRenameWorkspace={onRenameWorkspace ?? (() => {})}
            onDuplicateWorkspace={onDuplicateWorkspace ?? (() => {})}
            onDeleteWorkspace={onDeleteWorkspace ?? (() => {})}
            onOpenManager={() => setIsWorkspaceManagerOpen(true)}
          />
        ) : null}

        <div
          aria-hidden={!isEditing}
          className="edit-controls items-center gap-2"
          data-visible={isEditing}
          inert={!isEditing}
        >
          <IconButton
            aria-label="Отменить изменение"
            disabled={!canManageWidgets || !canUndo}
            size="small"
            title="Отменить изменение (Ctrl+Z)"
            variant="ghost"
            onClick={onUndo}
          >
            <RotateCcwIcon className="size-6" />
          </IconButton>
          <IconButton
            aria-label="Повторить изменение"
            disabled={!canManageWidgets || !canRedo}
            size="small"
            title="Повторить изменение (Ctrl+Shift+Z)"
            variant="ghost"
            onClick={onRedo}
          >
            <RotateCwIcon className="size-6" />
          </IconButton>
          {selectedCount > 0 ? (
            <div className="flex items-center gap-1 rounded-lg border border-theme-border px-2 py-0.5">
              <span className="whitespace-nowrap text-xs text-theme-text-secondary">
                Выбрано: {selectedCount}
              </span>
              <IconButton
                aria-label="Копировать выбранные виджеты"
                disabled={!canManageWidgets}
                size="xs"
                title="Копировать (Ctrl+C)"
                variant="ghost"
                onClick={onCopySelection}
              >
                <CopyIcon className="size-5" />
              </IconButton>
              <IconButton
                aria-label="Дублировать выбранные виджеты"
                disabled={!canManageWidgets}
                size="xs"
                title="Дублировать (Ctrl+D или D)"
                variant="ghost"
                onClick={onDuplicateSelection}
              >
                <DuplicateIcon className="size-5" />
              </IconButton>
              <IconButton
                aria-label="Удалить выбранные виджеты"
                disabled={!canManageWidgets}
                size="xs"
                title="Удалить (Delete)"
                variant="danger-ghost"
                onClick={onRequestDeleteSelection}
              >
                <TrashIcon className="size-5" />
              </IconButton>
            </div>
          ) : null}
          <Button
            disabled={!canManageWidgets}
            size="small"
            title="Добавить виджет (A)"
            variant="secondary"
            onClick={() => setIsAddWidgetOpen(true)}
          >
            <PlusIcon className="size-7" />
            Добавить виджет
          </Button>
          <IconButton
            aria-label="Настройки оформления"
            disabled={!canManageWidgets || isBackupProcessing}
            size="small"
            title="Настройки оформления (P, O)"
            variant="ghost"
            onClick={() => {
              setRequestedSection(null);
              setIsAppearanceOpen(true);
            }}
          >
            <PaletteIcon className="size-7" />
          </IconButton>
          <IconButton
            aria-label="Импорт и экспорт"
            disabled={!canManageWidgets || isWallpaperUpdating}
            size="small"
            title="Импорт и экспорт (B)"
            variant="ghost"
            onClick={() => {
              onClearBackupError();
              setIsBackupOpen(true);
            }}
          >
            <TransferIcon className="size-7" />
          </IconButton>
        </div>

        <IconButton
          aria-label="Поиск команд"
          disabled={!canManageWidgets}
          size="small"
          title="Поиск команд (Ctrl+K или /)"
          variant="ghost"
          onClick={openPalette}
        >
          <SearchIcon className="size-7" />
        </IconButton>

        <IconButton
          aria-label="Горячие клавиши"
          size="small"
          title="Горячие клавиши (?)"
          variant="ghost"
          onClick={() => setIsHelpOpen(true)}
        >
          <HelpCircleIcon className="size-7" />
        </IconButton>

        <IconButton
          aria-label={
            isEditing
              ? 'Выключить режим редактирования'
              : 'Включить режим редактирования'
          }
          aria-pressed={isEditing}
          disabled={!canManageWidgets}
          size="small"
          title={
            isEditing
              ? 'Выключить режим редактирования (Esc или E)'
              : 'Включить режим редактирования (E)'
          }
          variant="ghost"
          onClick={toggleEditing}
        >
          <PencilIcon className="size-7" />
        </IconButton>
      </div>

      <Suspense fallback={null}>
        <AppearanceDialog
          appearance={appearance}
          customThemes={config?.customThemes ?? []}
          requestedSection={requestedSection}
          isWallpaperUpdating={isWallpaperUpdating}
          open={isAppearanceOpen}
          wallpaperError={wallpaperError}
          wallpaperPreviewSrc={wallpaperPreviewSrc}
          onAppearanceChange={onAppearanceChange}
          onAppearancePreview={onAppearancePreview}
          onClearWallpaperError={onClearWallpaperError}
          onFlushAppearancePreview={onFlushAppearancePreview}
          onOpenChange={(open) => {
            setIsAppearanceOpen(open);
            if (!open) setRequestedSection(null);
          }}
          onRemoveWallpaper={onRemoveWallpaper}
          onSetWallpaperEnabled={onSetWallpaperEnabled}
          onSetLocalWallpaper={onSetLocalWallpaper}
          onSetUrlWallpaper={onSetUrlWallpaper}
          onSelectTheme={onSelectTheme}
          onOpenThemeEditor={handleOpenThemeEditor}
          onDuplicateCustomTheme={onDuplicateCustomTheme}
          onDeleteCustomTheme={onDeleteCustomTheme}
        />
        <BackupDialog
          error={backupError}
          isProcessing={isBackupProcessing}
          open={isBackupOpen}
          onClearError={onClearBackupError}
          onExport={onExportDashboard}
          onImport={onImportDashboard}
          onOpenChange={setIsBackupOpen}
        />
      </Suspense>
      <AddWidgetDialog
        open={isAddWidgetOpen}
        onSelectWidgetType={(type) => {
          if (type === 'markdown') {
            setIsMarkdownTemplateOpen(true);
          } else {
            onAddWidget(type);
          }
        }}
        onOpenChange={setIsAddWidgetOpen}
      />
      <SelectTemplateDialog
        open={isMarkdownTemplateOpen}
        onOpenChange={setIsMarkdownTemplateOpen}
        onSelectTemplate={(templateId) => {
          onAddWidget('markdown', templateId);
          if (!isEditing) onEditingChange(true);
        }}
      />
      <ShortcutsHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      {workspaces && onReorderWorkspaces ? (
        <WorkspaceManagerDialog
          open={isWorkspaceManagerOpen}
          onOpenChange={setIsWorkspaceManagerOpen}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId ?? null}
          onSwitchWorkspace={onSwitchWorkspace ?? (() => {})}
          onAddWorkspace={onAddWorkspace ?? (() => {})}
          onRenameWorkspace={onRenameWorkspace ?? (() => {})}
          onDuplicateWorkspace={onDuplicateWorkspace ?? (() => {})}
          onDeleteWorkspace={onDeleteWorkspace ?? (() => {})}
          onReorderWorkspaces={onReorderWorkspaces}
        />
      ) : null}
      {hasOpenedPalette ? (
        <Suspense fallback={null}>
          <CommandPalette
            config={config}
            isEditing={isEditing}
            open={isPaletteOpen}
            onOpenChange={setIsPaletteOpen}
            onSelect={executeCommand}
            isCommandDisabled={(command) =>
              isWallpaperUpdating &&
              command.kind === 'action' &&
              (command.action === 'backup' ||
                command.action === 'export' ||
                command.action === 'toggle-wallpaper')
            }
          />
        </Suspense>
      ) : null}
    </>
  );
}
