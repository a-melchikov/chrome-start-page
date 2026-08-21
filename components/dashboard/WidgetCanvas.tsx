import { useState } from 'react';

import type { WidgetConfig } from '../../storage/schema';
import { ConfirmWidgetDeleteDialog } from './ConfirmWidgetDeleteDialog';
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
}

export function WidgetCanvas({
  editingWidgetId,
  isEditing,
  widgets,
  onFinishWidgetEditing,
  onRemoveWidget,
  onStartWidgetEditing,
  onUpdateWidget,
}: WidgetCanvasProps) {
  const [widgetPendingDelete, setWidgetPendingDelete] =
    useState<RenderableWidgetConfig | null>(null);

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
      <section
        aria-label="Виджеты"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4 p-6 pt-20"
      >
        {widgets.map((widget) => (
          <WidgetHost
            key={widget.id}
            isEditing={isEditing}
            isWidgetEditing={editingWidgetId === widget.id}
            widget={widget}
            onRequestEdit={() => onStartWidgetEditing(widget.id)}
            onRequestDelete={setWidgetPendingDelete}
            onRequestFinishEditing={onFinishWidgetEditing}
            onWidgetChange={onUpdateWidget}
          />
        ))}
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
