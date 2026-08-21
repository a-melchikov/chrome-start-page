import { useState } from 'react';

import type { AppearanceConfig } from '../../storage/schema';
import { PaletteIcon, PlusIcon } from '../icons';
import { Button, IconButton } from '../ui';
import { AddWidgetPlaceholderDialog } from './AddWidgetPlaceholderDialog';
import { AppearanceDialog } from './AppearanceDialog';

interface DashboardControlsProps {
  appearance: AppearanceConfig;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
}

export function DashboardControls({
  appearance,
  onAppearanceChange,
}: DashboardControlsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);

  const toggleEditing = () => {
    const nextValue = !isEditing;
    setIsEditing(nextValue);

    if (!nextValue) {
      setIsAppearanceOpen(false);
      setIsAddWidgetOpen(false);
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-10 flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white/90 p-1 shadow-lg backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/90">
        {isEditing ? (
          <>
            <Button
              size="small"
              variant="secondary"
              onClick={() => setIsAddWidgetOpen(true)}
            >
              <PlusIcon className="size-4" />
              Добавить виджет
            </Button>
            <IconButton
              aria-label="Настройки оформления"
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
      <AddWidgetPlaceholderDialog
        open={isAddWidgetOpen}
        onOpenChange={setIsAddWidgetOpen}
      />
    </>
  );
}
