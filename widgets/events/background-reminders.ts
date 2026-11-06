import { storage } from '#imports';
import { browser } from 'wxt/browser';

import { readStoredDashboardConfig } from '../../storage/dashboard-storage';
import {
  EVENT_REMINDER_ALARM,
  EVENT_REMINDER_NOTIFICATION_PREFIX,
  getEventReminderPlan,
  MINUTE_MS,
} from './reminders';

export const EVENT_REMINDER_STATE_KEY =
  'local:event-reminder-deliveries' as const;

interface ReminderDeliveries {
  minute: number;
  delivered: string[];
}

function isReminderDeliveries(value: unknown): value is ReminderDeliveries {
  return (
    typeof value === 'object' &&
    value !== null &&
    'minute' in value &&
    typeof value.minute === 'number' &&
    Number.isSafeInteger(value.minute) &&
    'delivered' in value &&
    Array.isArray(value.delivered) &&
    value.delivered.every((id: unknown) => typeof id === 'string')
  );
}

async function refreshEventReminders(
  playSound: () => Promise<void>,
): Promise<void> {
  // Read without writing migrations back: a background read must not trigger
  // another config-change event or race with the dashboard's save queue.
  const config = await readStoredDashboardConfig();
  if (!config) {
    await browser.alarms.clear(EVENT_REMINDER_ALARM);
    return;
  }
  const plan = getEventReminderPlan(config, new Date());
  const alarm = await browser.alarms.get(EVENT_REMINDER_ALARM);
  if (plan.hasUpcoming) {
    if (!alarm || alarm.periodInMinutes !== 1) {
      await browser.alarms.create(EVENT_REMINDER_ALARM, {
        when: plan.minute + MINUTE_MS,
        periodInMinutes: 1,
      });
    }
  } else if (alarm) {
    await browser.alarms.clear(EVENT_REMINDER_ALARM);
  }

  const stored = await storage.getItem<unknown>(EVENT_REMINDER_STATE_KEY);
  const state: ReminderDeliveries =
    isReminderDeliveries(stored) && stored.minute === plan.minute
      ? stored
      : { minute: plan.minute, delivered: [] };
  const delivered = new Set(state.delivered);
  let notificationCreated = false;
  for (const reminder of plan.reminders) {
    if (Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS !== plan.minute) break;
    if (delivered.has(reminder.id)) continue;
    // A single tick can contain multiple events. Keep successes durable even
    // if one notification fails, and let later events continue independently.
    try {
      await browser.notifications.create(reminder.id, {
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icons/icon-128.png'),
        title: reminder.title,
        message: reminder.message,
        contextMessage: reminder.contextMessage,
        eventTime: reminder.eventTime,
        priority: 2,
        requireInteraction: true,
      });
      notificationCreated = true;
      delivered.add(reminder.id);
      await storage.setItem(EVENT_REMINDER_STATE_KEY, {
        minute: plan.minute,
        delivered: [...delivered],
      });
    } catch (error) {
      console.error('Failed to deliver event reminder:', error);
    }
  }
  if (notificationCreated) {
    try {
      await playSound();
    } catch (error) {
      console.error('Failed to play event reminder sound:', error);
    }
  }
}

// All triggers are owned by one worker and use the same queue. Tabs never send
// notifications, so opening another start page cannot duplicate reminders.
let pendingRefresh = Promise.resolve();
export function checkEventReminders(
  playSound: () => Promise<void>,
): Promise<void> {
  pendingRefresh = pendingRefresh
    .then(() => refreshEventReminders(playSound))
    .catch((error: unknown) => {
      console.error('Failed to refresh event reminders:', error);
    });
  return pendingRefresh;
}

export function registerEventReminders(playSound: () => Promise<void>): void {
  const check = () => checkEventReminders(playSound);
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === EVENT_REMINDER_ALARM) void check();
  });
  browser.runtime.onStartup.addListener(() => {
    void check();
  });
  browser.runtime.onInstalled.addListener(() => {
    void check();
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'dashboard-config' in changes) void check();
  });
  browser.notifications.onClicked.addListener((id) => {
    if (id.startsWith(EVENT_REMINDER_NOTIFICATION_PREFIX)) {
      void browser.notifications.clear(id).catch((error: unknown) => {
        console.warn('Failed to dismiss event reminder:', error);
      });
    }
  });
  void check();
}
