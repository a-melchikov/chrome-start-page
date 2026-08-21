import type { Layout, LayoutItem } from 'react-grid-layout';

import type { WidgetConfig } from '../../storage/schema';
import type { WidgetLayout } from '../../widgets/types';

export const DASHBOARD_GRID_COLUMNS = 12;
export const DASHBOARD_GRID_ROW_HEIGHT = 48;
export const DASHBOARD_GRID_GAP = 16;
export const DASHBOARD_CANVAS_MIN_WIDTH = 960;
export const WIDGET_MIN_WIDTH = 3;
export const WIDGET_MIN_HEIGHT = 3;

export function getDashboardGridWidth(containerWidth: number): number {
  return Math.max(containerWidth, DASHBOARD_CANVAS_MIN_WIDTH);
}

function finiteInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

export function normalizeWidgetLayout(layout: WidgetLayout): WidgetLayout {
  const w = Math.min(
    DASHBOARD_GRID_COLUMNS,
    Math.max(WIDGET_MIN_WIDTH, finiteInteger(layout.w, WIDGET_MIN_WIDTH)),
  );
  const h = Math.max(
    WIDGET_MIN_HEIGHT,
    finiteInteger(layout.h, WIDGET_MIN_HEIGHT),
  );
  const x = Math.min(
    DASHBOARD_GRID_COLUMNS - w,
    Math.max(0, finiteInteger(layout.x, 0)),
  );
  const y = Math.max(0, finiteInteger(layout.y, 0));

  return { x, y, w, h };
}

export function createGridLayout(widgets: readonly WidgetConfig[]): Layout {
  return widgets.map(({ id, layout }) => ({
    i: id,
    ...normalizeWidgetLayout(layout),
    minW: WIDGET_MIN_WIDTH,
    minH: WIDGET_MIN_HEIGHT,
  }));
}

function toWidgetLayout(item: LayoutItem): WidgetLayout {
  return normalizeWidgetLayout({
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  });
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

    const nextLayout = toWidgetLayout(gridItem);

    if (layoutsEqual(widget.layout, nextLayout)) {
      return widget;
    }

    hasChanges = true;
    return { ...widget, layout: nextLayout };
  });

  return hasChanges ? nextWidgets : widgets;
}
