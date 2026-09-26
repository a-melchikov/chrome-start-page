import type { Layout, LayoutItem } from 'react-grid-layout';

import type { WidgetConfig } from '../../storage/schema';
import {
  getWidgetDefinition,
  type WidgetLayoutConstraints,
} from '../../widgets/registry';
import type { WidgetLayout } from '../../widgets/types';

export const DASHBOARD_GRID_COLUMNS = 12;
export const DASHBOARD_GRID_ROW_HEIGHT = 48;
export const DASHBOARD_GRID_GAP = 16;
export const DASHBOARD_CANVAS_MIN_WIDTH = 960;
export const WIDGET_MIN_WIDTH = 3;
export const WIDGET_MIN_HEIGHT = 3;

const DEFAULT_LAYOUT_CONSTRAINTS: WidgetLayoutConstraints = {
  minW: WIDGET_MIN_WIDTH,
  minH: WIDGET_MIN_HEIGHT,
  resizeHandles: ['se'],
};

export function getDashboardGridWidth(containerWidth: number): number {
  return Math.max(containerWidth, DASHBOARD_CANVAS_MIN_WIDTH);
}

function finiteInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

export function normalizeWidgetLayout(
  layout: WidgetLayout,
  constraints: WidgetLayoutConstraints = DEFAULT_LAYOUT_CONSTRAINTS,
): WidgetLayout {
  const maxWidth = DASHBOARD_GRID_COLUMNS;
  const w = Math.min(
    maxWidth,
    Math.max(constraints.minW, finiteInteger(layout.w, constraints.minW)),
  );
  const h = Math.min(
    constraints.maxH ?? Number.POSITIVE_INFINITY,
    Math.max(constraints.minH, finiteInteger(layout.h, constraints.minH)),
  );
  const x = Math.min(
    DASHBOARD_GRID_COLUMNS - w,
    Math.max(0, finiteInteger(layout.x, 0)),
  );
  const y = Math.max(0, finiteInteger(layout.y, 0));

  return { x, y, w, h };
}

export function createGridLayout(widgets: readonly WidgetConfig[]): Layout {
  return widgets.map(({ id, layout, type }) => {
    const constraints =
      getWidgetDefinition(type)?.presentation.layout ??
      DEFAULT_LAYOUT_CONSTRAINTS;

    return {
      i: id,
      ...normalizeWidgetLayout(layout, constraints),
      minW: constraints.minW,
      minH: constraints.minH,
      ...(constraints.maxH === undefined ? {} : { maxH: constraints.maxH }),
      resizeHandles: [...constraints.resizeHandles],
    };
  });
}

function toWidgetLayout(
  item: LayoutItem,
  constraints: WidgetLayoutConstraints,
): WidgetLayout {
  return normalizeWidgetLayout(
    {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    },
    constraints,
  );
}

function layoutsEqual(left: WidgetLayout, right: WidgetLayout): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.w === right.w &&
    left.h === right.h
  );
}

export function applyGridLayout(
  widgets: readonly WidgetConfig[],
  gridLayout: Layout,
): readonly WidgetConfig[] {
  const gridItemsById = new Map(gridLayout.map((item) => [item.i, item]));
  let hasChanges = false;

  const nextWidgets = widgets.map((widget) => {
    const gridItem = gridItemsById.get(widget.id);

    if (!gridItem) {
      return widget;
    }

    const constraints =
      getWidgetDefinition(widget.type)?.presentation.layout ??
      DEFAULT_LAYOUT_CONSTRAINTS;
    const nextLayout = toWidgetLayout(gridItem, constraints);

    if (layoutsEqual(widget.layout, nextLayout)) {
      return widget;
    }

    hasChanges = true;
    return { ...widget, layout: nextLayout };
  });

  return hasChanges ? nextWidgets : widgets;
}

function intersects(left: WidgetLayout, right: WidgetLayout): boolean {
  return (
    left.x < right.x + right.w &&
    left.x + left.w > right.x &&
    left.y < right.y + right.h &&
    left.y + left.h > right.y
  );
}

