import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultAnalogClockWidget } from '../../../widgets/analog-clock/defaults';
import { AnalogClockWidget } from '../../../widgets/analog-clock/AnalogClockWidget';
import type { AnalogClockWidgetConfig } from '../../../widgets/analog-clock/types';

describe('AnalogClockWidget', () => {
  const baseConfig: AnalogClockWidgetConfig = {
    ...createDefaultAnalogClockWidget('test-analog-clock', 0),
    timezone: 'UTC',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T15:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders default minimal dial configuration with hands and without date', () => {
    render(<AnalogClockWidget config={baseConfig} />);

    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByTestId('dial-style-minimal')).toBeInTheDocument();
    expect(screen.getByTestId('analog-hour-hand')).toBeInTheDocument();
    expect(screen.getByTestId('analog-minute-hand')).toBeInTheDocument();
    expect(screen.getByTestId('analog-second-hand')).toBeInTheDocument();
    expect(screen.queryByTestId('analog-date-window')).not.toBeInTheDocument();
  });

  it('renders date window with day and month format DD.MM when showDate is true', () => {
    const config: AnalogClockWidgetConfig = {
      ...baseConfig,
      showDate: true,
    };

    render(<AnalogClockWidget config={config} />);

    expect(screen.getByTestId('analog-date-window')).toBeInTheDocument();
    expect(screen.getByText('22.09')).toBeInTheDocument();
  });

  it('calculates expected hand angles for 15:00:00 (hour 90 deg, minute 0 deg, second 0 deg)', () => {
    render(<AnalogClockWidget config={baseConfig} />);

    const hourHand = screen.getByTestId('analog-hour-hand');
    const minuteHand = screen.getByTestId('analog-minute-hand');
    const secondHand = screen.getByTestId('analog-second-hand');

    expect(hourHand).toHaveAttribute('transform', 'rotate(90 100 100)');
    expect(minuteHand).toHaveAttribute('transform', 'rotate(0 100 100)');
    expect(secondHand).toHaveAttribute('transform', 'rotate(0 100 100)');
  });

  it('renders numbers style with 12, 6, 9 and date window replacing 3', () => {
    const config: AnalogClockWidgetConfig = {
      ...baseConfig,
      dialStyle: 'numbers',
      showDate: true,
    };

    render(<AnalogClockWidget config={config} />);

    expect(screen.getByTestId('dial-style-numbers')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByTestId('analog-date-window')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('renders numbers style with numeral 3 when date is hidden', () => {
    const config: AnalogClockWidgetConfig = {
      ...baseConfig,
      dialStyle: 'numbers',
      showDate: false,
    };

    render(<AnalogClockWidget config={config} />);

    expect(screen.getByTestId('dial-style-numbers')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByTestId('analog-date-window')).not.toBeInTheDocument();
  });

  it('renders bauhaus style with distinctive batons and hands', () => {
    const config: AnalogClockWidgetConfig = {
      ...baseConfig,
      dialStyle: 'bauhaus',
    };

    render(<AnalogClockWidget config={config} />);

    expect(screen.getByTestId('dial-style-bauhaus')).toBeInTheDocument();
    expect(screen.getByTestId('analog-hour-hand')).toBeInTheDocument();
    expect(screen.getByTestId('analog-minute-hand')).toBeInTheDocument();
    expect(screen.getByTestId('analog-second-hand')).toBeInTheDocument();
  });

  it('hides second hand when showSeconds is false', () => {
    const config: AnalogClockWidgetConfig = {
      ...baseConfig,
      showSeconds: false,
    };

    render(<AnalogClockWidget config={config} />);

    expect(screen.queryByTestId('analog-second-hand')).not.toBeInTheDocument();
    expect(screen.getByTestId('analog-hour-hand')).toBeInTheDocument();
    expect(screen.getByTestId('analog-minute-hand')).toBeInTheDocument();
  });

  it('renders timezone label when showTimezone is true', () => {
    const config: AnalogClockWidgetConfig = {
      ...baseConfig,
      showTimezone: true,
      timezone: 'Europe/Moscow',
    };

    render(<AnalogClockWidget config={config} />);

    expect(screen.getByTestId('analog-timezone-label')).toBeInTheDocument();
    expect(screen.getByTestId('analog-timezone-label')).toHaveTextContent(
      /MSK|Москва|GMT\+3/i,
    );
  });

  it('provides an accessible screen-reader timer label', () => {
    const config: AnalogClockWidgetConfig = {
      ...baseConfig,
      showDate: true,
    };
    render(<AnalogClockWidget config={config} />);

    const container = screen.getByRole('timer');
    expect(container).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Аналоговые часы: 15:00:00'),
    );
    expect(container).toHaveAttribute(
      'aria-label',
      expect.stringContaining('22 сентября 2026'),
    );
  });
});
