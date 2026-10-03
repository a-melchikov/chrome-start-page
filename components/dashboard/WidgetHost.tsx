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
  isSelected?: boolean;
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
  isSelected = false,
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
  const isVisualWeather =
    widget.type === 'weather' &&
    'mode' in widget &&
    (widget as { mode?: unknown }).mode === 'visual';
  const isTitleHidden = isClock || isWeather;
  const isImageWithSource = isOverlayControls && hasImage;
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
  const enterEndRef = useRef(onWidgetEnterEnd);
  useEffect(() => {
    enterEndRef.current = onWidgetEnterEnd;
  }, [onWidgetEnterEnd]);

  useEffect(() => {
    if (!isNew) return;
    // Also clear the entrance flag if animation events are unavailable or cancelled.
    const timer = window.setTimeout(() => enterEndRef.current?.(), 250);
    return () => window.clearTimeout(timer);
  }, [isNew]);

  useEffect(() => {
    if (shouldRestoreEditFocus && !isWidgetEditing && editButtonRef.current) {
      editButtonRef.current.focus({ preventScroll: true });
    }
  }, [isWidgetEditing, shouldRestoreEditFocus]);

  const fallback = (
    <p className="text-sm text-theme-text-secondary">
      Неподдерживаемый тип виджета: {widget.type}
    </p>
  );
  const controls = (
    <div
      aria-label="Управление виджетом"
      aria-hidden={!isEditing}
      className={classNames(
        'shrink-0 items-center justify-end',
        isImageWithSource ? 'gap-1.5' : 'gap-1',
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
          className={
            isImageWithSource
              ? '!rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-md hover:bg-black/70 hover:text-white active:bg-black/80'
              : isVisualWeather
                ? 'text-white/85 hover:bg-white/15 hover:text-white active:bg-white/25'
                : 'text-theme-text-secondary hover:text-theme-text-primary'
          }
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
          isImageWithSource
            ? '!rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-md hover:border-red-400/50 hover:bg-red-500/80 hover:text-white active:bg-red-600/90'
            : isVisualWeather
              ? 'text-white/85 hover:bg-red-500/25 hover:text-red-400 active:bg-red-500/35'
              : undefined
        }
        size="xs"
        title={`Удалить виджет «${displayName}»`}
        variant={
          isImageWithSource || isVisualWeather ? 'ghost' : 'danger-ghost'
        }
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
        data-selected={isEditing && isSelected ? 'true' : undefined}
        tabIndex={isEditing ? 0 : -1}
        aria-description={
          isEditing
            ? isSelected
              ? 'Выбран. Пробел снимает выделение.'
              : 'Пробел выбирает виджет.'
            : undefined
        }
        aria-label={isBare || isTitleHidden ? displayName : undefined}
        aria-labelledby={isBare || isTitleHidden ? undefined : titleId}
        className={classNames(
          'relative flex h-full min-w-0',
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
          isEditing && isSelected && 'widget-selected',
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
              {!hasImage ? (
                <button
                  type="button"
                  aria-label="Настроить изображение"
                  disabled={isEditing || isWidgetEditing || !onRequestEdit}
                  className="h-full w-full min-w-0 cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring disabled:pointer-events-none"
                  inert={isEditing ? true : undefined}
                  onClick={startEditing}
                >
                  {content ?? fallback}
                </button>
              ) : (
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
              )}
              <div
                aria-hidden={!isEditing}
                className="edit-controls absolute right-2 top-2 z-10 p-0.5"
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
            <div className="absolute right-2 top-2 z-10 rounded-lg p-0.5">
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
            description="Изменения сохраняются автоматически"
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
