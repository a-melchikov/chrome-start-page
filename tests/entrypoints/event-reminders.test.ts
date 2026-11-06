import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import { saveDashboardConfig } from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { trashWorkspace } from '../../storage/workspace-trash';
import {
  checkEventReminders,
  EVENT_REMINDER_STATE_KEY,
  registerEventReminders,
} from '../../widgets/events/background-reminders';
import { createDefaultEventsWidget } from '../../widgets/events/defaults';
import { EVENT_REMINDER_ALARM } from '../../widgets/events/reminders';

function configWithEvent() {
  const config = createDefaultDashboardConfig();
  config.workspaces[0]!.widgets = [
    {
      ...createDefaultEventsWidget('events', 0),
      events: [
        {
          id: 'meeting',
          title: 'Обсуждение проекта',
          date: '2026-11-03',
          time: '15:00',
          repeat: 'none',
        },
      ],
    },
  ];
  return config;
}

describe('background event reminders', () => {
  const playSound = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    fakeBrowser.reset();
    playSound.mockClear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T14:55:20'));
    vi.spyOn(fakeBrowser.notifications, 'create');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('creates one minute-aligned alarm and sends both reminders once across concurrent checks', async () => {
    await saveDashboardConfig(configWithEvent());
    await Promise.all([
      checkEventReminders(playSound),
      checkEventReminders(playSound),
      checkEventReminders(playSound),
    ]);
    expect(await fakeBrowser.alarms.get(EVENT_REMINDER_ALARM)).toMatchObject({
      scheduledTime: new Date('2026-11-03T14:56:00').getTime(),
      periodInMinutes: 1,
    });
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(fakeBrowser.notifications.create).toHaveBeenLastCalledWith(
      expect.stringMatching(/:before$/),
      expect.objectContaining({
        type: 'basic',
        title: 'Событие через 5 минут',
        iconUrl: fakeBrowser.runtime.getURL('/icons/icon-128.png'),
        requireInteraction: true,
      }),
    );
    vi.setSystemTime(new Date('2026-11-03T15:00:30'));
    await Promise.all([
      checkEventReminders(playSound),
      checkEventReminders(playSound),
    ]);
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(2);
    expect(playSound).toHaveBeenCalledTimes(2);
    expect(fakeBrowser.notifications.create).toHaveBeenLastCalledWith(
      expect.stringMatching(/:start$/),
      expect.objectContaining({ title: 'Событие начинается' }),
    );
    vi.setSystemTime(new Date('2026-11-03T15:01:00'));
    await checkEventReminders(playSound);
    expect(await fakeBrowser.alarms.get(EVENT_REMINDER_ALARM)).toBeUndefined();
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(2);
    expect(playSound).toHaveBeenCalledTimes(2);
  });

  it('restores alarms without replaying a reminder after a worker restart', async () => {
    await saveDashboardConfig(configWithEvent());
    await checkEventReminders(playSound);
    await fakeBrowser.alarms.clear(EVENT_REMINDER_ALARM);
    vi.resetModules();
    const restarted = await import('../../widgets/events/background-reminders');
    await restarted.checkEventReminders(playSound);
    expect(await fakeBrowser.alarms.get(EVENT_REMINDER_ALARM)).toBeDefined();
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledOnce();
    expect(await storage.getItem(EVENT_REMINDER_STATE_KEY)).toMatchObject({
      minute: new Date('2026-11-03T14:55:00').getTime(),
      delivered: [expect.stringMatching(/:before$/)],
    });
  });

  it('uses the updated event, cancels removed and trashed events, and skips all-day events', async () => {
    const config = configWithEvent();
    const widget = config.workspaces[0]!.widgets[0]!;
    if (widget.type !== 'events') throw new Error('Expected events');
    widget.events[0]!.time = '16:00';
    await saveDashboardConfig(config);
    await checkEventReminders(playSound);
    expect(fakeBrowser.notifications.create).not.toHaveBeenCalled();
    widget.events[0]!.time = '';
    await saveDashboardConfig(config);
    await checkEventReminders(playSound);
    expect(await fakeBrowser.alarms.get(EVENT_REMINDER_ALARM)).toBeUndefined();
    const trashConfig = configWithEvent();
    await saveDashboardConfig(
      trashWorkspace(trashConfig, trashConfig.workspaces[0]!.id),
    );
    await checkEventReminders(playSound);
    expect(fakeBrowser.notifications.create).not.toHaveBeenCalled();
  });

  it('does not replay missed reminders after sleep and reschedules repeating events', async () => {
    const config = configWithEvent();
    const widget = config.workspaces[0]!.widgets[0]!;
    if (widget.type !== 'events') throw new Error('Expected events');
    widget.events[0]!.repeat = 'daily';
    await saveDashboardConfig(config);
    vi.setSystemTime(new Date('2026-11-03T16:00:00'));
    await checkEventReminders(playSound);
    expect(fakeBrowser.notifications.create).not.toHaveBeenCalled();
    expect(await fakeBrowser.alarms.get(EVENT_REMINDER_ALARM)).toBeDefined();
    vi.setSystemTime(new Date('2026-11-04T14:55:00'));
    await checkEventReminders(playSound);
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(1);
  });

  it('continues after one notification fails and retries only undelivered reminders', async () => {
    const config = configWithEvent();
    const widget = config.workspaces[0]!.widgets[0]!;
    if (widget.type !== 'events') throw new Error('Expected events');
    widget.events.push({
      ...widget.events[0]!,
      id: 'second',
      title: 'Вторая встреча',
    });
    await saveDashboardConfig(config);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fakeBrowser.notifications.create).mockRejectedValueOnce(
      new Error('Notification failed'),
    );
    await checkEventReminders(playSound);
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(2);
    await checkEventReminders(playSound);
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(3);
    await checkEventReminders(playSound);
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(3);
  });

  it('plays one sound for simultaneous reminders and none when notifications fail', async () => {
    const config = configWithEvent();
    const widget = config.workspaces[0]!.widgets[0]!;
    if (widget.type !== 'events') throw new Error('Expected events');
    widget.events.push({ ...widget.events[0]!, id: 'second' });
    await saveDashboardConfig(config);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fakeBrowser.notifications.create).mockRejectedValueOnce(
      new Error('Failed'),
    );
    vi.mocked(fakeBrowser.notifications.create).mockRejectedValueOnce(
      new Error('Failed'),
    );
    await checkEventReminders(playSound);
    expect(playSound).not.toHaveBeenCalled();
    await checkEventReminders(playSound);
    expect(fakeBrowser.notifications.create).toHaveBeenCalledTimes(4);
    expect(playSound).toHaveBeenCalledOnce();
  });

  it('registers alarm, startup, install and config listeners and runs on worker boot', async () => {
    const onAlarm = vi.spyOn(fakeBrowser.alarms.onAlarm, 'addListener');
    const onStartup = vi.spyOn(fakeBrowser.runtime.onStartup, 'addListener');
    const onInstalled = vi.spyOn(
      fakeBrowser.runtime.onInstalled,
      'addListener',
    );
    const onChanged = vi.spyOn(fakeBrowser.storage.onChanged, 'addListener');
    await saveDashboardConfig(configWithEvent());
    registerEventReminders(playSound);
    await checkEventReminders(playSound);
    expect(onAlarm).toHaveBeenCalledOnce();
    expect(onStartup).toHaveBeenCalledOnce();
    expect(onInstalled).toHaveBeenCalledOnce();
    expect(onChanged).toHaveBeenCalledOnce();
    expect(fakeBrowser.notifications.create).toHaveBeenCalledOnce();
  });
});
