import type { BaseWidgetConfig } from '../types';

export type EventRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  repeat: EventRepeat;
}

export interface EventsWidgetConfig extends BaseWidgetConfig<'events'> {
  events: CalendarEvent[];
}
