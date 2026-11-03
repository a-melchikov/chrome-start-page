import type { DashboardConfig } from '../../storage/schema';
import { nextOccurrence } from './event-utils';

export const EVENT_REMINDER_ALARM = 'events:reminders';
export const EVENT_REMINDER_NOTIFICATION_PREFIX = 'event-reminder:';
export const MINUTE_MS = 60_000;

export interface EventReminder {
  id: string;
  title: string;
  message: string;
  contextMessage: string;
  eventTime: number;
}

export function getEventReminderPlan(
  config: DashboardConfig,
  now: Date,
): {
  minute: number;
  hasUpcoming: boolean;
  reminders: EventReminder[];
} {
  const minute = Math.floor(now.getTime() / MINUTE_MS) * MINUTE_MS;
  const reminders: EventReminder[] = [];
  let hasUpcoming = false;

  for (const workspace of config.workspaces) {
    for (const widget of workspace.widgets) {
      if (widget.type !== 'events') continue;
      for (const event of widget.events) {
        if (!event.time) continue;
        for (const offset of [0, 5] as const) {
          const target = minute + offset * MINUTE_MS;
          // Use the start of the minute: timed repeats roll forward immediately
          // after their time, but their start notification is valid all minute.
          const occurrence = nextOccurrence(event, new Date(target));
          if (offset === 0 && occurrence && occurrence.getTime() >= minute) {
            hasUpcoming = true;
          }
          if (!occurrence || occurrence.getTime() !== target) continue;
          const phase = offset === 5 ? 'before' : 'start';
          reminders.push({
            id: `${EVENT_REMINDER_NOTIFICATION_PREFIX}${workspace.id}:${widget.id}:${event.id}:${target}:${phase}`,
            title:
              offset === 5 ? 'Событие через 5 минут' : 'Событие начинается',
            message: `${event.title}\n${new Intl.DateTimeFormat('ru-RU', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            }).format(occurrence)}`,
            contextMessage: `${workspace.name} · ${widget.title?.trim() || 'Ближайшие события'}`,
            eventTime: target,
          });
        }
      }
    }
  }
  return { minute, hasUpcoming, reminders };
}
