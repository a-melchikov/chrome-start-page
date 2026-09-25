import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultClockWidget } from '../../../widgets/clock/defaults';
import { ClockWidget } from '../../../widgets/clock/ClockWidget';
import type { ClockWidgetConfig } from '../../../widgets/clock/types';

describe('ClockWidget', () => {
  const baseConfig: ClockWidgetConfig = {
    ...createDefaultClockWidget('test-clock', 0),
    timezone: 'UTC',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T14:35:42Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders default configuration with 24h time, date, and day of week', () => {
    render(<ClockWidget config={baseConfig} />);

    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByText('14:35')).toBeInTheDocument();
    expect(screen.getByText(/22 сентября 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Вторник/)).toBeInTheDocument();
  });

  it('renders seconds when showSeconds is true', () => {
    const config: ClockWidgetConfig = {
      ...baseConfig,
      showSeconds: true,
    };

    render(<ClockWidget config={config} />);
    expect(screen.getByText('14:35:42')).toBeInTheDocument();
  });

  it('renders 12h format with AM/PM', () => {
    const config: ClockWidgetConfig = {
      ...baseConfig,
      timeFormat: '12h',
    };

    render(<ClockWidget config={config} />);
    expect(screen.getByText('2:35')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();
  });

  it('hides time when showTime is false', () => {
    const config: ClockWidgetConfig = {
      ...baseConfig,
      showTime: false,
    };

    render(<ClockWidget config={config} />);
    expect(screen.queryByText('14:35')).not.toBeInTheDocument();
    expect(screen.getByText(/22 сентября 2026/)).toBeInTheDocument();
  });

  it('hides date when showDate is false', () => {
    const config: ClockWidgetConfig = {
      ...baseConfig,
      showDate: false,
    };

    render(<ClockWidget config={config} />);
    expect(screen.getByText('14:35')).toBeInTheDocument();
    expect(screen.queryByText(/22 сентября 2026/)).not.toBeInTheDocument();
    expect(screen.getByText('Вторник')).toBeInTheDocument();
  });

  it('hides day of week when showDayOfWeek is false', () => {
    const config: ClockWidgetConfig = {
      ...baseConfig,
      showDayOfWeek: false,
    };

    render(<ClockWidget config={config} />);
    expect(screen.queryByText(/Вторник/)).not.toBeInTheDocument();
    expect(screen.getByText('22 сентября 2026')).toBeInTheDocument();
  });

  it('renders timezone abbreviation when showTimezoneAbbr is true', () => {
    const config: ClockWidgetConfig = {
      ...baseConfig,
      showTimezoneAbbr: true,
    };

    render(<ClockWidget config={config} />);
    expect(screen.getByText('UTC')).toBeInTheDocument();
  });

  it('updates time on next tick when showSeconds is true', () => {
    const config: ClockWidgetConfig = {
      ...baseConfig,
      showSeconds: true,
    };

    render(<ClockWidget config={config} />);
    expect(screen.getByText('14:35:42')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('14:35:43')).toBeInTheDocument();
  });
});
