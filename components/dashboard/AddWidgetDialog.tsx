import { useId, type ComponentType } from 'react';

import type { WidgetType } from '../../storage/schema';
import { getAvailableWidgetDefinitions } from '../../widgets/registry';
import {
  ClockIcon,
  CloudSunIcon,
  DocumentTextIcon,
  PhotoIcon,
  SearchIcon,
  TimerIcon,
} from '../icons';
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
  pomodoro: TimerIcon,
  image: PhotoIcon,
  clock: ClockIcon,
  weather: CloudSunIcon,
};

export function AddWidgetDialog({
  open,
  onOpenChange,
  onSelectWidgetType,
}: AddWidgetDialogProps) {
  const labelId = useId();
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
              aria-labelledby={`${labelId}-${definition.type}`}
              aria-describedby={`${labelId}-${definition.type}-description`}
              className="!h-auto min-h-14 w-full justify-start gap-3 py-3 text-left"
              data-dialog-initial-focus={index === 0 ? true : undefined}
              size="small"
              variant="secondary"
              onClick={() => selectWidgetType(definition.type)}
            >
              {Icon ? (
                <Icon className="size-5 shrink-0 text-theme-text-secondary" />
              ) : null}
              <span className="min-w-0">
                <span
                  id={`${labelId}-${definition.type}`}
                  className="block font-medium"
                >
                  {definition.metadata.name}
                </span>
                <span
                  id={`${labelId}-${definition.type}-description`}
                  className="mt-0.5 block text-xs font-normal text-theme-text-secondary"
                >
                  {definition.metadata.description}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </Dialog>
  );
}
