import { getWidgetDefinition } from '../../widgets/registry';
import type { WidgetLayout } from '../../widgets/types';

export interface RenderableWidgetConfig {
  id: string;
  type: string;
  title?: string;
  layout: WidgetLayout;
}

export function getWidgetDisplayName(widget: RenderableWidgetConfig): string {
  const definition = getWidgetDefinition(widget.type);

  if (definition && !definition.presentation.allowCustomTitle) {
    return definition.metadata.name;
  }

  return widget.title?.trim() || definition?.metadata.name || widget.type;
}
