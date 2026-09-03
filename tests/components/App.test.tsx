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

  it('turns off edit mode when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    expect(
      screen.getByRole('button', { name: 'Добавить виджет' }),
    ).toBeVisible();

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('button', { name: 'Добавить виджет' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Включить режим редактирования' }),
    ).toHaveAttribute('aria-pressed', 'false');
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
    expect(screen.getByRole('button', { name: 'Markdown' })).toHaveFocus();

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
    const themeSection = screen.getByText('Тема', { selector: 'summary' });
    expect(themeSection).toHaveFocus();
    await user.click(themeSection);
    await user.click(screen.getByRole('button', { name: 'Тёмная' }));
    await user.click(screen.getByText('Цвет фона', { selector: 'summary' }));
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
        wallpaper: { type: 'none' },
        liquidGlassEnabled: true,
      });
    });
  });

  it('applies and persists the Liquid Glass preference immediately', async () => {
    const user = userEvent.setup();
    render(<App />);

    const app = screen.getByRole('main');
    expect(app).toHaveClass('liquid-glass-enabled');

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Настройки оформления' }),
    );
    await user.click(screen.getByText('Виджеты', { selector: 'summary' }));
    await user.click(
      screen.getByRole('switch', { name: 'Эффект Liquid Glass' }),
    );

    expect(app).not.toHaveClass('liquid-glass-enabled');
    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.appearance.liquidGlassEnabled).toBe(false);
    });
  });

  it('restores a saved appearance on load', async () => {
    const user = userEvent.setup();
    await saveDashboardConfig({
      version: 4,
      widgets: [],
      appearance: {
        theme: 'light',
        backgroundColor: '#abcdef',
        wallpaper: { type: 'none' },
        liquidGlassEnabled: true,
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
    await user.click(screen.getByText('Тема', { selector: 'summary' }));
    await user.click(screen.getByText('Цвет фона', { selector: 'summary' }));

    expect(screen.getByRole('button', { name: 'Светлая' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Цвет фона')).toHaveValue('#abcdef');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('keeps the previous wallpaper and shows an error for an invalid URL', async () => {
    const user = userEvent.setup();
    const previousWallpaper = {
      type: 'url' as const,
      url: 'https://example.com/previous.jpg',
    };
    await saveDashboardConfig({
      version: 4,
      widgets: [],
      appearance: {
        theme: 'system',
        backgroundColor: '#f4f4f5',
        wallpaper: previousWallpaper,
        liquidGlassEnabled: true,
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
    await user.click(screen.getByText('Обои', { selector: 'summary' }));
    await user.click(screen.getByText('По ссылке', { selector: 'summary' }));
    await user.type(
      screen.getByLabelText('Ссылка на изображение'),
      'http://example.com/wallpaper.jpg',
    );
    await user.click(
      screen.getByRole('button', { name: 'Установить по ссылке' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Разрешены только HTTPS-ссылки',
    );
    const storedConfig = await storage.getItem<DashboardConfig>(
      DASHBOARD_STORAGE_KEY,
    );
    expect(storedConfig?.appearance.wallpaper).toEqual(previousWallpaper);
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
