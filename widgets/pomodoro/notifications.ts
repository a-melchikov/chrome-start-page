import { browser } from 'wxt/browser';

import type { PomodoroPhase } from './types';

export interface PomodoroNotificationContent {
  title: string;
  message: string;
}

export function getPomodoroNotificationContent(
  previousPhase: PomodoroPhase,
  nextPhase: PomodoroPhase,
): PomodoroNotificationContent {
  const isWorkPhase = previousPhase === 'work';
  const title = isWorkPhase ? 'Время отдыхать!' : 'Перерыв окончен!';
  const message = isWorkPhase
    ? nextPhase === 'longBreak'
      ? 'Отличная работа! Пора на длинный перерыв.'
      : 'Время сделать короткий перерыв.'
    : 'Пора вернуться к работе и сфокусироваться.';

  return { title, message };
}

export async function showPomodoroNotification(
  widgetId: string,
  previousPhase: PomodoroPhase,
  nextPhase: PomodoroPhase,
): Promise<void> {
  if (
    typeof browser === 'undefined' ||
    !browser.notifications?.create ||
    !browser.runtime?.getURL
  ) {
    return;
  }

  const { title, message } = getPomodoroNotificationContent(
    previousPhase,
    nextPhase,
  );

  try {
    const notificationId = `pomodoro-notif:${widgetId}`;
    if (browser.notifications.clear) {
      try {
        await browser.notifications.clear(notificationId);
      } catch {
        // Ignore clear failure if notification did not exist
      }
    }

    await browser.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icons/icon-128.png'),
      title,
      message,
      priority: 2,
      requireInteraction: true,
    });
  } catch (error) {
    console.error('Failed to create Pomodoro notification:', error);
  }
}
