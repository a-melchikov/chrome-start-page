import { Button, Dialog } from '../ui';

interface AddWidgetPlaceholderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddWidgetPlaceholderDialog({
  open,
  onOpenChange,
}: AddWidgetPlaceholderDialogProps) {
  return (
    <Dialog
      footer={<Button onClick={() => onOpenChange(false)}>Понятно</Button>}
      open={open}
      title="Добавить виджет"
      onOpenChange={onOpenChange}
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Выбор типов виджетов появится на следующем этапе.
      </p>
    </Dialog>
  );
}
