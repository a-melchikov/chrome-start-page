import { describe, expect, it } from 'vitest';

import {
  applyGridLayout,
  createGridLayout,
  DASHBOARD_GRID_COLUMNS,
  getDashboardGridWidth,
  normalizeWidgetLayout,
  WIDGET_MIN_HEIGHT,
  WIDGET_MIN_WIDTH,
} from '../../components/dashboard/dashboard-layout';
import type { WidgetConfig } from '../../storage/schema';

function createWidget(
  id: string,
  layout: WidgetConfig['layout'],
): WidgetConfig {
  return {
    id,
    type: 'markdown',
    title: id,
    content: `[${id}](${id}.example.com)`,
    layout,
  };
}

function createSearchWidget(
  id: string,
  layout: WidgetConfig['layout'],
): WidgetConfig {
  return {
    id,
    type: 'search',
    title: '',
    engine: 'google',
    layout,
  };
}

describe('dashboard layout', () => {
  it('converts persisted widget layouts to constrained grid items', () => {
    expect(
      createGridLayout([createWidget('first', { x: 2, y: 4, w: 5, h: 6 })]),
    ).toEqual([
      {
        i: 'first',
        x: 2,
        y: 4,
        w: 5,
        h: 6,
        minW: WIDGET_MIN_WIDTH,
        minH: WIDGET_MIN_HEIGHT,
        resizeHandles: ['se'],
      },
    ]);
  });

  it('fixes SearchWidget height and exposes only its east resize handle', () => {
    expect(
      createGridLayout([
        createSearchWidget('search', { x: 2, y: 4, w: 6, h: 3 }),
      ]),
    ).toEqual([
      {
        i: 'search',
        x: 2,
        y: 4,
        w: 6,
        h: 1,
        minW: 3,
        minH: 1,
        maxH: 1,
        resizeHandles: ['e'],
      },
    ]);
  });

  it('normalizes sizes and positions without exceeding the desktop grid', () => {
    expect(normalizeWidgetLayout({ x: -4, y: -2, w: 1, h: 0 })).toEqual({
      x: 0,
      y: 0,
      w: WIDGET_MIN_WIDTH,
      h: WIDGET_MIN_HEIGHT,
    });
    expect(normalizeWidgetLayout({ x: 11, y: 2.4, w: 8, h: 4.6 })).toEqual({
      x: 4,
      y: 2,
      w: 8,
      h: 5,
    });
    expect(normalizeWidgetLayout({ x: 0, y: 0, w: 99, h: 3 }).w).toBe(
      DASHBOARD_GRID_COLUMNS,
    );
  });

  it.each([1920, 1440, 1366])(
    'uses the available canvas width at a %ipx viewport',
    (width) => {
      expect(getDashboardGridWidth(width)).toBe(width);
    },
  );

  it('keeps a non-destructive desktop canvas in a narrow window', () => {
    expect(getDashboardGridWidth(320)).toBe(960);
    expect(getDashboardGridWidth(768)).toBe(960);
  });

  it('applies all positions from a completed grid interaction by widget id', () => {
    const widgets = [
      createWidget('first', { x: 0, y: 0, w: 4, h: 3 }),
      createWidget('second', { x: 4, y: 0, w: 4, h: 3 }),
    ];

    const result = applyGridLayout(widgets, [
      { i: 'second', x: 0, y: 5, w: 6, h: 4 },
      { i: 'first', x: 6, y: 1, w: 6, h: 3 },
    ]);

    expect(result.map(({ id, layout }) => ({ id, layout }))).toEqual([
      { id: 'first', layout: { x: 6, y: 1, w: 6, h: 3 } },
      { id: 'second', layout: { x: 0, y: 5, w: 6, h: 4 } },
    ]);
  });

  it('preserves widget data and returns the same collection when unchanged', () => {
    const widgets = [
      createWidget('first', { x: 0, y: 0, w: 4, h: 3 }),
      createWidget('second', { x: 4, y: 0, w: 4, h: 3 }),
    ];

    const unchanged = applyGridLayout(widgets, createGridLayout(widgets));
    expect(unchanged).toBe(widgets);

    const changed = applyGridLayout(widgets, [
      { i: 'first', x: 1, y: 2, w: 4, h: 3 },
    ]);
    expect(changed[0]).toMatchObject({
      title: 'first',
      content: '[first](first.example.com)',
      layout: { x: 1, y: 2, w: 4, h: 3 },
    });
    expect(changed[1]).toBe(widgets[1]);
  });

  it('applies horizontal SearchWidget resizing without changing its height', () => {
    const widgets = [createSearchWidget('search', { x: 0, y: 0, w: 6, h: 1 })];

    const result = applyGridLayout(widgets, [
      { i: 'search', x: 1, y: 2, w: 8, h: 4 },
    ]);

    expect(result[0]?.layout).toEqual({ x: 1, y: 2, w: 8, h: 1 });
  });
});
