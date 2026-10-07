import type { AnalogClockDialStyle, AnalogClockWidgetConfig } from './types';

export const DEFAULT_ANALOG_CLOCK_WIDGET_LAYOUT = {
  w: 2,
  h: 4,
  minW: 2,
  minH: 2,
} as const;

export const DEFAULT_ANALOG_CLOCK_DIAL_STYLE: AnalogClockDialStyle = 'minimal';
export const DEFAULT_ANALOG_CLOCK_TIMEZONE = 'local';

export function createDefaultAnalogClockWidget(
  id: string,
  index: number,
): AnalogClockWidgetConfig {
  return {
    id,
    type: 'analog-clock',
    dialStyle: DEFAULT_ANALOG_CLOCK_DIAL_STYLE,
    showSeconds: true,
    showDate: false,
    showTimezone: false,
    timezone: DEFAULT_ANALOG_CLOCK_TIMEZONE,
    layout: {
      x: 0,
      y: index * DEFAULT_ANALOG_CLOCK_WIDGET_LAYOUT.h,
      w: DEFAULT_ANALOG_CLOCK_WIDGET_LAYOUT.w,
      h: DEFAULT_ANALOG_CLOCK_WIDGET_LAYOUT.h,
    },
  };
}
