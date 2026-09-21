import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from '#imports';
import { browser } from 'wxt/browser';

import { playPomodoroChime } from './audio';
import { showPomodoroNotification } from './notifications';
import {
  createDefaultRuntimeState,
  getPhaseDurationSeconds,
  getPomodoroStorageKey,
  getTodayDateString,
  loadPomodoroRuntime,
  normalizeRuntimeState,
  savePomodoroRuntime,
} from './storage';
import type {
  PomodoroPhase,
  PomodoroRuntimeState,
  PomodoroWidgetConfig,
} from './types';

export const POMODORO_ALARM_PREFIX = 'pomodoro:' as const;

function getAlarmName(widgetId: string): string {
  return `${POMODORO_ALARM_PREFIX}${widgetId}`;
}

async function setAlarm(widgetId: string, when: number): Promise<void> {
  if (typeof browser !== 'undefined' && browser.alarms?.create) {
    try {
      await browser.alarms.create(getAlarmName(widgetId), { when });
    } catch (error) {
      console.warn('Failed to set alarm:', error);
    }
  }
}

async function clearAlarm(widgetId: string): Promise<void> {
  if (typeof browser !== 'undefined' && browser.alarms?.clear) {
    try {
      await browser.alarms.clear(getAlarmName(widgetId));
    } catch (error) {
      console.warn('Failed to clear alarm:', error);
    }
  }
}

export interface UsePomodoroResult {
  state: PomodoroRuntimeState;
  remainingSeconds: number;
  totalPhaseSeconds: number;
  progressPercent: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  seek: (seconds: number) => Promise<void>;
  setPhase: (phase: PomodoroPhase) => void;
  resetTodayCount: () => void;
}

