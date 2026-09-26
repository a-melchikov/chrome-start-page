import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react';
import {
  GridLayout,
  noCompactor,
  useContainerWidth,
  type Compactor,
  type Layout,
} from 'react-grid-layout';

import type { WidgetConfig } from '../../storage/schema';
import { ConfirmWidgetDeleteDialog } from './ConfirmWidgetDeleteDialog';
import { createDashboardDragConfig } from './dashboard-drag';
import {
  applyGridLayout,
  createGridLayout,
  DASHBOARD_CANVAS_MIN_WIDTH,
  DASHBOARD_GRID_COLUMNS,
  DASHBOARD_GRID_GAP,
  DASHBOARD_GRID_ROW_HEIGHT,
  getDashboardGridWidth,
  moveWidgetGroup,
} from './dashboard-layout';
import { WidgetHost } from './WidgetHost';
import {
  getWidgetDisplayName,
  type RenderableWidgetConfig,
} from './widget-display';

interface WidgetCanvasProps {
  editingWidgetId: string | null;
  isEditing: boolean;
  newWidgetIds: ReadonlySet<string>;
  selectedWidgetIds: ReadonlySet<string>;
  widgets: readonly WidgetConfig[];
  onClearSelection: () => void;
  onFinishWidgetEditing: () => void;
  onRemoveWidget: (widgetId: string) => void;
  onSelectWidget: (widgetId: string, additive: boolean) => void;
  onStartWidgetEditing: (widgetId: string) => void;
  onUpdateWidget: (widget: WidgetConfig) => void;
  onUpdateWidgetLayouts: (widgets: readonly WidgetConfig[]) => void;
  onWidgetEnterEnd: (widgetId: string) => void;
}

interface GroupDrag {
  widgetId: string;
  pointerId: number;
  startX: number;
  startY: number;
  startWidgets: readonly WidgetConfig[];
  lastWidgets: readonly WidgetConfig[];
  moved: boolean;
}

const collisionBlockingCompactor: Compactor = {
  ...noCompactor,
  preventCollision: true,
};

const INTERACTIVE_SELECTOR =
  'button, input, textarea, select, a, [contenteditable], [role="slider"], .react-resizable-handle, [data-no-drag]';

