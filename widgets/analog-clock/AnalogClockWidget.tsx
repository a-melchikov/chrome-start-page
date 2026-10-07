import type { AnalogClockWidgetConfig } from './types';
import { useClockTicker } from '../clock/use-clock-ticker';
import {
  getAnalogClockAccessibleLabel,
  getAnalogTimezoneText,
  getDateWindowText,
  getHandAngles,
} from './time-math';
import { AnalogClockDial } from './AnalogClockDial';

export interface AnalogClockWidgetProps {
  config: AnalogClockWidgetConfig;
}

export function AnalogClockWidget({ config }: AnalogClockWidgetProps) {
  const { currentTime } = useClockTicker(config.timezone, config.showSeconds);

  const handAngles = getHandAngles(currentTime, config.timezone);
  const dateText = config.showDate
    ? getDateWindowText(currentTime, config.timezone)
    : undefined;
  const timezoneText = config.showTimezone
    ? getAnalogTimezoneText(currentTime, config.timezone)
    : undefined;

  const accessibleLabel = getAnalogClockAccessibleLabel(
    currentTime,
    config.timezone,
    config.showSeconds,
    config.showDate,
    config.showTimezone,
  );

  return (
    <div
      aria-label={accessibleLabel}
      className="widget-analog-clock-container flex size-full select-none items-center justify-center p-2 text-center"
      role="timer"
    >
      <div className="flex size-full aspect-square max-h-full max-w-full items-center justify-center">
        <AnalogClockDial
          dateText={dateText}
          dialStyle={config.dialStyle}
          handAngles={handAngles}
          showDate={config.showDate}
          showSeconds={config.showSeconds}
          showTimezone={config.showTimezone}
          timezoneText={timezoneText}
        />
      </div>
    </div>
  );
}