export function usePomodoro(config: PomodoroWidgetConfig): UsePomodoroResult {
  const [state, setState] = useState<PomodoroRuntimeState>(() =>
    createDefaultRuntimeState(config),
  );
  const [displaySeconds, setDisplaySeconds] = useState<number>(() =>
    getPhaseDurationSeconds('work', config),
  );

  const stateRef = useRef(state);
  const configRef = useRef(config);

  useEffect(() => {
    stateRef.current = state;
    configRef.current = config;
  }, [state, config]);

  const totalPhaseSeconds = getPhaseDurationSeconds(state.phase, config);

  // Sync state changes with displaySeconds
  const applyState = useCallback((nextState: PomodoroRuntimeState) => {
    setState(nextState);
    if (nextState.status === 'running' && nextState.targetEndTime !== null) {
      const remaining = Math.max(
        0,
        Math.ceil((nextState.targetEndTime - Date.now()) / 1000),
      );
      setDisplaySeconds(remaining);
    } else {
      setDisplaySeconds(nextState.remainingSeconds);
    }
  }, []);

  // Load state and watch storage changes
  useEffect(() => {
    let isCancelled = false;

    void loadPomodoroRuntime(config.id, config).then((loaded) => {
      if (!isCancelled) {
        applyState(loaded);
      }
    });

    const key = getPomodoroStorageKey(config.id);
    const unwatch = storage.watch<unknown>(key, (raw) => {
      if (!isCancelled) {
        const normalized = normalizeRuntimeState(raw, configRef.current);
        applyState(normalized);
      }
    });

    return () => {
      isCancelled = true;
      unwatch();
    };
  }, [config.id, config, applyState]);

  // Handle phase completion in active tab
  const handlePhaseComplete = useCallback(async () => {
    const current = stateRef.current;
    const currentConfig = configRef.current;

    if (currentConfig.soundEnabled) {
      void playPomodoroChime();
    }

    const today = getTodayDateString();
    let completedToday = current.completedToday;
    if (current.lastResetDate !== today) {
      completedToday = 0;
    }

    const isWorkPhase = current.phase === 'work';
    const nextCycleCount = isWorkPhase
      ? (current.cycleCount + 1) % currentConfig.longBreakInterval
      : current.cycleCount;
    const nextPhase: PomodoroPhase = isWorkPhase
      ? nextCycleCount === 0
        ? 'longBreak'
        : 'shortBreak'
      : 'work';
    const nextCompletedToday = isWorkPhase
      ? completedToday + 1
      : completedToday;

    const nextDuration = getPhaseDurationSeconds(nextPhase, currentConfig);
    const nextState: PomodoroRuntimeState = {
      status: 'idle',
      phase: nextPhase,
      targetEndTime: null,
      remainingSeconds: nextDuration,
      cycleCount: nextCycleCount,
      completedToday: nextCompletedToday,
      lastResetDate: today,
    };

    await clearAlarm(currentConfig.id);
    applyState(nextState);
    await savePomodoroRuntime(currentConfig.id, nextState);
    await showPomodoroNotification(currentConfig.id, current.phase, nextPhase);
  }, [applyState]);

  // Ticking interval when running
  useEffect(() => {
    if (state.status !== 'running' || state.targetEndTime === null) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((state.targetEndTime! - Date.now()) / 1000),
      );
      setDisplaySeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        void handlePhaseComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status, state.targetEndTime, handlePhaseComplete]);

  const start = useCallback(async () => {
    const current = stateRef.current;
    const currentConfig = configRef.current;
    const currentPhaseDuration = getPhaseDurationSeconds(
      current.phase,
      currentConfig,
    );
    const secondsToRun =
      current.status === 'idle'
        ? currentPhaseDuration
        : current.remainingSeconds > 0
          ? current.remainingSeconds
          : currentPhaseDuration;

    const targetEndTime = Date.now() + secondsToRun * 1000;
    const nextState: PomodoroRuntimeState = {
      ...current,
      status: 'running',
      targetEndTime,
      remainingSeconds: secondsToRun,
    };

    applyState(nextState);
    await setAlarm(currentConfig.id, targetEndTime);
    await savePomodoroRuntime(currentConfig.id, nextState);
  }, [applyState]);

  const pause = useCallback(async () => {
    const current = stateRef.current;
    const currentConfig = configRef.current;
    const remaining =
      current.targetEndTime !== null
        ? Math.max(0, Math.ceil((current.targetEndTime - Date.now()) / 1000))
        : current.remainingSeconds;

    const nextState: PomodoroRuntimeState = {
      ...current,
      status: 'paused',
      targetEndTime: null,
      remainingSeconds: remaining,
    };

    await clearAlarm(currentConfig.id);
    applyState(nextState);
    await savePomodoroRuntime(currentConfig.id, nextState);
  }, [applyState]);

  const reset = useCallback(async () => {
    const current = stateRef.current;
    const currentConfig = configRef.current;
    const duration = getPhaseDurationSeconds(current.phase, currentConfig);

    const nextState: PomodoroRuntimeState = {
      ...current,
      status: 'idle',
      targetEndTime: null,
      remainingSeconds: duration,
    };

    await clearAlarm(currentConfig.id);
    applyState(nextState);
    await savePomodoroRuntime(currentConfig.id, nextState);
  }, [applyState]);

  const skip = useCallback(async () => {
    const current = stateRef.current;
    const currentConfig = configRef.current;

    const isWorkPhase = current.phase === 'work';
    const nextCycleCount = isWorkPhase
      ? (current.cycleCount + 1) % currentConfig.longBreakInterval
      : current.cycleCount;
    const nextPhase: PomodoroPhase = isWorkPhase
      ? nextCycleCount === 0
        ? 'longBreak'
        : 'shortBreak'
      : 'work';

    const duration = getPhaseDurationSeconds(nextPhase, currentConfig);
    const nextState: PomodoroRuntimeState = {
      ...current,
      status: 'idle',
      phase: nextPhase,
      targetEndTime: null,
      remainingSeconds: duration,
      cycleCount: nextCycleCount,
    };

    await clearAlarm(currentConfig.id);
    applyState(nextState);
    await savePomodoroRuntime(currentConfig.id, nextState);
  }, [applyState]);

  const seek = useCallback(
    async (targetSeconds: number) => {
      const current = stateRef.current;
      const currentConfig = configRef.current;
      const total = getPhaseDurationSeconds(current.phase, currentConfig);
      const clamped = Math.max(0, Math.min(total, Math.round(targetSeconds)));

      if (clamped <= 0) {
        await handlePhaseComplete();
        return;
      }

      if (current.status === 'running') {
        const targetEndTime = Date.now() + clamped * 1000;
        const nextState: PomodoroRuntimeState = {
          ...current,
          status: 'running',
          targetEndTime,
          remainingSeconds: clamped,
        };

        applyState(nextState);
        await setAlarm(currentConfig.id, targetEndTime);
        await savePomodoroRuntime(currentConfig.id, nextState);
      } else {
        const nextStatus = clamped === total ? 'idle' : 'paused';
        const nextState: PomodoroRuntimeState = {
          ...current,
          status: nextStatus,
          targetEndTime: null,
          remainingSeconds: clamped,
        };

        await clearAlarm(currentConfig.id);
        applyState(nextState);
        await savePomodoroRuntime(currentConfig.id, nextState);
      }
    },
    [applyState, handlePhaseComplete],
  );

  const setPhase = useCallback(
    async (newPhase: PomodoroPhase) => {
      const current = stateRef.current;
      const currentConfig = configRef.current;
      const duration = getPhaseDurationSeconds(newPhase, currentConfig);

      const nextState: PomodoroRuntimeState = {
        ...current,
        status: 'idle',
        phase: newPhase,
        targetEndTime: null,
        remainingSeconds: duration,
      };

      await clearAlarm(currentConfig.id);
      applyState(nextState);
      await savePomodoroRuntime(currentConfig.id, nextState);
    },
    [applyState],
  );

  const resetTodayCount = useCallback(async () => {
    const current = stateRef.current;
    const currentConfig = configRef.current;

    const nextState: PomodoroRuntimeState = {
      ...current,
      completedToday: 0,
    };

    applyState(nextState);
    await savePomodoroRuntime(currentConfig.id, nextState);
  }, [applyState]);

  const remainingSeconds =
    state.status === 'idle' ? totalPhaseSeconds : displaySeconds;

  const progressPercent =
    state.status === 'idle'
      ? 0
      : totalPhaseSeconds > 0
        ? Math.min(
            100,
            Math.max(
              0,
              ((totalPhaseSeconds - remainingSeconds) / totalPhaseSeconds) *
                100,
            ),
          )
        : 0;

  return {
    state,
    remainingSeconds,
    totalPhaseSeconds,
    progressPercent,
    start,
    pause,
    reset,
    skip,
    seek,
    setPhase,
    resetTodayCount,
  };
}
