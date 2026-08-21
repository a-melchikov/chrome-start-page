import { useState } from 'react';

import type { WidgetConfig } from '../../storage/schema';
import { ConfirmWidgetDeleteDialog } from './ConfirmWidgetDeleteDialog';
import { WidgetHost } from './WidgetHost';
import {
  getWidgetDisplayName,
  type RenderableWidgetConfig,
} from './widget-display';

interface WidgetCanvasProps {
  isEditing: boolean;
  widgets: readonly WidgetConfig[];
  onRemoveWidget: (widgetId: string) => void;
}

export function WidgetCanvas({
  isEditing,
  widgets,
  onRemoveWidget,
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
            widget={widget}
            onRequestDelete={setWidgetPendingDelete}
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
