import { describe, expect, it } from 'vitest';

import {
  formatCountdown,
  formatEventDate,
  isCalendarEvents,
  nextOccurrence,
  upcomingEvents,
} from '../../../widgets/events/event-utils';
import type { CalendarEvent } from '../../../widgets/events/types';

const event: CalendarEvent = {
  id: 'meeting',
  title: 'Встреча',
  date: '2026-01-31',
  time: '15:00',
  repeat: 'none',
};
const local = (value: string) => new Date(value);

describe('event recurrence and countdown', () => {
  it('restores the original wall time after a daylight-saving gap', () => {
    expect(
      nextOccurrence(
        { ...event, date: '2026-03-07', time: '02:30', repeat: 'daily' },
        local('2026-03-08T04:00:00'),
      ),
    ).toEqual(local('2026-03-09T02:30:00'));
    expect(
      nextOccurrence(
        { ...event, date: '2026-03-08', time: '02:30', repeat: 'monthly' },
        local('2026-03-09T04:00:00'),
      ),
    ).toEqual(local('2026-04-08T02:30:00'));
    expect(
      formatCountdown(
        { ...event, time: '' },
        local('2026-03-09T00:00:00'),
        local('2026-03-07T23:00:00'),
      ),
    ).toBe('Через 2 дн.');
  });
  it('keeps one-off events through their whole day, then hides them without mutation', () => {
    expect(nextOccurrence(event, local('2026-01-31T23:59:59'))).toEqual(
      local('2026-01-31T15:00:00'),
    );
    expect(nextOccurrence(event, local('2026-02-01T00:00:00'))).toBeNull();
    expect(event.date).toBe('2026-01-31');
  });

  it.each([
    ['daily', '2026-02-02T16:00:00', '2026-02-03T15:00:00'],
    ['weekly', '2026-02-07T14:00:00', '2026-02-07T15:00:00'],
    ['weekly', '2026-02-07T16:00:00', '2026-02-14T15:00:00'],
    ['monthly', '2026-02-01T00:00:00', '2026-02-28T15:00:00'],
    ['monthly', '2026-02-28T16:00:00', '2026-03-31T15:00:00'],
    ['yearly', '2036-01-31T16:00:00', '2037-01-31T15:00:00'],
  ] as const)('resolves %s recurrence at %s', (repeat, now, expected) => {
    expect(nextOccurrence({ ...event, repeat }, local(now))).toEqual(
      local(expected),
    );
  });

  it('clamps leap-day repeats and returns to February 29 in a leap year', () => {
    const leap = { ...event, date: '2024-02-29', repeat: 'yearly' as const };
    expect(nextOccurrence(leap, local('2025-01-01T00:00:00'))).toEqual(
      local('2025-02-28T15:00:00'),
    );
    expect(nextOccurrence(leap, local('2027-03-01T00:00:00'))).toEqual(
      local('2028-02-29T15:00:00'),
    );
  });

  it('keeps all-day recurrences today until local midnight', () => {
    expect(
      nextOccurrence(
        { ...event, time: '', repeat: 'daily' },
        local('2026-02-02T23:59:00'),
      ),
    ).toEqual(local('2026-02-02T00:00:00'));
  });

  it('preserves a future initial occurrence and includes an exact timed occurrence', () => {
    expect(
      nextOccurrence(
        { ...event, repeat: 'monthly' },
        local('2025-01-01T00:00:00'),
      ),
    ).toEqual(local('2026-01-31T15:00:00'));
    expect(
      nextOccurrence(
        { ...event, repeat: 'daily' },
        local('2026-01-31T15:00:00'),
      ),
    ).toEqual(local('2026-01-31T15:00:00'));
  });

  it('sorts by actual next occurrence and omits old one-offs', () => {
    const events = [
      event,
      { ...event, id: 'repeat', repeat: 'daily' as const },
      { ...event, id: 'future', date: '2026-02-04' },
    ];
    expect(
      upcomingEvents(events, local('2026-02-02T10:00:00')).map(
        ({ event }) => event.id,
      ),
    ).toEqual(['repeat', 'future']);
  });

  it('formats minute, hour and day countdowns and elapsed times', () => {
    expect(
      formatCountdown(
        event,
        local('2026-01-31T15:00:00'),
        local('2026-01-30T12:45:00'),
      ),
    ).toBe('Через 1 дн. 2 ч. 15 мин.');
    expect(
      formatCountdown(
        event,
        local('2026-01-31T15:00:00'),
        local('2026-01-31T14:59:59'),
      ),
    ).toBe('Через 1 мин.');
    expect(
      formatCountdown(
        event,
        local('2026-01-31T15:00:00'),
        local('2026-01-31T16:00:00'),
      ),
    ).toBe('Уже наступило');
    expect(
      formatCountdown(
        { ...event, time: '' },
        local('2026-02-01T00:00:00'),
        local('2026-01-31T23:59:00'),
      ),
    ).toBe('Через 1 дн.');
    expect(
      formatEventDate(
        event,
        local('2026-01-31T15:00:00'),
        local('2026-01-30T12:00:00'),
      ),
    ).toBe('Завтра, 15:00');
  });

  it.each([
    { date: '2026-02-30' },
    { date: '2025-02-29' },
    { date: '0000-01-01' },
    { time: '24:00' },
    { time: '12:60' },
    { title: '  ' },
    { title: 'x'.repeat(161) },
    { repeat: 'constructor' },
    { repeat: 'weekdays' },
    { id: 'bad id' },
  ])('rejects malformed event data %j', (patch) => {
    expect(isCalendarEvents([{ ...event, ...patch }])).toBe(false);
  });

  it('accepts all-day and leap-day data, but rejects duplicate ids and non-arrays', () => {
    expect(isCalendarEvents([{ ...event, date: '2024-02-29', time: '' }])).toBe(
      true,
    );
    expect(isCalendarEvents([event, event])).toBe(false);
    expect(isCalendarEvents([null])).toBe(false);
    expect(isCalendarEvents({})).toBe(false);
  });
});
