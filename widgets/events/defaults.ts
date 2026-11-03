import type { EventsWidgetConfig } from './types';

export const DEFAULT_EVENTS_WIDGET_LAYOUT = {
  w: 4,
  h: 4,
  minW: 3,
  minH: 3,
} as const;

export function createDefaultEventsWidget(
  id: string,
  index: number,
): EventsWidgetConfig {
  return {
    id,
    type: 'events',
    events: [],
    layout: { x: 0, y: index * DEFAULT_EVENTS_WIDGET_LAYOUT.h, w: 4, h: 4 },
  };
}
