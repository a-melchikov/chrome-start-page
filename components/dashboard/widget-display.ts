import { getWidgetDefinition } from '../../widgets/registry';
import type { WidgetLayout } from '../../widgets/types';
import type { WidgetAppearance } from '../../storage/widget-appearance';

export interface RenderableWidgetConfig {
  id: string;
  type: string;
  title?: string;
  appearance?: WidgetAppearance;
  layout: WidgetLayout;
}

export function getWidgetDisplayName(widget: RenderableWidgetConfig): string {
  const definition = getWidgetDefinition(widget.type);

  if (definition && !definition.presentation.allowCustomTitle) {
    return definition.metadata.name;
  }

  if (widget.title?.trim()) {
    return widget.title.trim();
  }

  return definition?.metadata.name || widget.type;
}
