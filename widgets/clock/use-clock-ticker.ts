import { useEffect, useState } from 'react';
import { getResolvedTimezone } from './time-utils';

export interface ClockTickerState {
  currentTime: Date;
  resolvedTimezone: string;
}

export function useClockTicker(
  timezone: string,
  showSeconds: boolean,
): ClockTickerState {
  const [tickerState, setTickerState] = useState<ClockTickerState>(() => ({
    currentTime: new Date(),
    resolvedTimezone: getResolvedTimezone(timezone),
  }));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const tick = () => {
      if (isDisposed) {
        return;
      }
      const now = new Date();
      const currentResolvedTz = getResolvedTimezone(timezone);
      setTickerState({
        currentTime: now,
        resolvedTimezone: currentResolvedTz,
      });

      scheduleNext();
    };

    const scheduleNext = () => {
      const nowMs = Date.now();
      const intervalMs = showSeconds ? 1000 : 60000;
      const delay = intervalMs - (nowMs % intervalMs);
      const safeDelay = Math.max(1, delay);
      timeoutId = setTimeout(tick, safeDelay);
    };

    const handleWakeOrFocus = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      tick();
    };

    scheduleNext();

    document.addEventListener('visibilitychange', handleWakeOrFocus);
    window.addEventListener('focus', handleWakeOrFocus);

    return () => {
      isDisposed = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('visibilitychange', handleWakeOrFocus);
      window.removeEventListener('focus', handleWakeOrFocus);
    };
  }, [timezone, showSeconds]);

  return tickerState;
}
