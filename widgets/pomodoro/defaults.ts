import type { PomodoroWidgetConfig } from './types';

export const DEFAULT_POMODORO_WIDGET_WIDTH = 3;
export const DEFAULT_POMODORO_WIDGET_HEIGHT = 5;

export const DEFAULT_WORK_DURATION = 25;
export const DEFAULT_SHORT_BREAK_DURATION = 5;
export const DEFAULT_LONG_BREAK_DURATION = 15;
export const DEFAULT_LONG_BREAK_INTERVAL = 4;
export const DEFAULT_SOUND_ENABLED = true;

export function createDefaultPomodoroWidget(
  id: string,
  index: number,
): PomodoroWidgetConfig {
  return {
    id,
    type: 'pomodoro',
    title: 'Помодоро',
    workDuration: DEFAULT_WORK_DURATION,
    shortBreakDuration: DEFAULT_SHORT_BREAK_DURATION,
    longBreakDuration: DEFAULT_LONG_BREAK_DURATION,
    longBreakInterval: DEFAULT_LONG_BREAK_INTERVAL,
    soundEnabled: DEFAULT_SOUND_ENABLED,
    layout: {
      x: 0,
      y: index * DEFAULT_POMODORO_WIDGET_HEIGHT,
      w: DEFAULT_POMODORO_WIDGET_WIDTH,
      h: DEFAULT_POMODORO_WIDGET_HEIGHT,
    },
  };
}
