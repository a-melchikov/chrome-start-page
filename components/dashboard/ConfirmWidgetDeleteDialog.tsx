import { Button, Dialog } from '../ui';

interface ConfirmWidgetDeleteDialogProps {
  open: boolean;
  widgetName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmWidgetDeleteDialog({
  open,
  widgetName,
  onCancel,
  onConfirm,
}: ConfirmWidgetDeleteDialogProps) {
  return (
    <Dialog
      description={`Виджет «${widgetName}» будет удалён без возможности отмены.`}
      footer={
        <>
          <Button
            data-dialog-initial-focus
            size="small"
            variant="secondary"
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button size="small" variant="danger" onClick={onConfirm}>
            Удалить
          </Button>
        </>
      }
      open={open}
      showCloseButton={false}
      size="compact"
      title="Удалить виджет?"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    />
  );
}
