import { useEffect, useRef } from 'react';
import type { WorkspaceConfig } from '../../storage/schema';
import { Button, Dialog } from '../ui';

interface ConfirmWorkspaceDeleteDialogProps {
  workspace: WorkspaceConfig;
  kind: 'trash' | 'purge';
  isProcessing: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  returnFocusFallback: () => HTMLElement | null;
}

export function ConfirmWorkspaceDeleteDialog({
  workspace,
  kind,
  isProcessing,
  error,
  onCancel,
  onConfirm,
  returnFocusFallback,
}: ConfirmWorkspaceDeleteDialogProps) {
  const isPermanent = kind === 'purge';
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error && !isProcessing)
      errorRef.current?.focus({ preventScroll: true });
  }, [error, isProcessing]);
  return (
    <Dialog
      open
      size="compact"
      showCloseButton={false}
      title={
        isPermanent
          ? 'Удалить пространство навсегда?'
          : 'Переместить пространство в корзину?'
      }
      description={
        <>
          <span className="break-words font-medium">«{workspace.name}»</span>.
          Виджетов: {workspace.widgets.length}.
        </>
      }
      returnFocusFallback={returnFocusFallback}
      onOpenChange={(open) => {
        if (!open && !isProcessing) onCancel();
      }}
      footer={
        <>
          <Button
            data-dialog-initial-focus
            size="small"
            variant="secondary"
            disabled={isProcessing}
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button
            size="small"
            variant="danger"
            disabled={isProcessing}
            onClick={onConfirm}
          >
            {isProcessing
              ? isPermanent
                ? 'Удаляем…'
                : 'Перемещаем…'
              : isPermanent
                ? 'Удалить навсегда'
                : 'В корзину'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-theme-text-secondary">
        {isPermanent
          ? 'Пространство и его содержимое исчезнут из корзины. Восстановить их без резервной копии не получится.'
          : 'Виджеты и оформление сохранятся. Восстановить пространство можно в разделе «Настройки → Пространства → Корзина». Оно хранится до явного удаления из корзины.'}
      </p>
      {error ? (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-2 rounded-sm text-sm text-theme-danger outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
        >
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
