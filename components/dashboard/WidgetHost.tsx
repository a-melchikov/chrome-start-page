import { getWidgetDefinition } from '../../widgets/registry';
import { Button } from '../ui';
import {
  getWidgetDisplayName,
  type RenderableWidgetConfig,
} from './widget-display';

interface WidgetHostProps {
  isEditing: boolean;
  widget: RenderableWidgetConfig;
  onRequestDelete: (widget: RenderableWidgetConfig) => void;
}

export function WidgetHost({
  isEditing,
  widget,
  onRequestDelete,
}: WidgetHostProps) {
  const definition = getWidgetDefinition(widget.type);
  const displayName = getWidgetDisplayName(widget);
  const content = definition?.render(widget);

  return (
    <article
      aria-label={displayName}
      className="relative min-h-40 overflow-hidden rounded-xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/90"
    >
      <header className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <h2 className="truncate text-sm font-semibold">{displayName}</h2>
        {isEditing ? (
          <div aria-label="Управление виджетом" role="toolbar">
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

      {content ?? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Неподдерживаемый тип виджета: {widget.type}
        </p>
      )}
    </article>
  );
}
