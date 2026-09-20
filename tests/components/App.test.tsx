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
  DASHBOARD_BACKUP_FORMAT,
  DASHBOARD_BACKUP_FORMAT_VERSION,
} from '../../storage/dashboard-backup';
import {
  DASHBOARD_STORAGE_KEY,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';

function createBackupFile(config: DashboardConfig) {
  return new File(
    [
      JSON.stringify({
        format: DASHBOARD_BACKUP_FORMAT,
        formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
        exportedAt: '2026-09-10T12:34:56.000Z',
        dashboard: config,
        localWallpaper: null,
      }),
    ],
    'dashboard-backup.json',
    { type: 'application/json' },
  );
}

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
    expect(
      screen.getByRole('button', { name: 'Импорт и экспорт' }),
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

  it('replaces the dashboard only after import confirmation', async () => {
    const user = userEvent.setup();
    const current: DashboardConfig = {
      version: 5,
      widgets: [
        {
          id: 'current-widget',
          type: 'markdown',
          title: 'Текущий виджет',
          content: 'До импорта',
          layout: { x: 0, y: 0, w: 4, h: 3 },
        },
      ],
      appearance: {
        theme: 'light',
        backgroundColor: '#f4f4f5',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    };
    const imported: DashboardConfig = {
      version: 5,
      widgets: [
        {
          id: 'imported-widget',
          type: 'markdown',
          title: 'Импортированный виджет',
          content: 'После импорта',
          layout: { x: 2, y: 1, w: 5, h: 4 },
        },
      ],
      appearance: {
        ...current.appearance,
        theme: 'dark',
        backgroundColor: '#123456',
      },
    };
    await saveDashboardConfig(current);
    render(<App />);

    expect(await screen.findByText('Текущий виджет')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Включить режим редактирования' }),
    );
    await user.click(screen.getByRole('button', { name: 'Импорт и экспорт' }));
    await user.upload(
      screen.getByLabelText('Файл резервной копии'),
      createBackupFile(imported),
    );

    expect(screen.getByText('Текущий виджет')).toBeVisible();
    expect(
      screen.queryByText('Импортированный виджет'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Импортировать' }));

    expect(await screen.findByText('Импортированный виджет')).toBeVisible();
    expect(screen.queryByText('Текущий виджет')).not.toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await expect(
      storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
    ).resolves.toEqual(imported);
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
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      });
    });
  });

  it('previews, persists, resets, and toggles Liquid Glass settings', async () => {
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

    const transparency = screen.getByRole('slider', {
      name: 'Прозрачность',
    });
    fireEvent.change(transparency, { target: { value: '70' } });
    expect(screen.getByText('70%')).toBeVisible();
    fireEvent.pointerUp(transparency);

    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.appearance.liquidGlass.transparency).toBe(70);
    });

    await user.click(
      screen.getByRole('switch', { name: 'Эффект Liquid Glass' }),
    );

    expect(app).not.toHaveClass('liquid-glass-enabled');
    expect(transparency).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Вернуть стандартные параметры' }),
    );

    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.appearance.liquidGlass).toEqual({
        enabled: false,
        transparency: 40,
        blur: 18,
        shadow: 50,
      });
    });
  });

  it('restores a saved appearance on load', async () => {
    const user = userEvent.setup();
    await saveDashboardConfig({
      version: 5,
      widgets: [],
      appearance: {
        theme: 'light',
        backgroundColor: '#abcdef',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
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

  it('maps saved Liquid Glass controls to CSS custom properties', async () => {
    const config: DashboardConfig = {
      version: 5,
      widgets: [],
      appearance: {
        theme: 'dark',
        backgroundColor: '#18181b',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 75,
          blur: 12,
          shadow: 80,
        },
      },
    };
    await saveDashboardConfig(config);

    render(<App />);

    const app = screen.getByRole('main');
    await waitFor(() => {
      expect(app).toHaveClass('liquid-glass-enabled');
      expect(app.style.getPropertyValue('--liquid-glass-opacity')).toBe('0.25');
      expect(app.style.getPropertyValue('--liquid-glass-blur')).toBe('12px');
      expect(app.style.getPropertyValue('--liquid-glass-shadow')).toBe('0.8');
    });
  });

  it('keeps Liquid Glass custom properties when the effect is disabled', async () => {
    const config: DashboardConfig = {
      version: 5,
      widgets: [],
      appearance: {
        theme: 'light',
        backgroundColor: '#f4f4f5',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: false,
          transparency: 25,
          blur: 30,
          shadow: 10,
        },
      },
    };
    await saveDashboardConfig(config);

    render(<App />);

    const app = screen.getByRole('main');
    await waitFor(() => {
      expect(app).not.toHaveClass('liquid-glass-enabled');
      expect(app.style.getPropertyValue('--liquid-glass-opacity')).toBe('0.75');
      expect(app.style.getPropertyValue('--liquid-glass-blur')).toBe('30px');
      expect(app.style.getPropertyValue('--liquid-glass-shadow')).toBe('0.1');
    });
  });

  it('keeps the previous wallpaper and shows an error for an invalid URL', async () => {
    const user = userEvent.setup();
    const previousWallpaper = {
      type: 'url' as const,
      url: 'https://example.com/previous.jpg',
    };
    await saveDashboardConfig({
      version: 5,
      widgets: [],
      appearance: {
        theme: 'system',
        backgroundColor: '#f4f4f5',
        wallpaper: previousWallpaper,
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
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

  it('toggles edit mode using the E keyboard shortcut', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Включить режим редактирования',
        }),
      ).toBeEnabled(),
    );

    expect(
      screen.queryByRole('button', { name: 'Добавить виджет' }),
    ).not.toBeInTheDocument();

    await user.keyboard('{e}');

    expect(
      screen.getByRole('button', { name: 'Добавить виджет' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{e}');

    expect(
      screen.queryByRole('button', { name: 'Добавить виджет' }),
    ).not.toBeInTheDocument();
  });

  it('opens shortcuts help dialog via button and keyboard shortcut', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Включить режим редактирования',
        }),
      ).toBeEnabled(),
    );

    const helpButton = screen.getByRole('button', { name: 'Горячие клавиши' });
    expect(helpButton).toBeInTheDocument();

    await user.click(helpButton);
    const helpDialog = screen.getByRole('dialog', { name: 'Горячие клавиши' });
    expect(helpDialog).toHaveAttribute('open');

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(helpDialog).not.toHaveAttribute('open');
    });

    await user.keyboard('?');
    expect(helpDialog).toHaveAttribute('open');
  });

  it('opens add widget, appearance, and backup dialogs via A, P, and B in edit mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Включить режим редактирования',
        }),
      ).toBeEnabled(),
    );

    // Enable edit mode
    await user.keyboard('{e}');
    expect(
      screen.getByRole('button', { name: 'Добавить виджет' }),
    ).toBeInTheDocument();

    // 'a' opens add widget dialog
    await user.keyboard('{a}');
    const addDialog = screen.getByRole('dialog', { name: 'Добавить виджет' });
    expect(addDialog).toHaveAttribute('open');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(addDialog).not.toHaveAttribute('open');
    });

    // 'p' opens appearance dialog
    await user.keyboard('{p}');
    const appearanceDialog = screen.getByRole('dialog', { name: 'Оформление' });
    expect(appearanceDialog).toHaveAttribute('open');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(appearanceDialog).not.toHaveAttribute('open');
    });

    // 'b' opens backup dialog
    await user.keyboard('{b}');
    const backupDialog = screen.getByRole('dialog', {
      name: 'Импорт и экспорт',
    });
    expect(backupDialog).toHaveAttribute('open');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(backupDialog).not.toHaveAttribute('open');
    });
  });

  it('focuses search input on slash (/) shortcut', async () => {
    const user = userEvent.setup();
    await saveDashboardConfig({
      version: 5,
      widgets: [
        {
          id: 'search-widget',
          type: 'search',
          engine: 'google',
          layout: { x: 0, y: 0, w: 6, h: 1 },
        },
      ],
      appearance: {
        theme: 'system',
        backgroundColor: '#18181b',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled: true,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    });

    render(<App />);

    const searchInput = await screen.findByRole('searchbox');
    expect(searchInput).not.toHaveFocus();

    await user.keyboard('/');
    expect(searchInput).toHaveFocus();
    // Slash character shouldn't be typed into the search field
    expect(searchInput).toHaveValue('');
  });
});
