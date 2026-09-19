import { storage } from '#imports';

import type {
  PomodoroPhase,
  PomodoroRuntimeState,
  PomodoroTimerStatus,
  PomodoroWidgetConfig,
} from './types';

export const POMODORO_STORAGE_KEY_PREFIX = 'local:pomodoro-state:' as const;

export function getPomodoroStorageKey(widgetId: string): `local:${string}` {
  return `${POMODORO_STORAGE_KEY_PREFIX}${widgetId}`;
}

export function getTodayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPhaseDurationSeconds(
  phase: PomodoroPhase,
  config: PomodoroWidgetConfig,
): number {
  switch (phase) {
    case 'work':
      return config.workDuration * 60;
    case 'shortBreak':
      return config.shortBreakDuration * 60;
    case 'longBreak':
      return config.longBreakDuration * 60;
  }
}

export function createDefaultRuntimeState(
  config: PomodoroWidgetConfig,
): PomodoroRuntimeState {
  return {
    status: 'idle',
    phase: 'work',
    targetEndTime: null,
    remainingSeconds: config.workDuration * 60,
    cycleCount: 0,
    completedToday: 0,
    lastResetDate: getTodayDateString(),
  };
}

export function isPomodoroRuntimeState(
  value: unknown,
): value is PomodoroRuntimeState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const validStatuses: PomodoroTimerStatus[] = ['idle', 'running', 'paused'];
  const validPhases: PomodoroPhase[] = ['work', 'shortBreak', 'longBreak'];

  return (
    validStatuses.includes(candidate.status as PomodoroTimerStatus) &&
    validPhases.includes(candidate.phase as PomodoroPhase) &&
    (candidate.targetEndTime === null ||
      (typeof candidate.targetEndTime === 'number' &&
        Number.isFinite(candidate.targetEndTime))) &&
    typeof candidate.remainingSeconds === 'number' &&
    Number.isFinite(candidate.remainingSeconds) &&
    typeof candidate.cycleCount === 'number' &&
    Number.isInteger(candidate.cycleCount) &&
    typeof candidate.completedToday === 'number' &&
    Number.isInteger(candidate.completedToday) &&
    typeof candidate.lastResetDate === 'string'
  );
}

export function normalizeRuntimeState(
  state: unknown,
  config: PomodoroWidgetConfig,
  currentTime = Date.now(),
): PomodoroRuntimeState {
  if (!isPomodoroRuntimeState(state)) {
    return createDefaultRuntimeState(config);
  }

  const today = getTodayDateString(new Date(currentTime));
  let completedToday = state.completedToday;
  let lastResetDate = state.lastResetDate;

  if (lastResetDate !== today) {
    completedToday = 0;
    lastResetDate = today;
  }

  if (state.status === 'running') {
    if (state.targetEndTime === null) {
      return {
        ...state,
        status: 'idle',
        remainingSeconds: getPhaseDurationSeconds(state.phase, config),
        completedToday,
        lastResetDate,
      };
    }

    const diffSeconds = Math.max(
      0,
      Math.ceil((state.targetEndTime - currentTime) / 1000),
    );

    if (diffSeconds <= 0) {
      const isWorkPhase = state.phase === 'work';
      const nextCycleCount = isWorkPhase
        ? (state.cycleCount + 1) % config.longBreakInterval
        : state.cycleCount;
      const nextPhase: PomodoroPhase = isWorkPhase
        ? nextCycleCount === 0
          ? 'longBreak'
          : 'shortBreak'
        : 'work';

      return {
        status: 'idle',
        phase: nextPhase,
        targetEndTime: null,
        remainingSeconds: getPhaseDurationSeconds(nextPhase, config),
        cycleCount: nextCycleCount,
        completedToday: isWorkPhase ? completedToday + 1 : completedToday,
        lastResetDate,
      };
    }

    return {
      ...state,
      remainingSeconds: diffSeconds,
      completedToday,
      lastResetDate,
    };
  }

  if (state.status === 'idle') {
    return {
      ...state,
      remainingSeconds: getPhaseDurationSeconds(state.phase, config),
      targetEndTime: null,
      completedToday,
      lastResetDate,
    };
  }

  if (state.status === 'paused') {
    const maxDuration = getPhaseDurationSeconds(state.phase, config);
    return {
      ...state,
      remainingSeconds: Math.min(state.remainingSeconds, maxDuration),
      targetEndTime: null,
      completedToday,
      lastResetDate,
    };
  }

  return {
    ...state,
    completedToday,
    lastResetDate,
  };
}

export async function loadPomodoroRuntime(
  widgetId: string,
  config: PomodoroWidgetConfig,
): Promise<PomodoroRuntimeState> {
  const key = getPomodoroStorageKey(widgetId);
  const raw = await storage.getItem<unknown>(key);
  const normalized = normalizeRuntimeState(raw, config);

  if (raw !== normalized) {
    await storage.setItem(key, normalized);
  }

  return normalized;
}

export async function savePomodoroRuntime(
  widgetId: string,
  state: PomodoroRuntimeState,
): Promise<void> {
  const key = getPomodoroStorageKey(widgetId);
  await storage.setItem(key, state);
}
