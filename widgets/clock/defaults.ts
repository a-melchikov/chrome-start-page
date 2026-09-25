import type {
  ClockDateFormat,
  ClockTimeFormat,
  ClockWidgetConfig,
} from './types';

export const DEFAULT_CLOCK_WIDGET_LAYOUT = {
  w: 4,
  h: 2,
  minW: 2,
  minH: 2,
} as const;

export const DEFAULT_CLOCK_TIME_FORMAT: ClockTimeFormat = '24h';
export const DEFAULT_CLOCK_DATE_FORMAT: ClockDateFormat = 'full';
export const DEFAULT_CLOCK_TIMEZONE = 'local';

export function createDefaultClockWidget(
  id: string,
  index: number,
): ClockWidgetConfig {
  return {
    id,
    type: 'clock',
    timeFormat: DEFAULT_CLOCK_TIME_FORMAT,
    showTime: true,
    showSeconds: false,
    showDate: true,
    dateFormat: DEFAULT_CLOCK_DATE_FORMAT,
    showDayOfWeek: true,
    timezone: DEFAULT_CLOCK_TIMEZONE,
    showTimezoneName: false,
    showTimezoneAbbr: false,
    layout: {
      x: 0,
      y: index * DEFAULT_CLOCK_WIDGET_LAYOUT.h,
      w: DEFAULT_CLOCK_WIDGET_LAYOUT.w,
      h: DEFAULT_CLOCK_WIDGET_LAYOUT.h,
    },
  };
}
