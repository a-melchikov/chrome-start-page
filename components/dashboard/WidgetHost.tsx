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
  const content = definition?.render(widget, onWidgetChange);
  const isBare = definition?.presentation.chrome === 'bare';
  const isOverlayControls =
    isBare && definition?.presentation.controlsPosition === 'overlay';
  const hasImage =
    widget.type === 'image' &&
    'source' in widget &&
    typeof (widget as { source?: unknown }).source === 'object' &&
    (widget as { source?: unknown }).source !== null &&
    'type' in ((widget as { source?: unknown }).source as object) &&
    (widget as { source: { type: string } }).source.type !== 'none';
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
    <p className="text-sm text-theme-text-muted">
      Неподдерживаемый тип виджета: {widget.type}
    </p>
  );
  const controls = isEditing ? (
    <div
      aria-label="Управление виджетом"
      className="flex shrink-0 items-center justify-end gap-1"
      role="toolbar"
    >
      {definition?.renderEditor && !isWidgetEditing && onRequestEdit ? (
        <IconButton
          ref={editButtonRef}
          aria-label={`Редактировать виджет «${displayName}»`}
          className="text-theme-text-secondary hover:text-theme-text-primary"
          size="xs"
          title={`Редактировать виджет «${displayName}»`}
          variant="ghost"
          onClick={startEditing}
        >
          <PencilIcon className="size-[18px]" />
        </IconButton>
      ) : null}
      <IconButton
        aria-label={`Удалить виджет «${displayName}»`}
        className={
          isOverlayControls && hasImage
            ? 'text-theme-text-secondary hover:text-red-400'
            : undefined
        }
        size="xs"
        title={`Удалить виджет «${displayName}»`}
        variant="danger-ghost"
        onClick={() => onRequestDelete(widget)}
      >
        <CloseIcon className="size-[18px]" />
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
            ? isOverlayControls
              ? 'flex-col overflow-hidden rounded-xl'
              : 'items-center overflow-visible'
            : 'widget-card-surface liquid-glass-surface min-h-40 flex-col overflow-hidden rounded-xl p-4',
          isEditing && 'cursor-move',
        )}
      >
        {isBare ? (
          isOverlayControls ? (
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <div
                className={classNames(
                  'h-full w-full min-w-0',
                  isEditing && 'pointer-events-none select-none',
                  !isEditing && !hasImage && 'cursor-pointer',
                )}
                inert={isEditing ? true : undefined}
                onClick={
                  !isEditing && !hasImage && !isWidgetEditing && onRequestEdit
                    ? startEditing
                    : undefined
                }
              >
                {content ?? fallback}
              </div>
              {controls ? (
                <div
                  className={classNames(
                    'absolute right-2 top-2 z-10 rounded-lg p-0.5 transition-colors',
                    hasImage
                      ? 'border border-theme-border/50 bg-theme-surface/85 backdrop-blur-md shadow-xs'
                      : '',
                  )}
                >
                  {controls}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full w-full items-center gap-2">
              <div
                className={classNames(
                  'min-w-0 flex-1',
                  isEditing && 'pointer-events-none select-none',
                )}
                inert={isEditing ? true : undefined}
              >
                {content ?? fallback}
              </div>
              {controls}
            </div>
          )
        ) : (
          <>
            <header className="mb-3 flex min-h-8 shrink-0 items-center justify-between gap-2">
              <h2
                className={classNames(
                  'theme-glow min-w-0 flex-1 truncate font-semibold text-theme-text-primary',
                  definition?.presentation.titleStyle === 'prominent'
                    ? 'text-xl'
                    : 'text-sm',
                )}
                id={titleId}
                title={displayName}
              >
                {displayName}
              </h2>
              {controls}
            </header>
            <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain pr-1">
              {(usesDialogEditor ? content : editor) ?? content ?? fallback}
            </div>
          </>
        )}
      </article>

      {usesDialogEditor && editor ? (
        <Dialog
          open={isWidgetEditing}
          size={definition?.presentation.editorDialogSize}
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
