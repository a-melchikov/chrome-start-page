import { getWidgetDefinition } from '../../widgets/registry';
import type { WidgetConfig } from '../../storage/schema';
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
  const definition = getWidgetDefinition(widget.type);
  const displayName = getWidgetDisplayName(widget);
  const content = definition?.render(widget);
  const editor =
    isWidgetEditing && onWidgetChange && onRequestFinishEditing
      ? definition?.renderEditor?.(
          widget,
          onWidgetChange,
          onRequestFinishEditing,
        )
      : null;

  return (
    <article
      aria-label={displayName}
      className="relative min-h-40 overflow-hidden rounded-xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/90"
    >
      <header className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <h2 className="truncate text-sm font-semibold">{displayName}</h2>
        {isEditing ? (
          <div
            aria-label="Управление виджетом"
            className="flex items-center gap-2"
            role="toolbar"
          >
            {definition?.renderEditor && !isWidgetEditing && onRequestEdit ? (
              <Button
                aria-label={`Редактировать виджет «${displayName}»`}
                size="small"
                variant="secondary"
                onClick={onRequestEdit}
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

      {editor ?? content ?? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Неподдерживаемый тип виджета: {widget.type}
        </p>
      )}
    </article>
  );
}
