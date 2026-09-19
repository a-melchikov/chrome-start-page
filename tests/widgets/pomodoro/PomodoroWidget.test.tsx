import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { createDefaultPomodoroWidget } from '../../../widgets/pomodoro/defaults';
import { PomodoroWidget } from '../../../widgets/pomodoro/PomodoroWidget';
import type { PomodoroWidgetConfig } from '../../../widgets/pomodoro/types';

describe('PomodoroWidget', () => {
  const config: PomodoroWidgetConfig = createDefaultPomodoroWidget(
    'pomodoro-test-widget',
    0,
  );

  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllTimers();
  });

  it('renders with initial 25:00 display and controls', () => {
    render(<PomodoroWidget config={config} />);

    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '25:00',
    );
    expect(screen.getByRole('button', { name: 'Старт' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Сбросить текущую фазу' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Пропустить текущую фазу' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Сегодня:')).toBeInTheDocument();
  });

  it('switches phases when tabs are clicked', async () => {
    const user = userEvent.setup();
    render(<PomodoroWidget config={config} />);

    const breakTab = screen.getByRole('tab', { name: 'Перерыв' });
    await user.click(breakTab);

    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '05:00',
    );

    const longBreakTab = screen.getByRole('tab', { name: 'Длинный' });
    await user.click(longBreakTab);

    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '15:00',
    );
  });

  it('starts and pauses the timer', async () => {
    const user = userEvent.setup();
    render(<PomodoroWidget config={config} />);

    const startButton = screen.getByRole('button', { name: 'Старт' });
    await user.click(startButton);

    expect(
      await screen.findByRole('button', { name: 'Пауза' }),
    ).toBeInTheDocument();

    const pauseButton = screen.getByRole('button', { name: 'Пауза' });
    await user.click(pauseButton);

    expect(
      await screen.findByRole('button', { name: 'Старт' }),
    ).toBeInTheDocument();
  });

  it('skips to next phase on skip button click', async () => {
    const user = userEvent.setup();
    render(<PomodoroWidget config={config} />);

    const skipButton = screen.getByRole('button', {
      name: 'Пропустить текущую фазу',
    });
    await user.click(skipButton);

    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '05:00',
    );
  });

  it('resets phase on reset button click', async () => {
    const user = userEvent.setup();
    render(<PomodoroWidget config={config} />);

    const breakTab = screen.getByRole('tab', { name: 'Перерыв' });
    await user.click(breakTab);
    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '05:00',
    );

    const resetButton = screen.getByRole('button', {
      name: 'Сбросить текущую фазу',
    });
    await user.click(resetButton);

    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '05:00',
    );
  });

  it('updates display time immediately when config duration changes in idle status', () => {
    const { rerender } = render(<PomodoroWidget config={config} />);
    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '25:00',
    );
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '1500');

    const updatedConfig = { ...config, workDuration: 10 };
    rerender(<PomodoroWidget config={updatedConfig} />);

    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '10:00',
    );
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '600');
  });

  it('seeks time using keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<PomodoroWidget config={config} />);

    const slider = screen.getByRole('slider');
    slider.focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '24:45',
    );

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '25:00',
    );

    await user.keyboard('{End}');
    expect(
      await screen.findByTestId('pomodoro-timer-display'),
    ).toHaveTextContent('05:00');
  });

  it('seeks time by dragging/clicking progress bar with pointer events', async () => {
    render(<PomodoroWidget config={config} />);

    const slider = screen.getByTestId('pomodoro-seek-bar');
    await waitFor(() => {
      expect(slider).toHaveAttribute('aria-valuenow', '1500');
    });

    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 20,
      right: 300,
      bottom: 120,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    fireEvent.pointerDown(slider, { clientX: 200, button: 0 });
    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '12:30',
    );

    fireEvent.pointerMove(window, { clientX: 250 });
    expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
      '06:15',
    );

    fireEvent.pointerUp(window, { clientX: 250 });
    await waitFor(() => {
      expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
        '06:15',
      );
    });
  });

  it('seeks time while timer is running and keeps running state', async () => {
    const user = userEvent.setup();
    render(<PomodoroWidget config={config} />);

    const slider = screen.getByTestId('pomodoro-seek-bar');
    await waitFor(() => {
      expect(slider).toHaveAttribute('aria-valuenow', '1500');
    });

    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 200,
      height: 20,
      right: 300,
      bottom: 120,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    const startButton = screen.getByRole('button', { name: 'Старт' });
    await user.click(startButton);

    expect(
      await screen.findByRole('button', { name: 'Пауза' }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(slider, { clientX: 200, button: 0 });
    fireEvent.pointerUp(window, { clientX: 200 });

    await waitFor(() => {
      expect(screen.getByTestId('pomodoro-timer-display')).toHaveTextContent(
        '12:30',
      );
    });
    expect(screen.getByRole('button', { name: 'Пауза' })).toBeInTheDocument();
  });
});
