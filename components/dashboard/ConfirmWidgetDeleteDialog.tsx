import { Button, Dialog } from '../ui';

interface ConfirmWidgetDeleteDialogProps {
  open: boolean;
  widgetName: string;
  widgetCount?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmWidgetDeleteDialog({
  open,
  widgetName,
  widgetCount,
  onCancel,
  onConfirm,
}: ConfirmWidgetDeleteDialogProps) {
  const countLabel = widgetCount
    ? `${widgetCount} ${
        widgetCount % 10 === 1 && widgetCount % 100 !== 11
          ? 'виджет будет удалён'
          : [2, 3, 4].includes(widgetCount % 10) &&
              !(widgetCount % 100 >= 12 && widgetCount % 100 <= 14)
            ? 'виджета будут удалены'
            : 'виджетов будут удалены'
      }. Действие можно отменить.`
    : null;
  return (
    <Dialog
      description={
        countLabel ??
        `Виджет «${widgetName}» будет удалён. Действие можно отменить.`
      }
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
      title={widgetCount ? 'Удалить выбранные виджеты?' : 'Удалить виджет?'}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    />
  );
}
