import { describe, expect, it } from 'vitest';

import { createDefaultDashboardConfig } from '../../../storage/defaults';
import { createDefaultEventsWidget } from '../../../widgets/events/defaults';
import { getEventReminderPlan } from '../../../widgets/events/reminders';
import type { CalendarEvent } from '../../../widgets/events/types';

const meeting: CalendarEvent = {
  id: 'meeting',
  title: 'Обсуждение проекта',
  date: '2026-11-03',
  time: '15:00',
  repeat: 'none',
};

function plan(events: CalendarEvent[], now: string) {
  const config = createDefaultDashboardConfig();
  config.workspaces[0]!.widgets = [
    { ...createDefaultEventsWidget('events', 0), events },
  ];
  return getEventReminderPlan(config, new Date(now));
}

describe('event reminder plan', () => {
  it('notifies five minutes before and throughout the starting minute only', () => {
    const before = plan([meeting], '2026-11-03T14:55:49');
    expect(before.reminders).toHaveLength(1);
    expect(before.reminders[0]).toMatchObject({
      title: 'Событие через 5 минут',
      eventTime: new Date('2026-11-03T15:00:00').getTime(),
    });
    expect(before.reminders[0]!.message).toContain(meeting.title);
    expect(plan([meeting], '2026-11-03T14:54:59').reminders).toEqual([]);
    expect(plan([meeting], '2026-11-03T14:56:00').reminders).toEqual([]);
    expect(plan([meeting], '2026-11-03T15:00:59').reminders[0]!.title).toBe(
      'Событие начинается',
    );
    const late = plan([meeting], '2026-11-03T15:01:00');
    expect(late.reminders).toEqual([]);
    expect(late.hasUpcoming).toBe(false);
  });

  it('ignores all-day events, old dates, and workspaces in the trash', () => {
    expect(
      plan([{ ...meeting, time: '' }], '2026-11-03T14:55:00'),
    ).toMatchObject({ hasUpcoming: false, reminders: [] });
    expect(plan([meeting], '2026-11-04T14:55:00').reminders).toEqual([]);
    const config = createDefaultDashboardConfig();
    config.trashedWorkspaces = [
      {
        workspace: {
          ...config.workspaces[0]!,
          widgets: [
            { ...createDefaultEventsWidget('events', 0), events: [meeting] },
          ],
        },
        originalIndex: 0,
        deletedAt: 1,
      },
    ];
    expect(
      getEventReminderPlan(config, new Date('2026-11-03T14:55:00')),
    ).toMatchObject({ hasUpcoming: false, reminders: [] });
  });

  it.each([
    ['daily', '2026-11-04T15:00:40', '2026-11-03'],
    ['weekly', '2026-11-10T14:55:20', '2026-11-03'],
    ['monthly', '2026-11-30T14:55:30', '2026-10-31'],
    ['yearly', '2025-02-28T14:55:30', '2024-02-29'],
  ] as const)(
    'notifies for the next %s occurrence even when it has already started this minute',
    (repeat, now, date) => {
      expect(plan([{ ...meeting, date, repeat }], now).reminders).toHaveLength(
        1,
      );
    },
  );

  it('handles reminders that fall on the previous day', () => {
    expect(
      plan(
        [{ ...meeting, date: '2026-11-04', time: '00:02' }],
        '2026-11-03T23:57:00',
      ).reminders,
    ).toHaveLength(1);
  });

  it('includes inactive workspaces and disambiguates equal event and widget IDs', () => {
    const config = createDefaultDashboardConfig();
    for (const workspace of config.workspaces)
      workspace.widgets = [
        { ...createDefaultEventsWidget('events', 0), events: [meeting] },
      ];
    const result = getEventReminderPlan(
      config,
      new Date('2026-11-03T14:55:00'),
    );
    expect(result.reminders).toHaveLength(2);
    expect(new Set(result.reminders.map((item) => item.id)).size).toBe(2);
    expect(result.reminders[0]!.contextMessage).toContain('Основной');
    expect(result.reminders[1]!.contextMessage).toContain('Работа');
  });
});
