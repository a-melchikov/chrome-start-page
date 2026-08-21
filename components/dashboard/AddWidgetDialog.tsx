import type { WidgetType } from '../../storage/schema';
import { getAvailableWidgetDefinitions } from '../../widgets/registry';
import { Button, Dialog } from '../ui';

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWidgetType: (type: WidgetType) => void;
}

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
    <Dialog
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
      }
      open={open}
      title="Добавить виджет"
      onOpenChange={onOpenChange}
    >
      <div className="space-y-2">
        {getAvailableWidgetDefinitions().map((definition, index) => (
          <Button
            key={definition.type}
            className="w-full justify-start"
            data-dialog-initial-focus={index === 0 ? true : undefined}
            variant="secondary"
            onClick={() => selectWidgetType(definition.type)}
          >
            {definition.metadata.name}
          </Button>
        ))}
      </div>
    </Dialog>
  );
}
