import { defineBackground, storage } from '#imports';
import { browser } from 'wxt/browser';

import { loadDashboardConfig } from '../storage/dashboard-storage';
import {
  getPhaseDurationSeconds,
  getPomodoroStorageKey,
  getTodayDateString,
  isPomodoroRuntimeState,
} from '../widgets/pomodoro/storage';
import {
  POMODORO_AUDIO_ACTION,
  type PomodoroPhase,
  type PomodoroRuntimeState,
  type PomodoroWidgetConfig,
} from '../widgets/pomodoro/types';

interface ChromeOffscreen {
  hasDocument: () => Promise<boolean>;
  closeDocument: () => Promise<void>;
  createDocument: (parameters: {
    url: string;
    reasons: string[];
    justification: string;
  }) => Promise<void>;
}

declare const chrome: {
  offscreen?: ChromeOffscreen;
};

export const POMODORO_ALARM_PREFIX = 'pomodoro:' as const;

export function getPomodoroAlarmName(widgetId: string): string {
  return `${POMODORO_ALARM_PREFIX}${widgetId}`;
}

export function parsePomodoroAlarmWidgetId(alarmName: string): string | null {
  if (alarmName.startsWith(POMODORO_ALARM_PREFIX)) {
    return alarmName.slice(POMODORO_ALARM_PREFIX.length);
  }
  return null;
}

export async function playOffscreenChime(): Promise<void> {
  const offscreenApi =
    typeof chrome !== 'undefined' ? chrome.offscreen : undefined;
  if (!offscreenApi?.createDocument) {
    return;
  }

  try {
    let hasDoc = false;
    if (typeof offscreenApi.hasDocument === 'function') {
      try {
        hasDoc = await offscreenApi.hasDocument();
      } catch {
        hasDoc = false;
      }
    }

    if (hasDoc) {
      try {
        await browser.runtime.sendMessage({ type: POMODORO_AUDIO_ACTION });
      } catch (err) {
        console.warn(
          'Failed to send audio message to offscreen document:',
          err,
        );
      }
      return;
    }

    try {
      await offscreenApi.createDocument({
        url: browser.runtime.getURL('/offscreen.html#play'),
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play Pomodoro timer chime when interval finishes',
      });
    } catch (createError) {
      // If document was created in a concurrent race condition, send message instead
      const errorMsg = String(createError);
      if (errorMsg.includes('Only a single offscreen document')) {
        await browser.runtime.sendMessage({ type: POMODORO_AUDIO_ACTION });
      } else {
        console.error('Failed to create offscreen document:', createError);
      }
    }
  } catch (error) {
    console.error('Failed to play offscreen chime:', error);
  }
}

export async function handlePomodoroAlarm(alarmName: string): Promise<void> {
  const widgetId = parsePomodoroAlarmWidgetId(alarmName);
  if (!widgetId) {
    return;
  }

  const dashboardConfig = await loadDashboardConfig();
  const widget = dashboardConfig.widgets.find(
    (w): w is PomodoroWidgetConfig =>
      w.id === widgetId && w.type === 'pomodoro',
  );

  if (!widget) {
    await browser.alarms.clear(alarmName);
    return;
  }

  const storageKey = getPomodoroStorageKey(widgetId);
  const state = await storage.getItem<unknown>(storageKey);

  if (!isPomodoroRuntimeState(state) || state.status !== 'running') {
    return;
  }

  const currentTime = Date.now();
  const today = getTodayDateString(new Date(currentTime));
  let completedToday = state.completedToday;
  if (state.lastResetDate !== today) {
    completedToday = 0;
  }

  const previousPhase = state.phase;
  const isWorkPhase = previousPhase === 'work';
  const nextCycleCount = isWorkPhase
    ? (state.cycleCount + 1) % widget.longBreakInterval
    : state.cycleCount;
  const nextPhase: PomodoroPhase = isWorkPhase
    ? nextCycleCount === 0
      ? 'longBreak'
      : 'shortBreak'
    : 'work';
  const nextCompletedToday = isWorkPhase ? completedToday + 1 : completedToday;

  const nextState: PomodoroRuntimeState = {
    status: 'idle',
    phase: nextPhase,
    targetEndTime: null,
    remainingSeconds: getPhaseDurationSeconds(nextPhase, widget),
    cycleCount: nextCycleCount,
    completedToday: nextCompletedToday,
    lastResetDate: today,
  };

  await storage.setItem(storageKey, nextState);

  const title = isWorkPhase ? 'Время отдыхать!' : 'Перерыв окончен!';
  const message = isWorkPhase
    ? nextPhase === 'longBreak'
      ? 'Отличная работа! Пора на длинный перерыв.'
      : 'Помидор завершён! Время сделать короткий перерыв.'
    : 'Пора вернуться к работе и сфокусироваться.';

  try {
    await browser.notifications.create(
      `pomodoro-notif:${widgetId}:${currentTime}`,
      {
        type: 'basic',
        iconUrl: browser.runtime.getURL('/icons/icon-128.png'),
        title,
        message,
      },
    );
  } catch (error) {
    console.error('Failed to create Pomodoro notification:', error);
  }

  if (widget.soundEnabled) {
    void playOffscreenChime();
  }
}

export default defineBackground(() => {
  browser.alarms.onAlarm.addListener((alarm) => {
    void handlePomodoroAlarm(alarm.name);
  });
});
