import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { CloseIcon } from '../icons';
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
  size?: DialogSize;
  showCloseButton?: boolean;
};

export type DialogSize = 'compact' | 'default' | 'fullscreen' | 'launcher';

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  closeLabel = 'Закрыть',
  size = 'default',
  showCloseButton = true,
  className,
  children,
  onKeyDown,
  ...props
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isFullscreen = size === 'fullscreen';
  const isCompact = size === 'compact';
  const isLauncher = size === 'launcher';

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      if (!returnFocusRef.current?.isConnected) {
        returnFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      }

      dialog.showModal();
      const focusTarget =
        dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]') ??
        dialog.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
      focusTarget?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      dialog.close();

      if (returnFocusRef.current?.isConnected) {
        returnFocusRef.current.focus({ preventScroll: true });
      }

      returnFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

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

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    onKeyDown?.(event);

    if (!event.defaultPrevented && event.key === 'Escape') {
      event.preventDefault();
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
        'p-0 text-theme-text-primary',
        isFullscreen
          ? 'm-0 h-dvh max-h-dvh w-screen max-w-none overflow-hidden rounded-none border-0 bg-theme-surface shadow-2xl backdrop:bg-black/50'
          : isLauncher
            ? 'fixed top-[4.5rem] left-1/2 m-0 max-h-[calc(100dvh-5rem)] w-[min(30rem,calc(100vw-2rem))] max-w-none -translate-x-1/2 overflow-visible border-0 bg-transparent shadow-none backdrop:bg-black/20 min-[36rem]:top-4 min-[36rem]:max-h-[calc(100dvh-2rem)] min-[36rem]:w-[min(30rem,calc(100vw-22.25rem))]'
            : isCompact
              ? 'm-auto max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl backdrop:bg-black/50'
              : 'm-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-theme-border bg-theme-surface shadow-2xl backdrop:bg-black/50',
        className,
      )}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div
        className={classNames(
          'flex flex-col',
          isFullscreen
            ? 'h-full max-h-dvh'
            : isLauncher
              ? 'max-h-[calc(100dvh-5rem)] min-[36rem]:max-h-[calc(100dvh-2rem)]'
              : 'max-h-[calc(100dvh-2rem)]',
        )}
      >
        {isFullscreen || isLauncher ? (
          <div className="sr-only">
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
        ) : (
          <header
            className={classNames(
              'flex shrink-0 items-start justify-between gap-4 px-5',
              isCompact ? 'pt-5 pb-1' : 'pt-5 pb-2',
            )}
          >
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold">
                {title}
              </h2>
              {description ? (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm text-theme-text-secondary"
                >
                  {description}
                </p>
              ) : null}
            </div>
            {showCloseButton ? (
              <IconButton
                aria-label={closeLabel}
                size="xs"
                title={closeLabel}
                variant="ghost"
                onClick={close}
              >
                <CloseIcon className="size-5" />
              </IconButton>
            ) : null}
          </header>
        )}
        {children ? (
          <div
            className={classNames(
              'min-h-0',
              isFullscreen
                ? 'flex-1 overflow-hidden'
                : isLauncher
                  ? 'overflow-hidden'
                  : isCompact
                    ? 'overflow-y-auto overscroll-contain px-5 py-2'
                    : 'overflow-y-auto overscroll-contain px-5 py-3',
            )}
          >
            {children}
          </div>
        ) : null}
        {footer ? (
          <footer
            className={classNames(
              'shrink-0 px-5 pb-5',
              isCompact
                ? 'grid grid-cols-2 gap-3 pt-4'
                : 'flex flex-wrap justify-end gap-2 pt-3',
            )}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
