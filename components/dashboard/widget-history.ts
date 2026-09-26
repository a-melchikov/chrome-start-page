import type { WidgetConfig } from '../../storage/schema';
import type { WidgetLayout } from '../../widgets/types';

export const WIDGET_HISTORY_LIMIT = 50;

export interface PositionedWidget {
  widget: WidgetConfig;
  index: number;
}

export type WidgetHistoryEntry =
  | {
      kind: 'layout';
      before: ReadonlyMap<string, WidgetLayout>;
      after: ReadonlyMap<string, WidgetLayout>;
    }
  | {
      kind: 'insert' | 'remove';
      items: readonly PositionedWidget[];
    };

export function createLayoutHistoryEntry(
  before: readonly WidgetConfig[],
  after: readonly WidgetConfig[],
): WidgetHistoryEntry | null {
  const afterById = new Map(after.map((widget) => [widget.id, widget]));
  const oldLayouts = new Map<string, WidgetLayout>();
  const newLayouts = new Map<string, WidgetLayout>();

  for (const widget of before) {
    const next = afterById.get(widget.id);
    if (
      next &&
      (widget.layout.x !== next.layout.x ||
        widget.layout.y !== next.layout.y ||
        widget.layout.w !== next.layout.w ||
        widget.layout.h !== next.layout.h)
    ) {
      oldLayouts.set(widget.id, widget.layout);
      newLayouts.set(widget.id, next.layout);
    }
  }

  return oldLayouts.size > 0
    ? { kind: 'layout', before: oldLayouts, after: newLayouts }
    : null;
}

export function applyWidgetHistoryEntry(
  widgets: readonly WidgetConfig[],
  entry: WidgetHistoryEntry,
  direction: 'undo' | 'redo',
): { widgets: WidgetConfig[]; entry: WidgetHistoryEntry } {
  if (entry.kind === 'layout') {
    const layouts = direction === 'undo' ? entry.before : entry.after;
    return {
      widgets: widgets.map((widget) => {
        const layout = layouts.get(widget.id);
        return layout ? { ...widget, layout } : widget;
      }),
      entry,
    };
  }

  const shouldInsert =
    (entry.kind === 'remove' && direction === 'undo') ||
    (entry.kind === 'insert' && direction === 'redo');

  if (shouldInsert) {
    const next = [...widgets];
    for (const item of [...entry.items].sort((a, b) => a.index - b.index)) {
      if (!next.some((widget) => widget.id === item.widget.id)) {
        next.splice(Math.min(item.index, next.length), 0, item.widget);
      }
    }
    return { widgets: next, entry };
  }

  const ids = new Set(entry.items.map(({ widget }) => widget.id));
  const captured = widgets.flatMap((widget, index) =>
    ids.has(widget.id) ? [{ widget, index }] : [],
  );

  return {
    widgets: widgets.filter((widget) => !ids.has(widget.id)),
    entry: { ...entry, items: captured.length > 0 ? captured : entry.items },
  };
}

export function collectHistoryWidgets(
  entries: readonly WidgetHistoryEntry[],
): WidgetConfig[] {
  return entries.flatMap((entry) =>
    entry.kind === 'layout' ? [] : entry.items.map(({ widget }) => widget),
  );
}
