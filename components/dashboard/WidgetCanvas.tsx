import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GridLayout,
  noCompactor,
  useContainerWidth,
  type Compactor,
  type Layout,
} from 'react-grid-layout';

import type { WidgetConfig } from '../../storage/schema';
import { ConfirmWidgetDeleteDialog } from './ConfirmWidgetDeleteDialog';
import {
  applyGridLayout,
  createGridLayout,
  DASHBOARD_CANVAS_MIN_WIDTH,
  DASHBOARD_GRID_COLUMNS,
  DASHBOARD_GRID_GAP,
  DASHBOARD_GRID_ROW_HEIGHT,
  getDashboardGridWidth,
} from './dashboard-layout';
import { WidgetHost } from './WidgetHost';
import {
  getWidgetDisplayName,
  type RenderableWidgetConfig,
} from './widget-display';

interface WidgetCanvasProps {
  editingWidgetId: string | null;
  isEditing: boolean;
  widgets: readonly WidgetConfig[];
  onFinishWidgetEditing: () => void;
  onRemoveWidget: (widgetId: string) => void;
  onStartWidgetEditing: (widgetId: string) => void;
  onUpdateWidget: (widget: WidgetConfig) => void;
  onUpdateWidgetLayouts: (widgets: readonly WidgetConfig[]) => void;
}

const collisionBlockingCompactor: Compactor = {
  ...noCompactor,
  preventCollision: true,
};

export function WidgetCanvas({
  editingWidgetId,
  isEditing,
  widgets,
  onFinishWidgetEditing,
  onRemoveWidget,
  onStartWidgetEditing,
  onUpdateWidget,
  onUpdateWidgetLayouts,
}: WidgetCanvasProps) {
  const [widgetPendingDelete, setWidgetPendingDelete] =
    useState<RenderableWidgetConfig | null>(null);
  const { containerRef, measureWidth, mounted, width } = useContainerWidth({
    initialWidth: DASHBOARD_CANVAS_MIN_WIDTH,
  });
  const gridLayout = useMemo(() => createGridLayout(widgets), [widgets]);
  const persistGridLayout = useCallback(
    (nextGridLayout: Layout) => {
      const nextWidgets = applyGridLayout(widgets, nextGridLayout);

      if (nextWidgets !== widgets) {
        onUpdateWidgetLayouts(nextWidgets);
      }
    },
    [onUpdateWidgetLayouts, widgets],
  );

  useEffect(() => {
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, [measureWidth]);

  const confirmDelete = () => {
    if (!widgetPendingDelete) {
      return;
    }

    onRemoveWidget(widgetPendingDelete.id);
    setWidgetPendingDelete(null);
  };

  if (widgets.length === 0) {
    return null;
  }

  return (
    <>
      <section aria-label="Виджеты" className="overflow-x-auto px-6 pt-20 pb-6">
        <div
          ref={containerRef}
          className="min-w-[60rem]"
          data-dashboard-canvas="desktop"
        >
          {mounted ? (
            <GridLayout
              className={isEditing ? 'dashboard-grid--editing' : undefined}
              compactor={collisionBlockingCompactor}
              dragConfig={{
                enabled: isEditing,
                bounded: true,
                handle: '.widget-drag-handle',
                cancel: 'button, input, textarea, a',
              }}
              gridConfig={{
                cols: DASHBOARD_GRID_COLUMNS,
                rowHeight: DASHBOARD_GRID_ROW_HEIGHT,
                margin: [DASHBOARD_GRID_GAP, DASHBOARD_GRID_GAP],
                containerPadding: [0, 0],
              }}
              layout={gridLayout}
              resizeConfig={{ enabled: isEditing, handles: ['se'] }}
              width={getDashboardGridWidth(width)}
              onDragStop={persistGridLayout}
              onResizeStop={persistGridLayout}
            >
              {widgets.map((widget) => (
                <div key={widget.id} className="min-w-0">
                  <WidgetHost
                    isEditing={isEditing}
                    isWidgetEditing={editingWidgetId === widget.id}
                    widget={widget}
                    onRequestEdit={() => onStartWidgetEditing(widget.id)}
                    onRequestDelete={setWidgetPendingDelete}
                    onRequestFinishEditing={onFinishWidgetEditing}
                    onWidgetChange={onUpdateWidget}
                  />
                </div>
              ))}
            </GridLayout>
          ) : null}
        </div>
      </section>

      <ConfirmWidgetDeleteDialog
        open={widgetPendingDelete !== null}
        widgetName={
          widgetPendingDelete
            ? getWidgetDisplayName(widgetPendingDelete)
            : 'Виджет'
        }
        onCancel={() => setWidgetPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
