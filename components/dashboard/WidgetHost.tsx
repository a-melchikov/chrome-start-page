import {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import type { WidgetConfig } from '../../storage/schema';
import { getWidgetDefinition } from '../../widgets/registry';
import { CloseIcon, ExpandIcon, PencilIcon } from '../icons';
import { Dialog, IconButton } from '../ui';
import { classNames } from '../ui/class-names';
import {
  getWidgetDisplayName,
  type RenderableWidgetConfig,
} from './widget-display';
import { useWidgetPointerLight } from './use-widget-pointer-light';
import { WidgetAppearanceContext } from './widget-appearance-context';
import { WidgetAppearanceSettings } from './WidgetAppearanceSettings';
import { DEFAULT_WIDGET_BORDER_RADIUS } from '../../storage/defaults';
import { isWidgetConfig } from '../../storage/migrations';
import { resolveWidgetGlass } from '../../storage/widget-appearance';

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
  const inheritedAppearance = useContext(WidgetAppearanceContext);
  const glass = resolveWidgetGlass(
    inheritedAppearance.liquidGlass,
    widget.appearance?.liquidGlass,
  );
  const widgetStyle = {
    '--widget-border-radius': `${widget.appearance?.borderRadius ?? inheritedAppearance.widgetBorderRadius ?? DEFAULT_WIDGET_BORDER_RADIUS}px`,
    '--liquid-glass-opacity': 1 - glass.transparency / 100,
    '--liquid-glass-blur': `${glass.blur}px`,
    '--liquid-glass-shadow': glass.shadow / 100,
  } as CSSProperties;
  const titleId = useId();
  const readerDialogId = useId();
  const [headerActionsTarget, setHeaderActionsTarget] =
    useState<HTMLDivElement | null>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const [shouldRestoreEditFocus, setShouldRestoreEditFocus] = useState(false);
  const [isEditorExiting, setIsEditorExiting] = useState(false);
  const [readerState, setReaderState] = useState<'closed' | 'open' | 'closing'>(
    'closed',
  );
  const pointerLight = useWidgetPointerLight(
    isEditing ||
      isWidgetEditing ||
      readerState !== 'closed' ||
      !glass.enabled ||
      glass.pointerLight !== true,
  );
  const definition = getWidgetDefinition(widget.type);
  const displayName = getWidgetDisplayName(widget);
  const visibleTitle =
    definition?.presentation.emptyTitle === 'blank'
      ? (widget.title?.trim() ?? '')
      : displayName;
  const content = definition?.render(
    widget,
    onWidgetChange,
    headerActionsTarget,
  );
  const reader = definition?.renderReader?.(widget);
  if ((!reader || isWidgetEditing) && readerState !== 'closed') {
    setReaderState('closed');
  }
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
  const isAnalogClock = widget.type === 'analog-clock';
  const isWeather = widget.type === 'weather';
  const isVisualWeather =
    widget.type === 'weather' &&
    'mode' in widget &&
    (widget as { mode?: unknown }).mode === 'visual';
  const isTitleHidden = isClock || isAnalogClock || isWeather;
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
  const handleReaderExited = useCallback(() => setReaderState('closed'), []);
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
  const imageControlClass =
    '!rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur-md hover:bg-black/70 hover:text-white active:bg-black/80';
  const readerButton = reader ? (
    <IconButton
      aria-label={'Развернуть виджет «' + displayName + '»'}
      aria-haspopup="dialog"
      aria-expanded={readerState === 'open'}
      aria-controls={readerDialogId}
      className={classNames(
        'widget-reader-button',
        isImageWithSource
          ? imageControlClass
          : 'text-theme-text-secondary hover:text-theme-text-primary',
      )}
      disabled={isWidgetEditing || isEditorExiting}
      size="xs"
      title={'Развернуть для чтения: ' + displayName}
      variant="ghost"
      onClick={() => setReaderState('open')}
    >
      <ExpandIcon className="size-[18px]" />
    </IconButton>
  ) : null;
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
              ? imageControlClass
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
  const widgetControls = (
    <div
      className={classNames(
        'flex shrink-0 items-center gap-1',
        isEditing &&
          isBare &&
          !isOverlayControls &&
          'pr-8 [&_button]:w-7 [&_button]:!p-0',
      )}
    >
      {readerButton}
      {controls}
    </div>
  );

  return (
    <>
      <article
        {...pointerLight}
        data-widget-id={widget.id}
        data-widget-glass={glass.enabled}
        data-widget-pointer-light={glass.pointerLight === true}
        style={widgetStyle}
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
        aria-label={
          isBare || isTitleHidden || !visibleTitle ? displayName : undefined
        }
        aria-labelledby={
          isBare || isTitleHidden || !visibleTitle ? undefined : titleId
        }
        className={classNames(
          'relative flex h-full min-w-0',
          isNew && 'new-widget',
          isBare
            ? isOverlayControls
              ? 'flex-col overflow-hidden widget-rounded'
              : 'items-center overflow-visible'
            : classNames(
                'widget-card-surface liquid-glass-surface flex-col overflow-hidden widget-rounded',
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
            <div className="relative h-full w-full overflow-hidden widget-rounded">
              {!hasImage ? (
                <button
                  type="button"
                  aria-label="Настроить изображение"
                  disabled={isEditing || isWidgetEditing || !onRequestEdit}
                  className="h-full w-full min-w-0 cursor-pointer widget-rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring disabled:pointer-events-none"
                  inert={isEditing ? true : undefined}
                  onClick={startEditing}
                >
                  {content ?? fallback}
                </button>
              ) : (
                <div
                  className={classNames(
                    'widget-content h-full w-full min-w-0',
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
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 p-0.5">
                {readerButton}
                <div
                  aria-hidden={!isEditing}
                  className="edit-controls"
                  data-visible={isEditing}
                  inert={!isEditing}
                >
                  {controls}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full items-center gap-2">
              <div
                className={classNames(
                  'widget-content min-w-0 flex-1',
                  isEditing && 'pointer-events-none select-none',
                )}
                inert={isEditing ? true : undefined}
              >
                {content ?? fallback}
              </div>
              {isEditing || readerButton ? widgetControls : null}
            </div>
          )
        ) : isTitleHidden ? (
          <>
            <div className="absolute right-2 top-2 z-10 rounded-lg p-0.5">
              {widgetControls}
            </div>
            <div
              className={classNames(
                'widget-content min-h-0 min-w-0 flex-1',
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
                aria-hidden={!visibleTitle || undefined}
                className={classNames(
                  'theme-glow min-w-0 flex-1 truncate font-semibold text-theme-text-primary',
                  definition?.presentation.titleStyle === 'prominent'
                    ? 'text-xl'
                    : 'text-sm',
                )}
                style={definition?.getTitleStyle?.(widget)}
                id={titleId}
                title={visibleTitle || undefined}
              >
                {visibleTitle}
              </h2>
              <div
                ref={setHeaderActionsTarget}
                className="flex shrink-0 items-center gap-1 empty:hidden"
                data-no-drag
              />
              {widgetControls}
            </header>
            <div
              className={classNames(
                'widget-content min-h-0 min-w-0 flex-1',
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

      {reader && readerState !== 'closed' ? (
        <Dialog
          id={readerDialogId}
          role="dialog"
          data-no-drag
          open={readerState === 'open'}
          size="fullscreen"
          title={'Просмотр: ' + displayName}
          onExited={handleReaderExited}
          onOpenChange={(open) => setReaderState(open ? 'open' : 'closing')}
        >
          <div className="flex h-full min-h-0 flex-col bg-theme-surface text-theme-text-primary">
            <header className="flex shrink-0 items-center gap-3 border-b border-theme-border px-4 py-3 sm:px-6">
              <h2
                aria-hidden={!visibleTitle || undefined}
                className="min-w-0 flex-1 truncate text-lg font-semibold"
                title={visibleTitle || undefined}
              >
                {visibleTitle}
              </h2>
              <span className="hidden shrink-0 text-xs text-theme-text-secondary sm:inline">
                Esc — вернуться
              </span>
              <IconButton
                data-dialog-initial-focus
                aria-label="Закрыть просмотр"
                size="xs"
                variant="ghost"
                title="Закрыть просмотр (Esc)"
                onClick={() => setReaderState('closing')}
              >
                <CloseIcon className="size-5" />
              </IconButton>
            </header>
            <div className="widget-content min-h-0 flex-1 overflow-hidden">
              <Suspense
                fallback={
                  <p
                    className="p-6 text-sm text-theme-text-secondary"
                    role="status"
                  >
                    Загрузка просмотра…
                  </p>
                }
              >
                {reader}
              </Suspense>
            </div>
          </div>
        </Dialog>
      ) : null}

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
            <div
              className={classNames(
                'flex min-h-0 flex-col',
                definition?.presentation.editorDialogSize === 'fullscreen' &&
                  'h-full',
              )}
            >
              {onWidgetChange && isWidgetConfig(widget) && (
                <WidgetAppearanceSettings
                  value={widget.appearance}
                  onChange={(appearance) => {
                    const next = { ...widget };
                    if (appearance) next.appearance = appearance;
                    else delete next.appearance;
                    onWidgetChange(next);
                  }}
                />
              )}
              <div className="min-h-0 flex-1">{editor}</div>
            </div>
          </Dialog>
        </Suspense>
      ) : null}
    </>
  );
}
