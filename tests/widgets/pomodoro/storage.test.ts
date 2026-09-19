import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { createDefaultPomodoroWidget } from '../../../widgets/pomodoro/defaults';
import {
  createDefaultRuntimeState,
  getPhaseDurationSeconds,
  getTodayDateString,
  loadPomodoroRuntime,
  normalizeRuntimeState,
  savePomodoroRuntime,
} from '../../../widgets/pomodoro/storage';
import type {
  PomodoroRuntimeState,
  PomodoroWidgetConfig,
} from '../../../widgets/pomodoro/types';

describe('Pomodoro storage and runtime normalization', () => {
  const config: PomodoroWidgetConfig = createDefaultPomodoroWidget(
    'test-pomodoro',
    0,
  );

  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('formats dates consistently to YYYY-MM-DD', () => {
    const fixedDate = new Date('2026-09-19T14:30:00Z');
    expect(getTodayDateString(fixedDate)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('calculates correct duration in seconds for each phase', () => {
    expect(getPhaseDurationSeconds('work', config)).toBe(25 * 60);
    expect(getPhaseDurationSeconds('shortBreak', config)).toBe(5 * 60);
    expect(getPhaseDurationSeconds('longBreak', config)).toBe(15 * 60);
  });

  it('creates clean default runtime state', () => {
    const state = createDefaultRuntimeState(config);
    expect(state.status).toBe('idle');
    expect(state.phase).toBe('work');
    expect(state.remainingSeconds).toBe(25 * 60);
    expect(state.completedToday).toBe(0);
    expect(state.cycleCount).toBe(0);
  });

  it('resets completedToday on a new calendar day', () => {
    const previousState: PomodoroRuntimeState = {
      status: 'idle',
      phase: 'work',
      targetEndTime: null,
      remainingSeconds: 25 * 60,
      cycleCount: 2,
      completedToday: 5,
      lastResetDate: '2026-09-18',
    };

    const nextDayTime = new Date('2026-09-19T10:00:00Z').getTime();
    const normalized = normalizeRuntimeState(
      previousState,
      config,
      nextDayTime,
    );

    expect(normalized.completedToday).toBe(0);
    expect(normalized.lastResetDate).toBe('2026-09-19');
    expect(normalized.cycleCount).toBe(2);
  });

  it('transitions to short break and increments counters when work finishes', () => {
    const baseTime = new Date('2026-09-19T14:00:00Z').getTime();
    const runningState: PomodoroRuntimeState = {
      status: 'running',
      phase: 'work',
      targetEndTime: baseTime - 1000,
      remainingSeconds: 25 * 60,
      cycleCount: 0,
      completedToday: 0,
      lastResetDate: '2026-09-19',
    };

    const normalized = normalizeRuntimeState(runningState, config, baseTime);

    expect(normalized.status).toBe('idle');
    expect(normalized.phase).toBe('shortBreak');
    expect(normalized.cycleCount).toBe(1);
    expect(normalized.completedToday).toBe(1);
    expect(normalized.remainingSeconds).toBe(5 * 60);
  });

  it('transitions to long break when 4th work cycle finishes', () => {
    const baseTime = new Date('2026-09-19T14:00:00Z').getTime();
    const runningState: PomodoroRuntimeState = {
      status: 'running',
      phase: 'work',
      targetEndTime: baseTime - 1000,
      remainingSeconds: 25 * 60,
      cycleCount: 3,
      completedToday: 3,
      lastResetDate: '2026-09-19',
    };

    const normalized = normalizeRuntimeState(runningState, config, baseTime);

    expect(normalized.status).toBe('idle');
    expect(normalized.phase).toBe('longBreak');
    expect(normalized.cycleCount).toBe(0);
    expect(normalized.completedToday).toBe(4);
    expect(normalized.remainingSeconds).toBe(15 * 60);
  });

  it('persists and loads runtime state through storage', async () => {
    const initial = await loadPomodoroRuntime(config.id, config);
    expect(initial.remainingSeconds).toBe(25 * 60);

    const updated: PomodoroRuntimeState = {
      ...initial,
      status: 'paused',
      remainingSeconds: 1200,
    };

    await savePomodoroRuntime(config.id, updated);
    const reloaded = await loadPomodoroRuntime(config.id, config);
    expect(reloaded.status).toBe('paused');
    expect(reloaded.remainingSeconds).toBe(1200);
  });

  it('updates remainingSeconds when config duration changes for an idle timer', () => {
    const idleState: PomodoroRuntimeState = {
      status: 'idle',
      phase: 'work',
      targetEndTime: null,
      remainingSeconds: 25 * 60,
      cycleCount: 0,
      completedToday: 0,
      lastResetDate: '2026-09-19',
    };

    const updatedConfig: PomodoroWidgetConfig = {
      ...config,
      workDuration: 10,
    };

    const normalized = normalizeRuntimeState(idleState, updatedConfig);
    expect(normalized.remainingSeconds).toBe(10 * 60);
  });

  it('clamps remainingSeconds when config duration is reduced below paused remaining', () => {
    const pausedState: PomodoroRuntimeState = {
      status: 'paused',
      phase: 'work',
      targetEndTime: null,
      remainingSeconds: 15 * 60,
      cycleCount: 0,
      completedToday: 0,
      lastResetDate: '2026-09-19',
    };

    const reducedConfig: PomodoroWidgetConfig = {
      ...config,
      workDuration: 10,
    };

    const normalized = normalizeRuntimeState(pausedState, reducedConfig);
    expect(normalized.remainingSeconds).toBe(10 * 60);
  });
});
