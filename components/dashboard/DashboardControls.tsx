import { useState } from 'react';

import { useDashboardShortcuts } from '../../hooks/use-dashboard-shortcuts';
import type {
  DashboardBackupDownload,
  DashboardImportResult,
} from '../../storage/dashboard-backup';
import type { AppearanceConfig, WidgetType } from '../../storage/schema';
import {
  HelpCircleIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  TransferIcon,
} from '../icons';
import { Button, IconButton } from '../ui';
import { AddWidgetDialog } from './AddWidgetDialog';
import { AppearanceDialog } from './AppearanceDialog';
import { BackupDialog } from './BackupDialog';
import { ShortcutsHelpDialog } from './ShortcutsHelpDialog';

interface DashboardControlsProps {
  appearance: AppearanceConfig;
  backupError: string | null;
  canManageWidgets: boolean;
  isBackupProcessing: boolean;
  isEditing: boolean;
  isWallpaperUpdating: boolean;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onAddWidget: (type: WidgetType) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onAppearancePreview: (changes: Partial<AppearanceConfig>) => void;
  onClearBackupError: () => void;
  onClearWallpaperError: () => void;
  onEditingChange: (isEditing: boolean) => void;
  onExportDashboard: () => Promise<DashboardBackupDownload>;
  onFlushAppearancePreview: () => void;
  onImportDashboard: (
    file: File,
    signal?: AbortSignal,
  ) => Promise<DashboardImportResult>;
  onRemoveWallpaper: () => Promise<void>;
  onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
}

export function DashboardControls({
  appearance,
  backupError,
  canManageWidgets,
  isBackupProcessing,
  isEditing,
  isWallpaperUpdating,
  wallpaperError,
  wallpaperPreviewSrc,
  onAddWidget,
  onAppearanceChange,
  onAppearancePreview,
  onClearBackupError,
  onClearWallpaperError,
  onEditingChange,
  onExportDashboard,
  onFlushAppearancePreview,
  onImportDashboard,
  onRemoveWallpaper,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
}: DashboardControlsProps) {
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const toggleEditing = () => {
    const nextValue = !isEditing;
    onEditingChange(nextValue);

    if (!nextValue) {
      setIsAppearanceOpen(false);
      setIsAddWidgetOpen(false);
      setIsBackupOpen(false);
      setIsHelpOpen(false);
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
    onOpenAppearance: () => setIsAppearanceOpen(true),
    onOpenBackup: () => {
      onClearBackupError();
      setIsBackupOpen(true);
    },
  });

  return (
    <>
      <div className="fixed top-4 right-4 z-10 flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-2 rounded-xl border border-theme-border bg-theme-surface p-1 shadow-lg">
        {isEditing ? (
          <>
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
              onClick={() => setIsAppearanceOpen(true)}
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
          </>
        ) : null}

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

      <AppearanceDialog
        appearance={appearance}
        isWallpaperUpdating={isWallpaperUpdating}
        open={isAppearanceOpen}
        wallpaperError={wallpaperError}
        wallpaperPreviewSrc={wallpaperPreviewSrc}
        onAppearanceChange={onAppearanceChange}
        onAppearancePreview={onAppearancePreview}
        onClearWallpaperError={onClearWallpaperError}
        onFlushAppearancePreview={onFlushAppearancePreview}
        onOpenChange={setIsAppearanceOpen}
        onRemoveWallpaper={onRemoveWallpaper}
        onSetLocalWallpaper={onSetLocalWallpaper}
        onSetUrlWallpaper={onSetUrlWallpaper}
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
      <AddWidgetDialog
        open={isAddWidgetOpen}
        onSelectWidgetType={onAddWidget}
        onOpenChange={setIsAddWidgetOpen}
      />
      <ShortcutsHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
    </>
  );
}
