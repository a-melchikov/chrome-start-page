import { useEffect, useState } from 'react';

import type { AppearanceConfig, WidgetType } from '../../storage/schema';
import { PaletteIcon, PencilIcon, PlusIcon } from '../icons';
import { Button, IconButton } from '../ui';
import { AddWidgetDialog } from './AddWidgetDialog';
import { AppearanceDialog } from './AppearanceDialog';

interface DashboardControlsProps {
  appearance: AppearanceConfig;
  canManageWidgets: boolean;
  isEditing: boolean;
  isWallpaperUpdating: boolean;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onAddWidget: (type: WidgetType) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onAppearancePreview: (changes: Partial<AppearanceConfig>) => void;
  onClearWallpaperError: () => void;
  onEditingChange: (isEditing: boolean) => void;
  onFlushAppearancePreview: () => void;
  onRemoveWallpaper: () => Promise<void>;
  onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
}

export function DashboardControls({
  appearance,
  canManageWidgets,
  isEditing,
  isWallpaperUpdating,
  wallpaperError,
  wallpaperPreviewSrc,
  onAddWidget,
  onAppearanceChange,
  onAppearancePreview,
  onClearWallpaperError,
  onEditingChange,
  onFlushAppearancePreview,
  onRemoveWallpaper,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
}: DashboardControlsProps) {
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const exitEditingOnEscape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault();
        onEditingChange(false);
      }
    };

    window.addEventListener('keydown', exitEditingOnEscape);
    return () => window.removeEventListener('keydown', exitEditingOnEscape);
  }, [isEditing, onEditingChange]);

  const toggleEditing = () => {
    const nextValue = !isEditing;
    onEditingChange(nextValue);

    if (!nextValue) {
      setIsAppearanceOpen(false);
      setIsAddWidgetOpen(false);
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-10 flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-2 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        {isEditing ? (
          <>
            <Button
              disabled={!canManageWidgets}
              size="small"
              variant="secondary"
              onClick={() => setIsAddWidgetOpen(true)}
            >
              <PlusIcon className="size-7" />
              Добавить виджет
            </Button>
            <IconButton
              aria-label="Настройки оформления"
              disabled={!canManageWidgets}
              size="small"
              title="Настройки оформления"
              variant="ghost"
              onClick={() => setIsAppearanceOpen(true)}
            >
              <PaletteIcon className="size-7" />
            </IconButton>
          </>
        ) : null}

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
              ? 'Выключить режим редактирования (Esc)'
              : 'Включить режим редактирования'
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
      <AddWidgetDialog
        open={isAddWidgetOpen}
        onSelectWidgetType={onAddWidget}
        onOpenChange={setIsAddWidgetOpen}
      />
    </>
  );
}
