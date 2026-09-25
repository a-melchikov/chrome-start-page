import type { BaseWidgetConfig } from '../types';

export type ClockTimeFormat = '12h' | '24h';
export type ClockDateFormat = 'full' | 'numeric' | 'shortWithYear' | 'short';

export interface ClockWidgetConfig extends BaseWidgetConfig<'clock'> {
  type: 'clock';
  timeFormat: ClockTimeFormat;
  showTime: boolean;
  showSeconds: boolean;
  showDate: boolean;
  dateFormat: ClockDateFormat;
  showDayOfWeek: boolean;
  timezone: string;
  showTimezoneName: boolean;
  showTimezoneAbbr: boolean;
}
