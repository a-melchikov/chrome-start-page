import type { ComponentType } from 'react';

import type { WidgetType } from '../../storage/schema';
import { getAvailableWidgetDefinitions } from '../../widgets/registry';
import { ClockIcon, DocumentTextIcon, SearchIcon } from '../icons';
import { Button, Dialog } from '../ui';

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWidgetType: (type: WidgetType) => void;
}

const WIDGET_ICONS: Record<
  WidgetType,
  ComponentType<{ className?: string }>
> = {
  markdown: DocumentTextIcon,
  search: SearchIcon,
  pomodoro: ClockIcon,
};

export function AddWidgetDialog({
  open,
  onOpenChange,
  onSelectWidgetType,
}: AddWidgetDialogProps) {
  const selectWidgetType = (type: WidgetType) => {
    onSelectWidgetType(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} title="Добавить виджет" onOpenChange={onOpenChange}>
      <div className="space-y-2 pb-2">
        {getAvailableWidgetDefinitions().map((definition, index) => {
          const Icon = WIDGET_ICONS[definition.type];

          return (
            <Button
              key={definition.type}
              className="w-full justify-start gap-2.5"
              data-dialog-initial-focus={index === 0 ? true : undefined}
              size="small"
              variant="secondary"
              onClick={() => selectWidgetType(definition.type)}
            >
              {Icon ? (
                <Icon className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
              ) : null}
              <span>{definition.metadata.name}</span>
            </Button>
          );
        })}
      </div>
    </Dialog>
  );
}
