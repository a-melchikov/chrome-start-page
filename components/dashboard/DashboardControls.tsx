import { lazy, Suspense, useEffect, useState } from 'react';

import { useDashboardToolbar } from '../../hooks/use-dashboard-toolbar';
import { DashboardToolbar } from './DashboardToolbar';
import { classNames } from '../ui/class-names';

import { useDashboardShortcuts } from '../../hooks/use-dashboard-shortcuts';
import type {
  DashboardBackupDownload,
  DashboardImportResult,
} from '../../storage/dashboard-backup';
import {
  isWallpaperEnabled,
  type AppearanceConfig,
  type InterfacePreferences,
  type ToolbarConfig,
  type DashboardConfig,
  type WidgetType,
  type WorkspaceConfig,
} from '../../storage/schema';
import type { CustomTheme, ThemeRef } from '../../themes/types';
import {
  CheckIcon,
  CopyIcon,
  DuplicateIcon,
  KeyboardIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  RedoIcon,
  SearchIcon,
  TrashIcon,
  TransferIcon,
  UndoIcon,
} from '../icons';
import { Button, IconButton } from '../ui';
import { MotionNotice } from '../ui/MotionNotice';
import { AddWidgetDialog } from './AddWidgetDialog';
import { SelectTemplateDialog } from '../../widgets/markdown/SelectTemplateDialog';
import type { MarkdownTemplateId } from '../../widgets/markdown/types';
import {
  getShortcutLabel,
  type ShortcutCommand,
} from '../../keyboard/shortcuts';
import { ShortcutsHelp } from './ShortcutsHelp';
import { InterfaceSettings } from './InterfaceSettings';
import { SettingsPanel, type SettingsSection } from './SettingsPanel';
import { WorkspaceSelector } from './WorkspaceSelector';
import { WorkspaceSettings } from './WorkspaceSettings';
import { ConfirmWorkspaceDeleteDialog } from './ConfirmWorkspaceDeleteDialog';
import { downloadBackup } from './download-backup';
import type { AppearanceSection, PaletteCommand } from './command-catalog';
import { openLocalFileLink } from '../../widgets/markdown/open-file-link';

const AppearanceSettings = lazy(() =>
  import('./AppearanceSettings').then((module) => ({
    default: module.AppearanceSettings,
  })),
);
const AboutSettings = lazy(() =>
  import('./AboutSettings').then((module) => ({
    default: module.AboutSettings,
  })),
);
const BackupSettings = lazy(() =>
  import('./BackupSettings').then((module) => ({
    default: module.BackupSettings,
  })),
);
const CommandPalette = lazy(() =>
  import('./CommandPalette').then((module) => ({
    default: module.CommandPalette,
  })),
);

interface DashboardControlsProps {
  appearance: AppearanceConfig;
  toolbar: ToolbarConfig;
  onToolbarChange: (toolbar: ToolbarConfig) => void;
  onInterfacePreferencesChange: (
    changes: Partial<InterfacePreferences>,
  ) => void;
  config: DashboardConfig | null;
  configEpoch: number;
  isLayoutInteracting: boolean;
  backupError: string | null;
  canManageWidgets: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isBackupProcessing: boolean;
  isEditing: boolean;
  isWidgetActionProcessing: boolean;
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
  onDeleteWorkspace?: (id: string) => Promise<void>;
  onRestoreWorkspace?: (id: string) => Promise<void>;
  onPurgeWorkspace?: (id: string) => Promise<void>;
  onReorderWorkspaces?: (orderedIds: readonly string[]) => void;
}

