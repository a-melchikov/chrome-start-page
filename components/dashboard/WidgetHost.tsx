import { useEffect, useId, useRef, useState } from 'react';

import type { WidgetConfig } from '../../storage/schema';
import { getWidgetDefinition } from '../../widgets/registry';
import { Button } from '../ui';
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

  return (
    <article
      aria-labelledby={titleId}
      className="relative flex h-full min-h-40 min-w-0 flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/95"
    >
      <header
        className={`mb-3 flex min-h-8 shrink-0 items-start justify-between gap-3 ${isEditing ? 'widget-drag-handle cursor-move select-none' : ''}`}
      >
        <h2
          className="min-w-0 flex-1 truncate pt-1.5 text-sm font-semibold"
          id={titleId}
          title={displayName}
        >
          {displayName}
        </h2>
        {isEditing ? (
          <div
            aria-label="Управление виджетом"
            className="flex shrink-0 flex-wrap items-center justify-end gap-2"
            role="toolbar"
          >
            {definition?.renderEditor && !isWidgetEditing && onRequestEdit ? (
              <Button
                ref={editButtonRef}
                aria-label={`Редактировать виджет «${displayName}»`}
                size="small"
                variant="secondary"
                onClick={startEditing}
              >
                Изменить
              </Button>
            ) : null}
            <Button
              aria-label={`Удалить виджет «${displayName}»`}
              size="small"
              variant="danger"
              onClick={() => onRequestDelete(widget)}
            >
              Удалить
            </Button>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain">
        {editor ?? content ?? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Неподдерживаемый тип виджета: {widget.type}
          </p>
        )}
      </div>
    </article>
  );
}
