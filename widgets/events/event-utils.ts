import type { CalendarEvent, EventRepeat } from './types';

export const REPEAT_LABELS: Record<EventRepeat, string> = {
  none: 'Не повторяется',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
};

export function isEventRepeat(value: unknown): value is EventRepeat {
  return typeof value === 'string' && Object.hasOwn(REPEAT_LABELS, value);
}

export function isEventDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function isEventTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value))
  );
}

export function isCalendarEvents(value: unknown): value is CalendarEvent[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every((event: unknown) => {
    if (
      typeof event !== 'object' ||
      event === null ||
      !('id' in event) ||
      typeof event.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(event.id) ||
      ids.has(event.id)
    )
      return false;
    ids.add(event.id);
    return (
      'title' in event &&
      typeof event.title === 'string' &&
      event.title.trim().length > 0 &&
      event.title.length <= 160 &&
      'date' in event &&
      isEventDate(event.date) &&
      'time' in event &&
      isEventTime(event.time) &&
      'repeat' in event &&
      isEventRepeat(event.repeat)
    );
  });
}

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayNumber(date: Date): number {
  return (
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
}

function eventStart(event: CalendarEvent): Date {
  return new Date(`${event.date}T${event.time || '00:00'}:00`);
}

function hasPassed(date: Date, event: CalendarEvent, now: Date): boolean {
  return event.time
    ? date.getTime() < now.getTime()
    : dayNumber(date) < dayNumber(now);
}

export function nextOccurrence(event: CalendarEvent, now: Date): Date | null {
  const start = eventStart(event);
  if (event.repeat === 'none')
    return dayNumber(start) < dayNumber(now) ? null : start;
  if (!hasPassed(start, event, now)) return start;

  if (event.repeat === 'daily' || event.repeat === 'weekly') {
    const interval = event.repeat === 'daily' ? 1 : 7;
    const steps = Math.max(
      0,
      Math.floor((dayNumber(now) - dayNumber(start)) / interval),
    );
    const [hours, minutes] = (event.time || '00:00').split(':').map(Number);
    const atStep = (step: number) =>
      new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + step * interval,
        hours,
        minutes,
      );
    let candidate = atStep(steps);
    if (hasPassed(candidate, event, now)) candidate = atStep(steps + 1);
    return candidate;
  }

  const monthStep = event.repeat === 'monthly' ? 1 : 12;
  const elapsedMonths =
    (now.getFullYear() - start.getFullYear()) * 12 +
    now.getMonth() -
    start.getMonth();
  const steps = Math.max(0, Math.floor(elapsedMonths / monthStep));
  const atStep = (step: number) => {
    const candidate = new Date(start);
    candidate.setDate(1);
    candidate.setMonth(start.getMonth() + step * monthStep);
    const lastDay = new Date(
      candidate.getFullYear(),
      candidate.getMonth() + 1,
      0,
    ).getDate();
    candidate.setDate(Math.min(start.getDate(), lastDay));
    const [hours, minutes] = (event.time || '00:00').split(':').map(Number);
    candidate.setHours(hours!, minutes!, 0, 0);
    return candidate;
  };
  let candidate = atStep(steps);
  if (hasPassed(candidate, event, now)) candidate = atStep(steps + 1);
  return candidate;
}

export function upcomingEvents(events: CalendarEvent[], now: Date) {
  return events
    .flatMap((event) => {
      const occurrence = nextOccurrence(event, now);
      return occurrence ? [{ event, occurrence }] : [];
    })
    .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());
}

export function formatEventDate(
  event: CalendarEvent,
  occurrence: Date,
  now: Date,
): string {
  const days = dayNumber(occurrence) - dayNumber(now);
  const dateLabel =
    days === 0
      ? 'Сегодня'
      : days === 1
        ? 'Завтра'
        : new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'short',
            ...(occurrence.getFullYear() !== now.getFullYear()
              ? { year: 'numeric' as const }
              : {}),
          }).format(occurrence);
  return event.time ? `${dateLabel}, ${event.time}` : dateLabel;
}

export function formatCountdown(
  event: CalendarEvent,
  occurrence: Date,
  now: Date,
): string {
  if (!event.time) {
    const days = dayNumber(occurrence) - dayNumber(now);
    return days === 0 ? 'Сегодня' : `Через ${days} дн.`;
  }
  const minutes = Math.ceil((occurrence.getTime() - now.getTime()) / 60000);
  if (minutes < 0) return 'Уже наступило';
  if (minutes === 0) return 'Сейчас';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  return `Через ${[days ? `${days} дн.` : '', hours ? `${hours} ч.` : '', rest ? `${rest} мин.` : ''].filter(Boolean).join(' ')}`;
}
