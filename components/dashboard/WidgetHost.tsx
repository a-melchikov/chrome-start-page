import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

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
  isNew?: boolean;
  isWidgetEditing?: boolean;
  widget: RenderableWidgetConfig;
  onRequestEdit?: () => void;
  onRequestDelete: (widget: RenderableWidgetConfig) => void;
  onRequestFinishEditing?: () => void;
  onWidgetChange?: (widget: WidgetConfig) => void;
  onWidgetEnterEnd?: () => void;
}

export function WidgetHost({
  isEditing,
  isNew = false,
  isWidgetEditing = false,
  widget,
  onRequestEdit,
  onRequestDelete,
  onRequestFinishEditing,
  onWidgetChange,
  onWidgetEnterEnd,
}: WidgetHostProps) {
  const titleId = useId();
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [shouldRestoreEditFocus, setShouldRestoreEditFocus] = useState(false);
  const [isEditorExiting, setIsEditorExiting] = useState(false);
  const definition = getWidgetDefinition(widget.type);
  const displayName = getWidgetDisplayName(widget);
  const content = definition?.render(widget, onWidgetChange);
  const isBare = definition?.presentation.chrome === 'bare';
  const isFullBleedCard =
    !isBare && definition?.presentation.cardInset === 'none';
  const isOverlayControls =
    isBare && definition?.presentation.controlsPosition === 'overlay';
  const hasImage =
    widget.type === 'image' &&
    'source' in widget &&
    typeof (widget as { source?: unknown }).source === 'object' &&
    (widget as { source?: unknown }).source !== null &&
    'type' in ((widget as { source?: unknown }).source as object) &&
    (widget as { source: { type: string } }).source.type !== 'none';
  const isClock = widget.type === 'clock';
  const isWeather = widget.type === 'weather';
  const isTitleHidden = isClock || isWeather;
  const usesDialogEditor = definition?.presentation.editor === 'dialog';
  const finishEditing = () => {
    setShouldRestoreEditFocus(true);
    if (usesDialogEditor) setIsEditorExiting(true);
    onRequestFinishEditing?.();
  };
  const startEditing = () => {
    setShouldRestoreEditFocus(false);
    onRequestEdit?.();
  };
  const editor =
    (isWidgetEditing || isEditorExiting) &&
    onWidgetChange &&
    onRequestFinishEditing
      ? definition?.renderEditor?.(widget, onWidgetChange, finishEditing)
      : null;
  const handleEditorExited = useCallback(() => setIsEditorExiting(false), []);

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
  const controls = (
    <div
      aria-label="Управление виджетом"
      aria-hidden={!isEditing}
      className={classNames(
        'shrink-0 items-center justify-end gap-1',
        isOverlayControls ? 'flex' : 'edit-controls',
      )}
      data-visible={isEditing}
      inert={!isEditing}
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
  );

  return (
    <>
      <article
        data-widget-id={widget.id}
        data-new-widget={isNew || undefined}
        tabIndex={-1}
        aria-label={isBare || isTitleHidden ? displayName : undefined}
        aria-labelledby={isBare || isTitleHidden ? undefined : titleId}
        className={classNames(
          'relative flex h-full min-w-0 focus:outline-none focus:ring-2 focus:ring-theme-ring',
          isNew && 'new-widget',
          isBare
            ? isOverlayControls
              ? 'flex-col overflow-hidden rounded-xl'
              : 'items-center overflow-visible'
            : classNames(
                'widget-card-surface liquid-glass-surface flex-col overflow-hidden rounded-xl',
                isFullBleedCard ? 'widget-card-surface--full-bleed' : 'p-4',
              ),
          isEditing && 'cursor-move',
        )}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && isNew) {
            onWidgetEnterEnd?.();
          }
        }}
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
              <div
                aria-hidden={!isEditing}
                className={classNames(
                  'edit-controls absolute right-2 top-2 z-10 rounded-lg p-0.5 transition-colors',
                  hasImage &&
                    'border border-theme-border/50 bg-theme-surface/85 backdrop-blur-md shadow-xs',
                )}
                data-visible={isEditing}
                inert={!isEditing}
              >
                {controls}
              </div>
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
        ) : isTitleHidden ? (
          <>
            <div
              className={classNames(
                'absolute right-2 top-2 z-10 rounded-lg p-0.5',
                isEditing &&
                  isFullBleedCard &&
                  'border border-theme-border/70 bg-theme-surface-elevated shadow-sm',
              )}
            >
              {controls}
            </div>
            <div
              className={classNames(
                'min-h-0 min-w-0 flex-1',
                isClock
                  ? 'flex flex-col justify-center overflow-hidden'
                  : isWeather
                    ? 'flex flex-col overflow-hidden'
                    : 'overflow-auto overscroll-contain pr-1',
              )}
            >
              {(usesDialogEditor ? content : editor) ?? content ?? fallback}
            </div>
          </>
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
            <div
              className={classNames(
                'min-h-0 min-w-0 flex-1',
                isClock
                  ? 'flex flex-col justify-center overflow-hidden'
                  : 'overflow-auto overscroll-contain pr-1',
              )}
            >
              {(usesDialogEditor ? content : editor) ?? content ?? fallback}
            </div>
          </>
        )}
      </article>

      {usesDialogEditor && editor ? (
        <Suspense
          fallback={
            <p className="sr-only" role="status">
              Загрузка редактора…
            </p>
          }
        >
          <Dialog
            open={isWidgetEditing}
            onExited={handleEditorExited}
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
        </Suspense>
      ) : null}
    </>
  );
}
