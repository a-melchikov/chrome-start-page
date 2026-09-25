import type { ClockWidgetConfig } from './types';
import { useClockTicker } from './use-clock-ticker';
import {
  formatClockDate,
  formatClockTime,
  formatDayOfWeek,
  formatTimezoneAbbreviation,
} from './time-utils';

export interface ClockWidgetProps {
  config: ClockWidgetConfig;
}

export function ClockWidget({ config }: ClockWidgetProps) {
  const { currentTime } = useClockTicker(config.timezone, config.showSeconds);

  const { timeString, ampm } = formatClockTime(
    currentTime,
    config.timezone,
    config.timeFormat,
    config.showSeconds,
  );

  const dateText = config.showDate
    ? formatClockDate(currentTime, config.timezone, config.dateFormat)
    : null;

  const dayOfWeek = config.showDayOfWeek
    ? formatDayOfWeek(currentTime, config.timezone)
    : null;

  const tzAbbr = config.showTimezoneAbbr
    ? formatTimezoneAbbreviation(currentTime, config.timezone)
    : null;

  const dateLine = [dayOfWeek, dateText].filter(Boolean).join(', ');

  const accessibleLabel = [
    config.showTime ? `Время ${timeString}${ampm ? ` ${ampm}` : ''}` : '',
    dateLine,
    tzAbbr,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      aria-label={accessibleLabel || 'Часы'}
      className="widget-clock-container flex h-full w-full select-none flex-col items-center justify-center text-center"
      role="timer"
    >
      <div className="flex flex-col items-center justify-center gap-1.5">
        {config.showTime ? (
          <div className="widget-clock-time theme-glow flex items-baseline justify-center gap-1.5 font-semibold tracking-tight tabular-nums text-theme-text-primary">
            <span>{timeString}</span>
            {ampm ? (
              <span className="text-[0.45em] font-medium tracking-normal text-theme-text-secondary">
                {ampm}
              </span>
            ) : null}
          </div>
        ) : null}

        {dateLine ? (
          <div className="widget-clock-date font-medium tracking-normal text-theme-text-secondary">
            {dateLine}
          </div>
        ) : null}

        {tzAbbr ? (
          <div className="widget-clock-sub font-normal text-theme-text-muted">
            {tzAbbr}
          </div>
        ) : null}
      </div>
    </div>
  );
}
