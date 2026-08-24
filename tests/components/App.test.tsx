import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import { App } from '../../entrypoints/newtab/App';
import {
  DASHBOARD_STORAGE_KEY,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';

describe('App', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('shows editor controls only while edit mode is enabled', async () => {
    const user = userEvent.setup();
    render(<App />);

    const editButton = screen.getByRole('button', {
      name: 'Включить режим редактирования',
    });
    expect(
      screen.queryByRole('button', { name: 'Добавить виджет' }),
    ).not.toBeInTheDocument();

    await user.click(editButton);

    expect(
      screen.getByRole('button', { name: 'Добавить виджет' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Настройки оформления' }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    );

    expect(
      screen.queryByRole('button', { name: 'Добавить виджет' }),
    ).not.toBeInTheDocument();
  });

  it('opens the widget picker and closes it on cancel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    const addWidgetButton = screen.getByRole('button', {
      name: 'Добавить виджет',
    });
    await waitFor(() => expect(addWidgetButton).toBeEnabled());
    await user.click(addWidgetButton);

    const dialog = screen.getByRole('dialog', { name: 'Добавить виджет' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Список ссылок' })).toHaveFocus();

    fireEvent(dialog, new Event('cancel', { cancelable: true }));

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(addWidgetButton).toHaveFocus();
  });

  it('applies and persists theme and background changes immediately', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Настройки оформления' }),
    );
    expect(screen.getByRole('button', { name: 'Системная' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Тёмная' }));
    fireEvent.change(screen.getByLabelText('Цвет фона'), {
      target: { value: '#123456' },
    });

    expect(document.documentElement).toHaveClass('dark');
    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.appearance).toEqual({
        theme: 'dark',
        backgroundColor: '#123456',
      });
    });
  });

  it('restores a saved appearance on load', async () => {
    const user = userEvent.setup();
    await saveDashboardConfig({
      version: 1,
      widgets: [],
      appearance: {
        theme: 'light',
        backgroundColor: '#abcdef',
      },
    });

    render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Настройки оформления' }),
    );

    expect(screen.getByRole('button', { name: 'Светлая' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Цвет фона')).toHaveValue('#abcdef');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('updates the system theme when prefers-color-scheme changes', async () => {
    let isDark = false;
    const listeners = new Set<EventListener>();
    const mediaQuery = {
      get matches() {
        return isDark;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(
        (_type: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === 'function') {
            listeners.add(listener);
          }
        },
      ),
      removeEventListener: vi.fn(
        (_type: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === 'function') {
            listeners.delete(listener);
          }
        },
      ),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
    vi.mocked(window.matchMedia).mockReturnValue(mediaQuery);

    render(<App />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    act(() => {
      isDark = true;
      listeners.forEach((listener) => listener(new Event('change')));
    });

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
