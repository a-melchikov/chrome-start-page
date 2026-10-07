import type { BaseWidgetConfig } from '../types';

export type AnalogClockDialStyle = 'minimal' | 'numbers' | 'bauhaus';

export interface AnalogClockWidgetConfig extends BaseWidgetConfig<'analog-clock'> {
  type: 'analog-clock';
  dialStyle: AnalogClockDialStyle;
  showSeconds: boolean;
  showDate: boolean;
  showTimezone: boolean;
  timezone: string;
}
