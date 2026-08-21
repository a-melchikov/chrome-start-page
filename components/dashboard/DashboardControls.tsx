import { useState } from 'react';

import type { AppearanceConfig, WidgetType } from '../../storage/schema';
import { PaletteIcon, PlusIcon } from '../icons';
import { Button, IconButton } from '../ui';
import { AddWidgetDialog } from './AddWidgetDialog';
import { AppearanceDialog } from './AppearanceDialog';

interface DashboardControlsProps {
  appearance: AppearanceConfig;
  canManageWidgets: boolean;
  isEditing: boolean;
  onAddWidget: (type: WidgetType) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onEditingChange: (isEditing: boolean) => void;
}

export function DashboardControls({
  appearance,
  canManageWidgets,
  isEditing,
  onAddWidget,
  onAppearanceChange,
  onEditingChange,
}: DashboardControlsProps) {
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);

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
      <div className="fixed top-4 right-4 z-10 flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-end gap-2 rounded-xl border border-zinc-200/80 bg-white/95 p-1 shadow-lg backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/95">
        {isEditing ? (
          <>
            <Button
              disabled={!canManageWidgets}
              size="small"
              variant="secondary"
              onClick={() => setIsAddWidgetOpen(true)}
            >
              <PlusIcon className="size-4" />
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
              <PaletteIcon className="size-4" />
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
              ? 'Выключить режим редактирования'
              : 'Включить режим редактирования'
          }
          variant="primary"
          onClick={toggleEditing}
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ✎
          </span>
        </IconButton>
      </div>

      <AppearanceDialog
        appearance={appearance}
        open={isAppearanceOpen}
        onAppearanceChange={onAppearanceChange}
        onOpenChange={setIsAppearanceOpen}
      />
      <AddWidgetDialog
        open={isAddWidgetOpen}
        onSelectWidgetType={onAddWidget}
        onOpenChange={setIsAddWidgetOpen}
      />
    </>
  );
}
