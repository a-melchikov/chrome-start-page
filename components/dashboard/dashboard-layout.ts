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
