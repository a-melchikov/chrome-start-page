import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MotionNotice } from '../../components/ui/MotionNotice';

describe('MotionNotice', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps the message during exit and removes it after the transition', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <MotionNotice className="test-notice" message="Ошибка" role="alert" />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Ошибка');
    rerender(
      <MotionNotice className="test-notice" message={null} role="alert" />,
    );

    const notice = screen.getByText('Ошибка');
    expect(notice).toHaveAttribute('data-visible', 'false');
    expect(notice).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText('Ошибка')).not.toBeInTheDocument();
  });
});
