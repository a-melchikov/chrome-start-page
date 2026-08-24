import { useEffect, useId, useRef, useState } from 'react';

import type { WidgetConfig } from '../../storage/schema';
import { getWidgetDefinition } from '../../widgets/registry';
import { CloseIcon, PencilIcon } from '../icons';
import { Dialog, IconButton } from '../ui';
import { classNames } from '../ui/class-names';
import {
  getWidgetDisplayName,
  type RenderableWidgetConfig,
} from './widget-display';

interface WidgetHostProps {
  isEditing: boolean;
  isWidgetEditing?: boolean;
  widget: RenderableWidgetConfig;
  onRequestEdit?: () => void;
  onRequestDelete: (widget: RenderableWidgetConfig) => void;
  onRequestFinishEditing?: () => void;
  onWidgetChange?: (widget: WidgetConfig) => void;
}

export function WidgetHost({
  isEditing,
  isWidgetEditing = false,
  widget,
  onRequestEdit,
  onRequestDelete,
  onRequestFinishEditing,
  onWidgetChange,
}: WidgetHostProps) {
  const titleId = useId();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [shouldRestoreEditFocus, setShouldRestoreEditFocus] = useState(false);
  const definition = getWidgetDefinition(widget.type);
  const displayName = getWidgetDisplayName(widget);
  const content = definition?.render(widget);
  const isBare = definition?.presentation.chrome === 'bare';
  const usesDialogEditor = definition?.presentation.editor === 'dialog';
  const finishEditing = () => {
    setShouldRestoreEditFocus(true);
    onRequestFinishEditing?.();
  };
  const startEditing = () => {
    setShouldRestoreEditFocus(false);
    onRequestEdit?.();
  };
  const editor =
    isWidgetEditing && onWidgetChange && onRequestFinishEditing
      ? definition?.renderEditor?.(widget, onWidgetChange, finishEditing)
      : null;

  useEffect(() => {
    if (shouldRestoreEditFocus && !isWidgetEditing && editButtonRef.current) {
      editButtonRef.current.focus({ preventScroll: true });
    }
  }, [isWidgetEditing, shouldRestoreEditFocus]);

  const fallback = (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      Неподдерживаемый тип виджета: {widget.type}
    </p>
  );
  const controls = isEditing ? (
    <div
      aria-label="Управление виджетом"
      className={classNames(
        'flex shrink-0 flex-wrap items-center justify-end gap-2',
        isBare &&
          'absolute right-0 bottom-full z-20 mb-2 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900',
      )}
      role="toolbar"
    >
      {definition?.renderEditor && !isWidgetEditing && onRequestEdit ? (
        <IconButton
          ref={editButtonRef}
          aria-label={`Редактировать виджет «${displayName}»`}
          size="small"
          title={`Редактировать виджет «${displayName}»`}
          variant="secondary"
          onClick={startEditing}
        >
          <PencilIcon className="size-7" />
        </IconButton>
      ) : null}
      <IconButton
        aria-label={`Удалить виджет «${displayName}»`}
        size="small"
        title={`Удалить виджет «${displayName}»`}
        variant="danger-ghost"
        onClick={() => onRequestDelete(widget)}
      >
        <CloseIcon className="size-7" />
      </IconButton>
    </div>
  ) : null;

  return (
    <>
      <article
        aria-label={isBare ? displayName : undefined}
        aria-labelledby={isBare ? undefined : titleId}
        className={classNames(
          'relative flex h-full min-w-0',
          isBare
            ? 'items-center overflow-visible'
            : 'min-h-40 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900',
          isEditing && 'cursor-move',
        )}
      >
        {isBare ? (
          <>
            {controls}
            <div className="min-w-0 flex-1">{content ?? fallback}</div>
          </>
        ) : (
          <>
            <header className="mb-3 flex min-h-8 shrink-0 items-start justify-between gap-3">
              <h2
                className="min-w-0 flex-1 truncate pt-1.5 text-sm font-semibold"
                id={titleId}
                title={displayName}
              >
                {displayName}
              </h2>
              {controls}
            </header>
            <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain">
              {editor ?? content ?? fallback}
            </div>
          </>
        )}
      </article>

      {isBare && usesDialogEditor && editor ? (
        <Dialog
          open={isWidgetEditing}
          title={definition?.presentation.editorTitle ?? displayName}
          onOpenChange={(open) => {
            if (!open) {
              finishEditing();
            }
          }}
        >
          {editor}
        </Dialog>
      ) : null}
    </>
  );
}