export function moveWidgetGroup(
  widgets: readonly WidgetConfig[],
  selectedIds: ReadonlySet<string>,
  deltaX: number,
  deltaY: number,
): readonly WidgetConfig[] {
  if (selectedIds.size === 0 || (deltaX === 0 && deltaY === 0)) {
    return widgets;
  }

  const selected = widgets.filter((widget) => selectedIds.has(widget.id));
  if (selected.length === 0) return widgets;

  const occupied = widgets.filter((widget) => !selectedIds.has(widget.id));
  const moved = selected.map((widget) => ({
    ...widget.layout,
    x: widget.layout.x + deltaX,
    y: widget.layout.y + deltaY,
  }));
  if (
    moved.some(
      (layout) =>
        layout.x < 0 ||
        layout.y < 0 ||
        layout.x + layout.w > DASHBOARD_GRID_COLUMNS ||
        occupied.some((widget) => intersects(layout, widget.layout)),
    )
  ) {
    return widgets;
  }

  const movedById = new Map(
    selected.map((widget, index) => [widget.id, moved[index]]),
  );
  return widgets.map((widget) => {
    const layout = movedById.get(widget.id);
    return layout ? { ...widget, layout } : widget;
  });
}

export function placeWidgetGroup(
  existing: readonly WidgetConfig[],
  source: readonly WidgetConfig[],
): WidgetConfig[] {
  if (source.length === 0) return [];

  const minX = Math.min(...source.map((widget) => widget.layout.x));
  const minY = Math.min(...source.map((widget) => widget.layout.y));
  const maxX = Math.max(
    ...source.map((widget) => widget.layout.x + widget.layout.w),
  );
  const groupWidth = maxX - minX;
  const preferredX = Math.min(DASHBOARD_GRID_COLUMNS - groupWidth, minX + 1);
  const preferredY = minY + 1;

  // Search by Manhattan distance. Within a distance prefer the upper row,
  // then the left column, for stable results across tabs and reloads.
  for (let distance = 0; ; distance += 1) {
    const candidates: Array<{ x: number; y: number }> = [];
    for (let x = 0; x <= DASHBOARD_GRID_COLUMNS - groupWidth; x += 1) {
      const vertical = distance - Math.abs(x - preferredX);
      if (vertical < 0) continue;
      for (const y of [preferredY - vertical, preferredY + vertical]) {
        if (
          y >= 0 &&
          !candidates.some((item) => item.x === x && item.y === y)
        ) {
          candidates.push({ x, y });
        }
      }
    }

    candidates.sort((a, b) => a.y - b.y || a.x - b.x);
    for (const candidate of candidates) {
      const placed = source.map((widget) => ({
        ...widget,
        layout: {
          ...widget.layout,
          x: candidate.x + widget.layout.x - minX,
          y: candidate.y + widget.layout.y - minY,
        },
      }));
      if (
        placed.every((widget) =>
          existing.every((other) => !intersects(widget.layout, other.layout)),
        )
      ) {
        return placed;
      }
    }
  }
}

export interface NewWidgetPositionOptions {
  w: number;
  x?: number;
}

export function calculateNextWidgetPosition(
  existingWidgets: readonly WidgetConfig[],
  newWidget: NewWidgetPositionOptions,
): { x: number; y: number } {
  const x = Math.max(0, finiteInteger(newWidget.x ?? 0, 0));
  const w = Math.max(1, finiteInteger(newWidget.w, WIDGET_MIN_WIDTH));
  const targetRight = x + w;

  const overlappingWidgets = existingWidgets.filter((widget) => {
    const widgetLeft = finiteInteger(widget.layout.x, 0);
    const widgetWidth = finiteInteger(widget.layout.w, WIDGET_MIN_WIDTH);
    const widgetRight = widgetLeft + widgetWidth;

    return widgetLeft < targetRight && widgetRight > x;
  });

  if (overlappingWidgets.length === 0) {
    return { x, y: 0 };
  }

  const maxY = Math.max(
    0,
    ...overlappingWidgets.map((widget) => {
      const top = Math.max(0, finiteInteger(widget.layout.y, 0));
      const height = Math.max(0, finiteInteger(widget.layout.h, 0));
      return top + height;
    }),
  );

  return { x, y: maxY };
}
