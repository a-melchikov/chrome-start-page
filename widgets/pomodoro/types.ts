import type { BaseWidgetConfig } from '../types';

export const POMODORO_AUDIO_ACTION = 'POMODORO_PLAY_CHIME' as const;
export const POMODORO_AUDIO_FINISHED = 'POMODORO_CHIME_FINISHED' as const;

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';
export type PomodoroTimerStatus = 'idle' | 'running' | 'paused';

export interface PomodoroWidgetConfig extends BaseWidgetConfig<'pomodoro'> {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  soundEnabled: boolean;
}

export interface PomodoroRuntimeState {
  status: PomodoroTimerStatus;
  phase: PomodoroPhase;
  targetEndTime: number | null;
  remainingSeconds: number;
  cycleCount: number;
  completedToday: number;
  lastResetDate: string;
}