export function WidgetCanvas({
  editingWidgetId,
  isEditing,
  newWidgetIds,
  selectedWidgetIds,
  widgets,
  onClearSelection,
  onFinishWidgetEditing,
  onRemoveWidget,
  onSelectWidget,
  onStartWidgetEditing,
  onUpdateWidget,
  onUpdateWidgetLayouts,
  onWidgetEnterEnd,
}: WidgetCanvasProps) {
  const [widgetPendingDelete, setWidgetPendingDelete] =
    useState<RenderableWidgetConfig | null>(null);
  const [previewWidgets, setPreviewWidgets] = useState<
    readonly WidgetConfig[] | null
  >(null);
  const groupDragRef = useRef<GroupDrag | null>(null);
  const { containerRef, measureWidth, mounted, width } = useContainerWidth({
    initialWidth: DASHBOARD_CANVAS_MIN_WIDTH,
  });
  const groupMode = isEditing && selectedWidgetIds.size > 1;
  const gridLayout = useMemo(
    () =>
      createGridLayout(previewWidgets ?? widgets).map((item) =>
        groupMode && selectedWidgetIds.has(item.i)
          ? { ...item, isDraggable: false, isResizable: false }
          : item,
      ),
    [groupMode, previewWidgets, selectedWidgetIds, widgets],
  );
  const persistGridLayout = useCallback(
    (nextGridLayout: Layout) => {
      const nextWidgets = applyGridLayout(widgets, nextGridLayout);
      if (nextWidgets !== widgets) onUpdateWidgetLayouts(nextWidgets);
    },
    [onUpdateWidgetLayouts, widgets],
  );

  useEffect(() => {
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, [measureWidth]);

  const confirmDelete = () => {
    if (!widgetPendingDelete) return;
    onRemoveWidget(widgetPendingDelete.id);
    setWidgetPendingDelete(null);
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLDivElement>,
    widgetId: string,
  ) => {
    if (!isEditing || event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest(INTERACTIVE_SELECTOR)
    )
      return;
    const additive = event.ctrlKey || event.shiftKey;
    if (additive) {
      event.preventDefault();
      onSelectWidget(widgetId, true);
      return;
    }
    if (!groupMode || !selectedWidgetIds.has(widgetId)) {
      onSelectWidget(widgetId, false);
      return;
    }
    groupDragRef.current = {
      widgetId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidgets: widgets,
      lastWidgets: widgets,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget
      .querySelector<HTMLElement>('[data-widget-id]')
      ?.focus({ preventScroll: true });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = groupDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const stepX =
      (getDashboardGridWidth(width) -
        (DASHBOARD_GRID_COLUMNS - 1) * DASHBOARD_GRID_GAP) /
        DASHBOARD_GRID_COLUMNS +
      DASHBOARD_GRID_GAP;
    const stepY = DASHBOARD_GRID_ROW_HEIGHT + DASHBOARD_GRID_GAP;
    const deltaX = Math.round((event.clientX - drag.startX) / stepX);
    const deltaY = Math.round((event.clientY - drag.startY) / stepY);
    if (
      Math.abs(event.clientX - drag.startX) > 3 ||
      Math.abs(event.clientY - drag.startY) > 3
    ) {
      drag.moved = true;
    }
    if (!drag.moved) return;
    const nextWidgets = moveWidgetGroup(
      drag.startWidgets,
      selectedWidgetIds,
      deltaX,
      deltaY,
    );
    if (nextWidgets !== drag.startWidgets) {
      drag.lastWidgets = nextWidgets;
      setPreviewWidgets(nextWidgets);
    }
  };

  const finishGroupDrag = (
    event: PointerEvent<HTMLDivElement>,
    cancel = false,
  ) => {
    const drag = groupDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    groupDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPreviewWidgets(null);
    if (!cancel && drag.moved && drag.lastWidgets !== drag.startWidgets) {
      onUpdateWidgetLayouts(drag.lastWidgets);
    } else if (!cancel && !drag.moved) {
      onSelectWidget(drag.widgetId, false);
    }
  };

  if (widgets.length === 0) return null;

  return (
    <>
      <section
        aria-label="Виджеты"
        className="overflow-x-auto px-6 pt-20 pb-6"
        onPointerDown={(event) => {
          if (
            isEditing &&
            selectedWidgetIds.size > 0 &&
            event.target instanceof Element &&
            !event.target.closest(
              '[data-widget-id], .react-resizable-handle, [role="dialog"]',
            )
          ) {
            onClearSelection();
          }
        }}
      >
        <div
          ref={containerRef}
          className="min-w-[60rem]"
          data-dashboard-canvas="desktop"
        >
          {mounted ? (
            <GridLayout
              className={isEditing ? 'dashboard-grid--editing' : undefined}
              compactor={collisionBlockingCompactor}
              dragConfig={createDashboardDragConfig(
                isEditing && editingWidgetId === null,
              )}
              gridConfig={{
                cols: DASHBOARD_GRID_COLUMNS,
                rowHeight: DASHBOARD_GRID_ROW_HEIGHT,
                margin: [DASHBOARD_GRID_GAP, DASHBOARD_GRID_GAP],
                containerPadding: [0, 0],
              }}
              layout={gridLayout}
              resizeConfig={{
                enabled: isEditing && editingWidgetId === null,
                handles: ['se'],
              }}
              width={getDashboardGridWidth(width)}
              onDragStop={persistGridLayout}
              onResizeStop={persistGridLayout}
            >
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="min-w-0"
                  onPointerDown={(event) => handlePointerDown(event, widget.id)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(event) => finishGroupDrag(event)}
                  onPointerCancel={(event) => finishGroupDrag(event, true)}
                >
                  <WidgetHost
                    isEditing={isEditing}
                    isNew={newWidgetIds.has(widget.id)}
                    isSelected={selectedWidgetIds.has(widget.id)}
                    isWidgetEditing={editingWidgetId === widget.id}
                    widget={widget}
                    onRequestEdit={() => onStartWidgetEditing(widget.id)}
                    onRequestDelete={setWidgetPendingDelete}
                    onRequestFinishEditing={onFinishWidgetEditing}
                    onWidgetChange={onUpdateWidget}
                    onWidgetEnterEnd={() => onWidgetEnterEnd(widget.id)}
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
