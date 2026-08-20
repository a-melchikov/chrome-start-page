import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { classNames } from './class-names';
import { IconButton } from './IconButton';

export type DialogProps = Omit<
  ComponentPropsWithoutRef<'dialog'>,
  'onCancel' | 'onClose' | 'open' | 'title'
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  closeLabel = 'Закрыть',
  className,
  children,
  ...props
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [open]);

  const close = () => onOpenChange(false);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    close();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  return (
    <dialog
      {...props}
      ref={dialogRef}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={classNames(
        'm-auto max-h-[calc(100vh-2rem)] w-[min(32rem,calc(100%-2rem))] rounded-xl border border-zinc-200 bg-white p-0 text-zinc-950 shadow-2xl backdrop:bg-black/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50',
        className,
      )}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"
              >
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            aria-label={closeLabel}
            size="small"
            variant="ghost"
            onClick={close}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </IconButton>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