export function DashboardControls({
  appearance,
  toolbar,
  onToolbarChange,
  onInterfacePreferencesChange,
  config,
  configEpoch,
  isLayoutInteracting,
  backupError,
  canManageWidgets,
  canUndo,
  canRedo,
  isBackupProcessing,
  isEditing,
  isWidgetActionProcessing,
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
  onRestoreWorkspace,
  onPurgeWorkspace,
  onReorderWorkspaces,
}: DashboardControlsProps) {
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection | null>(null);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [isMarkdownTemplateOpen, setIsMarkdownTemplateOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [hasOpenedPalette, setHasOpenedPalette] = useState(false);
  const [workspaceAction, setWorkspaceAction] = useState<{
    kind: 'trash' | 'purge';
    workspace: WorkspaceConfig;
  } | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceEpoch, setWorkspaceEpoch] = useState(configEpoch);
  if (workspaceEpoch !== configEpoch) {
    setWorkspaceEpoch(configEpoch);
    setWorkspaceAction(null);
    setWorkspaceNotice(null);
    setWorkspaceError(null);
  }
  useEffect(() => {
    if (!workspaceNotice || settingsSection !== null) return;
    const timer = window.setTimeout(() => setWorkspaceNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [workspaceNotice, settingsSection]);
  const isLeft = toolbar.mode !== 'top-right';
  const toolbarState = useDashboardToolbar({
    mode: toolbar.mode,
    isEditing,
    resetEpoch: configEpoch,
    onCollapse: () => setIsWorkspaceMenuOpen(false),
  });

  const workspaceReturnFocus = () =>
    document.querySelector<HTMLElement>(
      'dialog[open] [data-workspace-manager-focus]',
    ) ??
    document.getElementById('workspace-selector-trigger') ??
    toolbarState.getReturnFocus();
  const requestWorkspaceDelete = (id: string) => {
    const workspace = workspaces?.find((w) => w.id === id);
    if (!canManageWidgets || !workspace || (workspaces?.length ?? 0) <= 1)
      return;
    setWorkspaceError(null);
    setWorkspaceNotice(null);
    setWorkspaceAction({ kind: 'trash', workspace });
  };
  const requestWorkspacePurge = (id: string) => {
    const workspace = config?.trashedWorkspaces?.find(
      (entry) => entry.workspace.id === id,
    )?.workspace;
    if (!canManageWidgets || !workspace) return;
    setWorkspaceError(null);
    setWorkspaceNotice(null);
    setWorkspaceAction({ kind: 'purge', workspace });
  };
  const confirmWorkspaceAction = async () => {
    if (!workspaceAction || !canManageWidgets) return;
    const action =
      workspaceAction.kind === 'trash' ? onDeleteWorkspace : onPurgeWorkspace;
    if (!action) return;
    try {
      await action(workspaceAction.workspace.id);
      setWorkspaceAction(null);
      setIsWorkspaceMenuOpen(false);
      setWorkspaceNotice(
        workspaceAction.kind === 'trash'
          ? `Пространство «${workspaceAction.workspace.name}» перемещено в корзину`
          : `Пространство «${workspaceAction.workspace.name}» удалено навсегда`,
      );
    } catch (error) {
      setWorkspaceError(
        error instanceof Error
          ? error.message
          : 'Не удалось сохранить изменения. Повторите попытку.',
      );
    }
  };
  const restoreWorkspace = async (id: string) => {
    if (!canManageWidgets || !onRestoreWorkspace) return;
    setWorkspaceError(null);
    setWorkspaceNotice(null);
    try {
      await onRestoreWorkspace(id);
      setWorkspaceNotice('Пространство восстановлено и открыто');
      requestAnimationFrame(() => {
        const button = [
          ...document.querySelectorAll<HTMLButtonElement>(
            '[data-rename-workspace]',
          ),
        ].find((item) => item.dataset.renameWorkspace === id);
        (button ?? workspaceReturnFocus())?.focus({ preventScroll: true });
      });
    } catch (error) {
      setWorkspaceError(
        error instanceof Error
          ? error.message
          : 'Не удалось восстановить пространство. Повторите попытку.',
      );
    }
  };

  const [requestedSection, setRequestedSection] = useState<{
    section: AppearanceSection;
    token: number;
  } | null>(null);
  const [paletteFeedback, setPaletteFeedback] = useState<string | null>(null);
  const [pendingWidgetFocus, setPendingWidgetFocus] = useState<{
    workspaceId: string;
    widgetId: string;
  } | null>(null);
  const [themeEditorTarget, setThemeEditorTarget] = useState('create');

  const [prevReopenToken, setPrevReopenToken] = useState(
    reopenAppearanceToken ?? 0,
  );

  if (reopenAppearanceToken && reopenAppearanceToken > prevReopenToken) {
    setPrevReopenToken(reopenAppearanceToken);
    setRequestedSection({ section: 'theme', token: reopenAppearanceToken });
    setSettingsSection('appearance');
  }

  const closeSettings = () => {
    onFlushAppearancePreview();
    setSettingsSection(null);
    setRequestedSection(null);
  };

  const openSettings = (section: SettingsSection) => {
    onFlushAppearancePreview();
    setRequestedSection(null);
    if (section === 'backup') onClearBackupError();
    setSettingsSection(section);
  };

  const handleOpenThemeEditor = (themeToEdit?: CustomTheme) => {
    setThemeEditorTarget(themeToEdit?.id ?? 'create');
    closeSettings();
    onOpenThemeEditor?.(themeToEdit);
  };

  useEffect(() => {
    if (!paletteFeedback) return;

    const timeout = window.setTimeout(() => setPaletteFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [paletteFeedback]);

  useEffect(() => {
    if (
      !pendingWidgetFocus ||
      config?.activeWorkspaceId !== pendingWidgetFocus.workspaceId
    )
      return;
    const frame = window.requestAnimationFrame(() => {
      const widget = Array.from(
        document.querySelectorAll<HTMLElement>('[data-widget-id]'),
      ).find(
        (element) => element.dataset.widgetId === pendingWidgetFocus.widgetId,
      );
      widget?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      widget?.focus({ preventScroll: true });
      setPendingWidgetFocus(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [config?.activeWorkspaceId, pendingWidgetFocus]);

  const openPalette = () => {
    setHasOpenedPalette(true);
    setIsPaletteOpen(true);
  };

  const toggleEditing = () => {
    const nextValue = !isEditing;
    onEditingChange(nextValue);

    if (!nextValue) {
      closeSettings();
      setIsAddWidgetOpen(false);
      setIsPaletteOpen(false);
      setIsWorkspaceMenuOpen(false);
    }
  };

  const shortcutTitle = (label: string, command: ShortcutCommand) => {
    const keys = getShortcutLabel(command, config?.shortcuts);
    return keys ? `${label} (${keys})` : label;
  };

  useDashboardShortcuts({
    shortcuts: config?.shortcuts,
    canManageWidgets,
    isEditing,
    isHelpOpen: settingsSection === 'shortcuts',
    onToggleEditing: toggleEditing,
    onOpenHelp: () => openSettings('shortcuts'),
    onCloseHelp: closeSettings,
    onOpenAddWidget: () => setIsAddWidgetOpen(true),
    onOpenAppearance: () => openSettings('appearance'),
    onOpenBackup: () => openSettings('backup'),
    onOpenPalette: openPalette,
    onToggleToolbar:
      toolbar.mode === 'left-collapsible' ? toolbarState.toggle : undefined,
    onOpenWorkspaceMenu: () => {
      toolbarState.expand();
      setIsWorkspaceMenuOpen((open) => !open);
    },
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
        openSettings('appearance');
      }
      if (command.action === 'about') {
        openSettings('about');
      }
      if (command.action === 'backup' && !isWallpaperUpdating) {
        openSettings('backup');
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
        openSettings('workspaces');
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
      setSettingsSection(
        command.section === 'toolbar' ? 'interface' : 'appearance',
      );
    } else if (command.kind === 'add') {
      if (command.widgetType === 'markdown') {
        setIsMarkdownTemplateOpen(true);
      } else {
        onAddWidget(command.widgetType);
      }
      if (!isEditing) onEditingChange(true);
    } else if (command.kind === 'note') {
      onSwitchWorkspace?.(command.workspaceId);
      setPendingWidgetFocus({
        workspaceId: command.workspaceId,
        widgetId: command.widgetId,
      });
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
      if (command.href.startsWith('file:')) {
        void openLocalFileLink(command.href).then((result) => {
          if (!result.opened && result.message) {
            setPaletteFeedback(result.message);
          }
        });
      } else {
        window.location.assign(command.href);
      }
    }
  };

  return (
    <>
      <MotionNotice
        className="fixed bottom-4 left-1/2 z-30 max-w-[calc(100vw-2rem)] rounded-md border border-theme-border bg-theme-surface px-3 py-2 text-sm shadow-lg"
        message={
          paletteFeedback ?? (settingsSection === null ? workspaceNotice : null)
        }
        role="status"
      />
      <DashboardToolbar
        toggleShortcut={getShortcutLabel('toolbar', config?.shortcuts)}
        mode={toolbar.mode}
        isOpen={toolbarState.isOpen}
        toolbarId={toolbarState.toolbarId}
        panelRef={toolbarState.panelRef}
        revealRef={toolbarState.revealRef}
        isInteracting={isLayoutInteracting}
        canManage={canManageWidgets}
        onExpand={() => toolbarState.expand(true)}
        onCollapse={() => toolbarState.collapse()}
      >
        {workspaces && workspaces.length > 0 && onSwitchWorkspace ? (
          <WorkspaceSelector
            toggleShortcut={getShortcutLabel('workspace', config?.shortcuts)}
            compact={isLeft}
            placement={isLeft ? 'right' : 'below-end'}
            toolbarOwner={toolbarState.toolbarId}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId ?? null}
            canManage={canManageWidgets}
            isOpen={isWorkspaceMenuOpen}
            onOpenChange={setIsWorkspaceMenuOpen}
            onSwitchWorkspace={onSwitchWorkspace}
            onAddWorkspace={onAddWorkspace ?? (() => {})}
            onRenameWorkspace={onRenameWorkspace ?? (() => {})}
            onDuplicateWorkspace={onDuplicateWorkspace ?? (() => {})}
            onDeleteWorkspace={requestWorkspaceDelete}
            onOpenManager={() => openSettings('workspaces')}
          />
        ) : null}

        <div
          aria-hidden={!isEditing}
          className="edit-controls items-center gap-2"
          data-visible={isEditing}
          inert={!isEditing}
        >
          <IconButton
            className="!p-0"
            aria-label="Отменить изменение"
            disabled={!canManageWidgets || !canUndo}
            size="small"
            title="Отменить изменение (Ctrl+Z)"
            variant="ghost"
            onClick={onUndo}
          >
            <UndoIcon className="size-6 shrink-0" />
          </IconButton>
          <IconButton
            className="!p-0"
            aria-label="Повторить изменение"
            disabled={!canManageWidgets || !canRedo}
            size="small"
            title="Повторить изменение (Ctrl+Shift+Z)"
            variant="ghost"
            onClick={onRedo}
          >
            <RedoIcon className="size-6 shrink-0" />
          </IconButton>
          {selectedCount > 0 ? (
            <div
              className={classNames(
                'toolbar-selection flex items-center gap-1 rounded-lg border border-theme-border',
                isLeft ? 'w-10 border-0 py-1' : 'px-2 py-0.5',
              )}
            >
              <span
                aria-label={`Выбрано виджетов: ${selectedCount}`}
                title={`Выбрано: ${selectedCount}`}
                className="max-w-full truncate whitespace-nowrap text-xs text-theme-text-secondary"
              >
                {isLeft ? selectedCount : `Выбрано: ${selectedCount}`}
              </span>
              <IconButton
                className="!p-0"
                aria-label="Копировать выбранные виджеты"
                disabled={!canManageWidgets}
                size={isLeft ? 'small' : 'xs'}
                title="Копировать (Ctrl+C)"
                variant="ghost"
                onClick={onCopySelection}
              >
                <CopyIcon className="size-6 shrink-0" />
              </IconButton>
              <IconButton
                className="!p-0"
                aria-label="Дублировать выбранные виджеты"
                disabled={!canManageWidgets}
                size={isLeft ? 'small' : 'xs'}
                title={shortcutTitle('Дублировать', 'duplicate')}
                variant="ghost"
                onClick={onDuplicateSelection}
              >
                <DuplicateIcon className="size-6 shrink-0" />
              </IconButton>
              <IconButton
                className="!p-0"
                aria-label="Удалить выбранные виджеты"
                disabled={!canManageWidgets}
                size={isLeft ? 'small' : 'xs'}
                title={shortcutTitle('Удалить', 'delete')}
                variant="danger-ghost"
                onClick={onRequestDeleteSelection}
              >
                <TrashIcon className="size-6 shrink-0" />
              </IconButton>
            </div>
          ) : null}
          <Button
            aria-label="Добавить виджет"
            className={isLeft ? 'size-10 shrink-0 !p-0' : undefined}
            disabled={!canManageWidgets}
            size="small"
            title={shortcutTitle('Добавить виджет', 'add')}
            variant={isLeft ? 'ghost' : 'secondary'}
            onClick={() => setIsAddWidgetOpen(true)}
          >
            <PlusIcon className="size-6 shrink-0" />
            {!isLeft && 'Добавить виджет'}
          </Button>
        </div>

        <IconButton
          className="!p-0"
          aria-label="Настройки"
          disabled={!canManageWidgets || isBackupProcessing}
          size="small"
          title={shortcutTitle('Настройки', 'settings')}
          variant="ghost"
          onClick={() => {
            openSettings('appearance');
          }}
        >
          <PaletteIcon className="size-6 shrink-0" />
        </IconButton>
        <IconButton
          className="!p-0"
          aria-label="Импорт и экспорт"
          disabled={!canManageWidgets || isWallpaperUpdating}
          size="small"
          title={shortcutTitle('Импорт и экспорт', 'backup')}
          variant="ghost"
          onClick={() => {
            openSettings('backup');
          }}
        >
          <TransferIcon className="size-6 shrink-0" />
        </IconButton>
        <IconButton
          className="!p-0"
          aria-label="Поиск команд"
          disabled={!canManageWidgets}
          size="small"
          title={shortcutTitle('Поиск команд', 'palette')}
          variant="ghost"
          onClick={openPalette}
        >
          <SearchIcon className="size-6 shrink-0" />
        </IconButton>

        <IconButton
          className="!p-0"
          aria-label="Горячие клавиши"
          size="small"
          title={shortcutTitle('Горячие клавиши', 'help')}
          variant="ghost"
          onClick={() => openSettings('shortcuts')}
        >
          <KeyboardIcon className="size-6 shrink-0" />
        </IconButton>

        <IconButton
          className="!p-0"
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
              ? `Завершить редактирование (Esc${getShortcutLabel('edit', config?.shortcuts) ? ` или ${getShortcutLabel('edit', config?.shortcuts)}` : ''})`
              : shortcutTitle('Включить режим редактирования', 'edit')
          }
          variant="ghost"
          onClick={toggleEditing}
        >
          {isEditing ? (
            <CheckIcon className="size-6 shrink-0" />
          ) : (
            <PencilIcon className="size-6 shrink-0" />
          )}
        </IconButton>
      </DashboardToolbar>

      <SettingsPanel
        preferences={config?.settingsPanel}
        onPreferencesChange={(settingsPanel) =>
          onInterfacePreferencesChange({ settingsPanel })
        }
        open={settingsSection !== null}
        section={settingsSection ?? 'appearance'}
        onSectionChange={openSettings}
        onOpenChange={(open) => {
          if (!open) closeSettings();
        }}
        returnFocusFallback={toolbarState.getReturnFocus}
        disabledSections={[
          ...(!canManageWidgets
            ? (['appearance', 'interface', 'workspaces'] as const)
            : []),
          ...(isWallpaperUpdating ? (['backup'] as const) : []),
        ]}
      >
        <Suspense
          fallback={
            <p role="status" className="text-sm text-theme-text-secondary">
              Загрузка раздела…
            </p>
          }
        >
          {settingsSection === 'about' && <AboutSettings />}
          {settingsSection === 'appearance' && (
            <AppearanceSettings
              appearance={appearance}
              customThemes={config?.customThemes ?? []}
              requestedSection={requestedSection}
              requestedThemeEditor={
                requestedSection?.token === reopenAppearanceToken
                  ? themeEditorTarget
                  : undefined
              }
              isWallpaperUpdating={isWallpaperUpdating}
              wallpaperError={wallpaperError}
              wallpaperPreviewSrc={wallpaperPreviewSrc}
              onAppearanceChange={onAppearanceChange}
              onAppearancePreview={onAppearancePreview}
              onClearWallpaperError={onClearWallpaperError}
              onRemoveWallpaper={onRemoveWallpaper}
              onSetWallpaperEnabled={onSetWallpaperEnabled}
              onSetLocalWallpaper={onSetLocalWallpaper}
              onSetUrlWallpaper={onSetUrlWallpaper}
              onSelectTheme={onSelectTheme}
              onOpenThemeEditor={handleOpenThemeEditor}
              onDuplicateCustomTheme={onDuplicateCustomTheme}
              onDeleteCustomTheme={onDeleteCustomTheme}
              onFlushAppearancePreview={onFlushAppearancePreview}
            />
          )}
          {settingsSection === 'interface' && (
            <InterfaceSettings
              requestedSection={requestedSection}
              toolbar={toolbar}
              animationMode={config?.animationMode}
              interfaceTextScale={config?.interfaceTextScale}
              onInterfaceTextScaleChange={(interfaceTextScale) =>
                onInterfacePreferencesChange({ interfaceTextScale })
              }
              onAnimationModeChange={(animationMode) =>
                onInterfacePreferencesChange({ animationMode })
              }
              onToolbarChange={onToolbarChange}
            />
          )}
          {settingsSection === 'backup' && (
            <BackupSettings
              error={backupError}
              isProcessing={isBackupProcessing}
              onClearError={onClearBackupError}
              onExport={onExportDashboard}
              onImport={onImportDashboard}
            />
          )}
          {settingsSection === 'shortcuts' && (
            <ShortcutsHelp
              shortcuts={config?.shortcuts}
              onChange={(shortcuts) =>
                onInterfacePreferencesChange({ shortcuts })
              }
            />
          )}
          {settingsSection === 'workspaces' &&
            workspaces &&
            onReorderWorkspaces && (
              <WorkspaceSettings
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspaceId ?? null}
                onSwitchWorkspace={onSwitchWorkspace ?? (() => {})}
                onAddWorkspace={onAddWorkspace ?? (() => {})}
                onRenameWorkspace={onRenameWorkspace ?? (() => {})}
                onDuplicateWorkspace={onDuplicateWorkspace ?? (() => {})}
                onDeleteWorkspace={requestWorkspaceDelete}
                onReorderWorkspaces={onReorderWorkspaces}
                trashedWorkspaces={config?.trashedWorkspaces}
                onRestoreWorkspace={(id) => void restoreWorkspace(id)}
                onPurgeWorkspace={requestWorkspacePurge}
                isProcessing={isWidgetActionProcessing}
                notice={workspaceNotice}
                error={workspaceAction ? null : workspaceError}
              />
            )}
        </Suspense>
      </SettingsPanel>
      {workspaceAction ? (
        <ConfirmWorkspaceDeleteDialog
          workspace={workspaceAction.workspace}
          kind={workspaceAction.kind}
          isProcessing={isWidgetActionProcessing}
          error={workspaceError}
          onCancel={() => {
            if (!isWidgetActionProcessing) setWorkspaceAction(null);
          }}
          onConfirm={() => void confirmWorkspaceAction()}
          returnFocusFallback={workspaceReturnFocus}
        />
      ) : null}
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
