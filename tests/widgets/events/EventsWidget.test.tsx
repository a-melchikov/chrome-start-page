import { useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultEventsWidget } from '../../../widgets/events/defaults';
import { EventsWidget } from '../../../widgets/events/EventsWidget';
import type { CalendarEvent } from '../../../widgets/events/types';

const meeting: CalendarEvent = {
  id: 'meeting',
  title: 'Обсуждение проекта',
  date: '2026-11-03',
  time: '15:00',
  repeat: 'none',
};

function Harness({
  events = [],
  showPast = false,
}: {
  events?: CalendarEvent[];
  showPast?: boolean;
}) {
  const [config, setConfig] = useState({
    ...createDefaultEventsWidget('events', 0),
    events,
  });
  return (
    <EventsWidget config={config} onChange={setConfig} showPast={showPast} />
  );
}

describe('EventsWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());
  const user = () => userEvent.setup();

  it('adds an event with an optional time and repeat', async () => {
    const input = user();
    render(<Harness />);
    expect(screen.getByText('Ближайших событий нет')).toBeVisible();
    await input.click(screen.getByRole('button', { name: 'Добавить событие' }));
    expect(screen.getByLabelText('Название события')).toHaveFocus();
    await input.type(
      screen.getByLabelText('Название события'),
      'Встреча команды',
    );
    fireEvent.change(screen.getByLabelText('Дата'), {
      target: { value: '2026-11-04' },
    });
    fireEvent.change(screen.getByLabelText('Время (необязательно)'), {
      target: { value: '10:00' },
    });
    await input.click(screen.getByRole('combobox', { name: 'Повтор' }));
    await input.click(screen.getByRole('option', { name: /^Еженедельно$/ }));
    await input.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Встреча команды')).toBeVisible();
    expect(screen.getByText('Завтра, 10:00')).toBeVisible();
    expect(screen.getByText('Еженедельно')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Добавить событие' }),
    ).toHaveFocus();
  });

  it('validates inputs and cancels an unsaved event with Escape', async () => {
    const input = user();
    render(<Harness />);
    await input.click(screen.getByRole('button', { name: 'Добавить событие' }));
    await input.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Введите название');
    await input.type(screen.getByLabelText('Название события'), 'Черновик');
    fireEvent.change(screen.getByLabelText('Дата'), { target: { value: '' } });
    await input.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByRole('alert')).toHaveTextContent('корректную дату');
    await input.keyboard('{Escape}');
    expect(screen.queryByText('Черновик')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Добавить событие' }),
    ).toHaveFocus();
  });

  it('edits an event and cancels later changes without altering the saved value', async () => {
    const input = user();
    render(<Harness events={[meeting]} />);
    await input.click(screen.getByRole('button', { name: /Изменить событие/ }));
    await input.clear(screen.getByLabelText('Название события'));
    await input.type(
      screen.getByLabelText('Название события'),
      'Новая встреча',
    );
    await input.click(screen.getByRole('button', { name: 'Сохранить' }));
    await input.click(screen.getByRole('button', { name: /Изменить событие/ }));
    await input.clear(screen.getByLabelText('Название события'));
    await input.type(screen.getByLabelText('Название события'), 'Не сохранять');
    await input.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByText('Новая встреча')).toBeVisible();
    expect(screen.queryByText('Не сохранять')).not.toBeInTheDocument();
  });

  it('requires confirmation to delete a repeating series', async () => {
    const input = user();
    render(<Harness events={[{ ...meeting, repeat: 'weekly' }]} />);
    await input.click(screen.getByRole('button', { name: /Изменить событие/ }));
    await input.click(screen.getByRole('button', { name: 'Удалить событие' }));
    expect(screen.getByText(/и все его повторы/)).toBeVisible();
    await input.click(screen.getByRole('button', { name: 'Оставить событие' }));
    await input.click(screen.getByRole('button', { name: 'Удалить событие' }));
    await input.click(
      screen.getByRole('button', { name: 'Подтвердить удаление' }),
    );
    expect(screen.getByText('Ближайших событий нет')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Добавить событие' }),
    ).toHaveFocus();
  });

  it('updates the countdown and rolls repeats forward on focus after sleep', () => {
    render(<Harness events={[{ ...meeting, repeat: 'daily' }]} />);
    expect(
      screen.getByRole('button', { name: /Изменить событие/ }),
    ).toHaveAccessibleDescription('Сегодня, 15:00 Через 3 ч.Ежедневно');
    expect(screen.getByText('Через 3 ч.')).toBeVisible();
    act(() => {
      vi.setSystemTime(new Date('2026-11-03T16:00:00'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.getByText('Завтра, 15:00')).toBeVisible();
    expect(screen.getByText('Через 23 ч.')).toBeVisible();
  });

  it('refreshes every minute and hides one-offs after midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T23:59:30'));
    render(<Harness events={[meeting]} />);
    expect(screen.getByText('Уже наступило')).toBeVisible();
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByText('Ближайших событий нет')).toBeVisible();
  });

  it('hides past events on the card and keeps them accessible in management', async () => {
    const input = user();
    const past = { ...meeting, date: '2026-11-02' };
    const { rerender } = render(<Harness events={[past]} />);
    expect(screen.queryByText(/Обсуждение проекта/)).not.toBeInTheDocument();
    rerender(<Harness events={[past]} showPast />);
    expect(screen.getByText('Прошедшие события')).toBeVisible();
    await input.click(
      screen.getByRole('button', { name: /Обсуждение проекта/ }),
    );
    expect(
      within(screen.getByRole('dialog')).getByLabelText('Название события'),
    ).toHaveValue(meeting.title);
  });
});
