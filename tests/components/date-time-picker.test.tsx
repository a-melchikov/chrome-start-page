import { fireEvent, render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { EventDialog } from '../../widgets/events/EventDialog';
import type { CalendarEvent } from '../../widgets/events/types';

const event: CalendarEvent = {
  id: 'example-event',
  title: 'Обсуждение проекта',
  date: '2026-11-06',
  time: '',
  repeat: 'none',
};

function renderEditor(overrides: Partial<CalendarEvent> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <EventDialog
      event={{ ...event, ...overrides }}
      isNew
      onSave={onSave}
      onClose={onClose}
      onDelete={vi.fn()}
      returnFocusFallback={() => null}
    />,
  );
  return { onSave, onClose };
}
const calendar = () =>
  within(screen.getByRole('dialog', { name: 'Выбор даты' }));
const timePanel = () =>
  within(screen.getByRole('dialog', { name: 'Выбор времени' }));

describe('themed event date and time pickers', () => {
  beforeAll(() => {
    // jsdom has no top layer or layout. Real positioning is checked in Chrome.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    Object.defineProperties(HTMLElement.prototype, {
      showPopover: {
        configurable: true,
        value: function (this: HTMLElement) {
          this.style.display = 'block';
        },
      },
      hidePopover: {
        configurable: true,
        value: function (this: HTMLElement) {
          this.style.display = 'none';
        },
      },
    });
  });
  afterAll(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
    Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-06T09:33:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('keeps native segmented inputs and does not open when editing them', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();
    const date = screen.getByLabelText('Дата');
    const time = screen.getByLabelText('Время (необязательно)');
    expect(date).toHaveAttribute('type', 'date');
    expect(time).toHaveAttribute('type', 'time');
    await user.click(date);
    fireEvent.change(date, { target: { value: '2028-02-29' } });
    fireEvent.change(time, { target: { value: '23:59' } });
    expect(
      screen.queryByRole('dialog', { name: 'Выбор даты' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(onSave).toHaveBeenCalledWith({
      ...event,
      date: '2028-02-29',
      time: '23:59',
    });
  });

  it('opens with keyboard, selects a day and returns focus without saving the event', async () => {
    const user = userEvent.setup();
    const { onSave, onClose } = renderEditor();
    screen.getByLabelText('Дата').focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(
      calendar().getByRole('button', { name: /пятница, 6 ноября 2026/ }),
    ).toHaveFocus();
    expect(
      calendar()
        .getAllByRole('columnheader')
        .map((item) => item.textContent),
    ).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']);
    await user.click(
      calendar().getByRole('button', { name: /суббота, 7 ноября 2026/ }),
    );
    expect(screen.getByLabelText('Дата')).toHaveValue('2026-11-07');
    expect(
      screen.queryByRole('dialog', { name: 'Выбор даты' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Открыть календарь' }),
    ).toHaveFocus();
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('navigates months, years and leap days without committing navigation', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Открыть календарь' }));
    await user.click(
      calendar().getByRole('button', { name: 'Следующий месяц' }),
    );
    expect(
      calendar().getByRole('button', { name: 'Декабрь 2026' }),
    ).toBeVisible();
    await user.click(
      calendar().getByRole('button', { name: 'Следующий месяц' }),
    );
    await user.click(calendar().getByRole('button', { name: 'Январь 2027' }));
    await user.click(calendar().getByRole('button', { name: '2027' }));
    await user.click(
      calendar().getByRole('button', { name: 'Следующие годы' }),
    );
    await user.click(calendar().getByRole('button', { name: '2028' }));
    await user.click(calendar().getByRole('button', { name: 'Февраль' }));
    expect(screen.getByLabelText('Дата')).toHaveValue('2026-11-06');
    await user.click(
      calendar().getByRole('button', { name: /вторник, 29 февраля 2028/ }),
    );
    expect(screen.getByLabelText('Дата')).toHaveValue('2028-02-29');
  });

  it('supports keyboard navigation across a month boundary', async () => {
    const user = userEvent.setup();
    renderEditor({ date: '2026-12-31' });
    await user.click(screen.getByRole('button', { name: 'Открыть календарь' }));
    await user.keyboard('{ArrowRight}');
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(
      calendar().getByRole('button', { name: /пятница, 1 января 2027/ }),
    ).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Дата')).toHaveValue('2027-01-01');
  });

  it.each(['1000-01-01', '9999-12-31'])(
    'prevents browsing beyond supported date %s',
    async (date) => {
      const user = userEvent.setup();
      renderEditor({ date });
      await user.click(
        screen.getByRole('button', { name: 'Открыть календарь' }),
      );
      expect(
        calendar().getByRole('button', {
          name: date.startsWith('1000')
            ? 'Предыдущий месяц'
            : 'Следующий месяц',
        }),
      ).toBeDisabled();
      await user.keyboard(
        date.startsWith('1000') ? '{ArrowLeft}' : '{ArrowRight}',
      );
      expect(screen.getByLabelText('Дата')).toHaveValue(date);
      expect(
        calendar().getByRole('button', {
          name: new RegExp(
            date.startsWith('1000') ? ', 1 января 1000' : ', 31 декабря 9999',
          ),
        }),
      ).toHaveFocus();
    },
  );

  it('opens at today when a manually entered year is outside the allowed range', async () => {
    const user = userEvent.setup();
    renderEditor();
    fireEvent.change(screen.getByLabelText('Дата'), {
      target: { value: '0999-01-01' },
    });
    await user.click(screen.getByRole('button', { name: 'Открыть календарь' }));
    expect(
      calendar().getByRole('button', { name: /пятница, 6 ноября 2026/ }),
    ).toHaveFocus();
    expect(screen.getByLabelText('Дата')).toHaveValue('0999-01-01');
    await user.click(calendar().getByRole('button', { name: 'Сегодня' }));
    expect(screen.getByLabelText('Дата')).toHaveValue('2026-11-06');
  });

  it('selects today and allows selecting an adjacent month day directly', async () => {
    const user = userEvent.setup();
    renderEditor({ date: '2026-12-01' });
    await user.click(screen.getByRole('button', { name: 'Открыть календарь' }));
    await user.click(
      calendar().getByRole('button', { name: /понедельник, 30 ноября 2026/ }),
    );
    expect(screen.getByLabelText('Дата')).toHaveValue('2026-11-30');
    await user.click(screen.getByRole('button', { name: 'Открыть календарь' }));
    await user.click(calendar().getByRole('button', { name: 'Сегодня' }));
    expect(screen.getByLabelText('Дата')).toHaveValue('2026-11-06');
  });

  it('suggests current time without assigning it and commits only after Done', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Выбрать время' }));
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('');
    expect(
      within(timePanel().getByRole('listbox', { name: 'Часы' })).getByRole(
        'option',
        { selected: true },
      ),
    ).toHaveTextContent('09');
    expect(
      within(timePanel().getByRole('listbox', { name: 'Минуты' })).getByRole(
        'option',
        { selected: true },
      ),
    ).toHaveTextContent('33');
    await user.keyboard('{Escape}');
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Выбрать время' }));
    await user.click(timePanel().getByRole('button', { name: 'Готово' }));
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('09:33');
    expect(screen.getByRole('button', { name: 'Выбрать время' })).toHaveFocus();
  });

  it('updates hours and minutes immediately, retains them on Escape, then closes the form on the next Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor({ time: '09:33' });
    await user.click(screen.getByRole('button', { name: 'Выбрать время' }));
    await user.click(
      within(timePanel().getByRole('listbox', { name: 'Часы' })).getByRole(
        'option',
        { name: '23' },
      ),
    );
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('23:33');
    await user.click(
      within(timePanel().getByRole('listbox', { name: 'Минуты' })).getByRole(
        'option',
        { name: '59' },
      ),
    );
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('23:59');
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', { name: 'Выбор времени' }),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('23:59');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('supports keyboard time selection and clears optional time', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({ time: '23:59' });
    await user.click(screen.getByRole('button', { name: 'Выбрать время' }));
    await user.keyboard('{Home}{ArrowDown}');
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('01:59');
    await user.click(timePanel().getByRole('button', { name: 'Без времени' }));
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('');
    expect(
      screen.queryByRole('dialog', { name: 'Выбор времени' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(onSave).toHaveBeenCalledWith(event);
  });

  it('switches pickers and dismisses outside without stealing focus or losing the draft', async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(screen.getByRole('button', { name: 'Открыть календарь' }));
    await user.click(screen.getByRole('button', { name: 'Выбрать время' }));
    expect(
      screen.queryByRole('dialog', { name: 'Выбор даты' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(timePanel().getByRole('listbox', { name: 'Часы' })).getByRole(
        'option',
        { name: '12' },
      ),
    );
    await user.click(screen.getByLabelText('Название события'));
    expect(screen.getByLabelText('Название события')).toHaveFocus();
    expect(
      screen.queryByRole('dialog', { name: 'Выбор времени' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Время (необязательно)')).toHaveValue('12:33');
  });

  it('dismisses a picker on backdrop click without dismissing the editor', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor();
    const editor = screen.getByRole('dialog', { name: 'Новое событие' });
    await user.click(screen.getByRole('button', { name: 'Открыть календарь' }));
    fireEvent.click(editor);
    expect(
      screen.queryByRole('dialog', { name: 'Выбор даты' }),
    ).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(editor);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the calendar below the field without resetting its internal scroll when space is limited', async () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute('popover') === 'manual')
          return new DOMRect(0, 0, 250, 330);
        return new DOMRect(20, window.innerHeight - 68, 220, 40);
      });
    try {
      const user = userEvent.setup();
      renderEditor();
      await user.click(
        screen.getByRole('button', { name: 'Открыть календарь' }),
      );
      const panel = screen.getByRole('dialog', { name: 'Выбор даты' });
      expect(panel.style.top).toBe(`${window.innerHeight - 22}px`);
      expect(panel.style.maxHeight).toBe('14px');
      panel.scrollTop = 100;
      let maxHeight = panel.style.maxHeight;
      // Model the browser clamping scrollTop if a temporary measurement
      // expands the panel before shrinking it back to the available space.
      Object.defineProperty(panel.style, 'maxHeight', {
        configurable: true,
        get: () => maxHeight,
        set: (height: string) => {
          if (height !== maxHeight) panel.scrollTop = 0;
          maxHeight = height;
        },
      });
      fireEvent.scroll(panel);
      expect(panel.scrollTop).toBe(100);
      fireEvent.scroll(document);
      expect(panel.scrollTop).toBe(100);
    } finally {
      rect.mockRestore();
    }
  });

  it('blocks saving empty dates and invalid native input, even for optional time', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();
    fireEvent.change(screen.getByLabelText('Дата'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'корректную дату и время',
    );
    fireEvent.change(screen.getByLabelText('Дата'), {
      target: { value: '2026-11-06' },
    });
    const time = screen.getByLabelText('Время (необязательно)');
    // Native partial segments are only available in a real browser. Simulate
    // the form's validity result here; Chrome verification exercises the input.
    const form = time.closest('form')!;
    const formCheck = vi.spyOn(form, 'checkValidity').mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(onSave).not.toHaveBeenCalled();
    formCheck.mockRestore();
  });
});
