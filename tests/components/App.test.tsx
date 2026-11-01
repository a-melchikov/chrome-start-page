import { DASHBOARD_CONFIG_VERSION } from '../../storage/schema';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { createDefaultDashboardConfig } from '../../storage/defaults';
import type { DashboardConfig } from '../../storage/schema';
import { saveBrowserCapture } from '../../storage/markdown-capture';
import { createMarkdownWidgetWithTemplate } from '../../widgets/markdown/templates';

function createBackupFile(config: DashboardConfig) {
  return new File(
    [
      JSON.stringify({
        format: DASHBOARD_BACKUP_FORMAT,
        formatVersion: DASHBOARD_BACKUP_FORMAT_VERSION,
        exportedAt: '2026-09-10T12:34:56.000Z',
        dashboard: config,
        localWallpapers: [],
      }),
    ],
    'dashboard-backup.json',
    { type: 'application/json' },
  );
}

describe('App', () => {
  it('finds newly captured text and focuses its note after switching workspaces', async () => {
    const user = userEvent.setup();
    const config = createDefaultDashboardConfig();
    config.workspaces[1]!.widgets = [
      {
        ...createMarkdownWidgetWithTemplate('remote-note', 0),
        title: 'Материалы',
        content: 'Предыдущая запись',
      },
    ];
    await saveDashboardConfig(config);
    render(<App />);
    await screen.findByRole('button', { name: 'Поиск команд' });
    await act(async () => {
      await saveBrowserCapture(
        { workspaceId: config.workspaces[1]!.id, widgetId: 'remote-note' },
        {
          selectionText: 'Уникальный сохранённый фрагмент',
          pageUrl: 'https://example.com/',
        },
      );
    });
    await user.click(screen.getByRole('button', { name: 'Поиск команд' }));
    await user.type(
      await screen.findByRole('combobox'),
      'уникальный сохранённый',
    );
    await user.click(
      await screen.findByRole('option', { name: /Заметка «Материалы»/ }),
    );
    expect(
      await screen.findByRole('button', { name: /Пространство: Работа/ }),
    ).toBeVisible();
    const card = document.querySelector('[data-widget-id="remote-note"]');
    await waitFor(() => expect(card).toHaveFocus());
    await waitFor(() =>
      expect(card).toHaveTextContent('Уникальный сохранённый фрагмент'),
    );
    expect(card).toHaveTextContent('Предыдущая запись');
  });

  beforeEach(() => {
    fakeBrowser.reset();
  });

  afterEach(() => vi.restoreAllMocks());

  it('adds Pomodoro from the palette and enters edit mode', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Поиск команд' }),
    );
    await user.type(
      await screen.findByRole('combobox', { name: 'Поиск команд' }),
      'Добавить Помодоро',
    );
    await user.click(screen.getByRole('option', { name: /Добавить Помодоро/ }));
    expect(
      await screen.findByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Помодоро' }),
    ).toBeInTheDocument();
  });

  it('opens theme settings and selects a theme from the palette', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Поиск команд' }),
    );
    await user.type(await screen.findByRole('combobox'), 'Переключить тему');
    await user.click(screen.getByRole('option', { name: /Переключить тему/ }));
    expect(screen.getAllByRole('option')).toHaveLength(14);
    await user.click(screen.getByRole('option', { name: /Nord/ }));
    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-theme', 'nord'),
    );
  });

  it('focuses an existing Markdown card from the palette', async () => {
    const user = userEvent.setup();
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.widgets = [
      {
        id: 'work',
        type: 'markdown',
        title: 'Работа',
        content: '[Почта](https://example.com)',
        layout: { x: 0, y: 0, w: 4, h: 3 },
        template: 'blank',
        quickAddEnabled: false,
        hideCompletedTasks: false,
      },
    ];
    await saveDashboardConfig(config);
    render(<App />);
    await screen.findByRole('heading', { name: 'Работа' });
    expect(document.querySelector('[data-widget-id="work"]')).not.toHaveClass(
      'new-widget',
    );
    await user.click(screen.getByRole('button', { name: 'Поиск команд' }));
    await user.type(await screen.findByRole('combobox'), 'Фокус на Markdown');
    await user.click(
      screen.getByRole('option', { name: /Фокус на Markdown «Работа»/ }),
    );
    await waitFor(() =>
      expect(document.querySelector('[data-widget-id="work"]')).toHaveFocus(),
    );
  });

  it('opens a requested appearance section from the palette', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Поиск команд' }),
    );
    await user.type(await screen.findByRole('combobox'), 'Настройки: Обои');
    await user.click(
      screen.getByRole('option', { name: /Открыть настройки: Обои/ }),
    );
    expect(
      await screen.findByRole('button', { name: 'Выбрать файл' }),
    ).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toHaveAttribute(
      'open',
    );
  });

  it('restores focus to the palette button after Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const button = await screen.findByRole('button', {
      name: 'Поиск команд',
    });
    await user.click(button);
    const input = await screen.findByRole('combobox', { name: 'Поиск команд' });
    expect(input).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(button).toHaveFocus());
  });

  it('closes top search on backdrop click and restores focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    const button = await screen.findByRole('button', { name: 'Поиск команд' });
    await user.click(button);
    const dialog = await screen.findByRole('dialog', { name: 'Поиск команд' });
    fireEvent.click(dialog);
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(button).toHaveFocus();
  });

  it('exports backup directly from the palette', async () => {
    const user = userEvent.setup();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:backup'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Поиск команд' }),
    );
    await user.type(
      await screen.findByRole('combobox'),
      'Экспортировать dashboard',
    );
    await user.click(
      screen.getByRole('option', { name: /Экспортировать dashboard/ }),
    );
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(
      screen.queryByRole('dialog', { name: 'Настройки' }),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Резервная копия скачана',
    );
    await waitFor(
      () =>
        expect(
          screen.queryByText('Резервная копия скачана'),
        ).not.toBeInTheDocument(),
      { timeout: 5000 },
    );
  });

  it('shows editor controls only while edit mode is enabled', async () => {
    const user = userEvent.setup();
    render(<App />);

    const editButton = screen.getByRole('button', {
      name: 'Включить режим редактирования',
    });
    const editControls = document.querySelector(
      '.dashboard-toolbar .edit-controls',
    );
    expect(editControls).toHaveAttribute('data-visible', 'false');
    expect(editControls).toHaveAttribute('inert');
    expect(
      screen.queryByRole('button', { name: 'Добавить виджет' }),
    ).not.toBeInTheDocument();

    await user.click(editButton);

    expect(editControls).toHaveAttribute('data-visible', 'true');
    expect(editControls).not.toHaveAttribute('inert');

    expect(
      screen.getByRole('button', { name: 'Добавить виджет' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Настройки' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Импорт и экспорт' }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    );

    expect(editControls).toHaveAttribute('data-visible', 'false');
    expect(editControls).toHaveAttribute('inert');

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
    const currentId = '11111111-1111-4111-8111-111111111111';
    const current: DashboardConfig = {
      version: DASHBOARD_CONFIG_VERSION,
      toolbar: { mode: 'top-right' },
      activeWorkspaceId: currentId,
      customThemes: [],
      workspaces: [
        {
          id: currentId,
          name: 'Основной',
          widgets: [
            {
              id: 'current-widget',
              type: 'markdown',
              title: 'Текущий виджет',
              content: 'До импорта',
              layout: { x: 0, y: 0, w: 4, h: 3 },
              template: 'blank',
              quickAddEnabled: false,
              hideCompletedTasks: false,
            },
          ],
          appearance: {
            theme: { type: 'builtin', id: 'light' },
            backgroundColor: { type: 'custom', color: '#f4f4f5' },
            wallpaper: { type: 'none' },
            liquidGlass: {
              enabled: true,
              transparency: 40,
              blur: 18,
              shadow: 50,
            },
          },
        },
      ],
    };
    const importedId = '22222222-2222-4222-8222-222222222222';
    const imported: DashboardConfig = {
      version: DASHBOARD_CONFIG_VERSION,
      toolbar: { mode: 'top-right' },
      activeWorkspaceId: importedId,
      customThemes: [],
      workspaces: [
        {
          id: importedId,
          name: 'Основной',
          widgets: [
            {
              id: 'imported-widget',
              type: 'markdown',
              title: 'Импортированный виджет',
              content: 'После импорта',
              layout: { x: 2, y: 1, w: 5, h: 4 },
              template: 'blank',
              quickAddEnabled: false,
              hideCompletedTasks: false,
            },
          ],
          appearance: {
            ...current.workspaces[0]!.appearance,
            theme: { type: 'builtin', id: 'dark' },
            backgroundColor: { type: 'custom', color: '#123456' },
          },
        },
      ],
    };
    await saveDashboardConfig(current);
    render(<App />);

    expect(await screen.findByText('Текущий виджет')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: 'Включить режим редактирования' }),
    );
    await user.click(screen.getByRole('button', { name: 'Импорт и экспорт' }));
    await user.upload(
      await screen.findByLabelText('Файл резервной копии'),
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
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    const themeSection = screen.getByText('Выбрать тему', {
      selector: 'button',
    });
    expect(screen.getByRole('tab', { name: 'Оформление' })).toHaveFocus();
    await user.click(themeSection);
    await user.click(screen.getByRole('button', { name: 'Тёмная' }));
    fireEvent.change(screen.getByLabelText('Цвет фона'), {
      target: { value: '#123456' },
    });

    expect(document.documentElement).toHaveClass('dark');
    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.workspaces[0]?.appearance).toEqual({
        theme: { type: 'builtin', id: 'dark' },
        backgroundColor: { type: 'custom', color: '#123456' },
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

  it('applies preset themes and sets default background color', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByText('Выбрать тему', { selector: 'button' }));
    await user.click(screen.getByRole('button', { name: 'Tokyo Night' }));

    expect(document.documentElement).toHaveAttribute(
      'data-theme',
      'tokyo-night',
    );
    expect(document.documentElement).toHaveClass('dark');

    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.workspaces[0]?.appearance.theme).toEqual({
        type: 'builtin',
        id: 'tokyo-night',
      });
      expect(storedConfig?.workspaces[0]?.appearance.backgroundColor).toEqual({
        type: 'theme',
      });
    });
  });

  it.each([
    ['Бумага и шалфей', 'paper-sage', '#f6f3eb', 'light'],
    ['Абрикосовый полдень', 'apricot-noon', '#fff3e8', 'light'],
    ['Графит и мята', 'graphite-mint', '#151d1f', 'dark'],
  ] as const)(
    'selects and restores %s',
    async (name, theme, background, mode) => {
      const user = userEvent.setup();
      const view = render(<App />);

      await user.click(
        await screen.findByRole('button', {
          name: 'Включить режим редактирования',
        }),
      );
      await user.click(screen.getByRole('button', { name: 'Настройки' }));
      await user.click(
        screen.getByText('Выбрать тему', { selector: 'button' }),
      );
      await user.click(screen.getByRole('button', { name }));

      expect(document.documentElement).toHaveAttribute('data-theme', theme);
      expect(document.documentElement.classList.contains('dark')).toBe(
        mode === 'dark',
      );
      expect(screen.getByRole('main')).toHaveStyle({
        backgroundColor: background,
      });
      await waitFor(async () => {
        const storedConfig = await storage.getItem<DashboardConfig>(
          DASHBOARD_STORAGE_KEY,
        );
        expect(storedConfig?.workspaces[0]?.appearance.theme).toEqual({
          type: 'builtin',
          id: theme,
        });
        expect(storedConfig?.workspaces[0]?.appearance.backgroundColor).toEqual(
          {
            type: 'theme',
          },
        );
      });

      view.unmount();
      render(<App />);
      await waitFor(() =>
        expect(document.documentElement).toHaveAttribute('data-theme', theme),
      );
      expect(screen.getByRole('main')).toHaveStyle({
        backgroundColor: background,
      });
    },
  );

  it('previews rounding, flushes on Escape, restores after remount, and resets only the active space', async () => {
    const user = userEvent.setup();
    const config = createDefaultDashboardConfig();
    config.workspaces[1]!.appearance.widgetBorderRadius = 30;
    await saveDashboardConfig(config);
    const view = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('button', { name: 'Настроить эффект' }));
    const radius = screen.getByRole('slider', { name: 'Скругление углов' });
    expect(
      screen.getByRole('main').style.getPropertyValue('--widget-border-radius'),
    ).toBe('12px');
    fireEvent.change(radius, { target: { value: '40' } });
    expect(
      screen.getByRole('main').style.getPropertyValue('--widget-border-radius'),
    ).toBe('40px');
    expect(
      (await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY))
        ?.workspaces[0]?.appearance.widgetBorderRadius,
    ).toBeUndefined();
    await user.keyboard('{Escape}');
    await waitFor(async () => {
      const saved = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(saved?.workspaces[0]?.appearance.widgetBorderRadius).toBe(40);
      expect(saved?.workspaces[1]?.appearance.widgetBorderRadius).toBe(30);
    });
    view.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('button', { name: 'Настроить эффект' }));
    expect(
      screen.getByRole('slider', { name: 'Скругление углов' }),
    ).toHaveValue('40');
    expect(
      screen.getByRole('main').style.getPropertyValue('--widget-border-radius'),
    ).toBe('40px');
    await user.click(
      screen.getByRole('button', { name: 'Сбросить скругление' }),
    );
    await waitFor(async () => {
      const saved = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(saved?.workspaces[0]?.appearance.widgetBorderRadius).toBe(12);
      expect(saved?.workspaces[1]?.appearance.widgetBorderRadius).toBe(30);
      expect(saved?.workspaces[0]?.appearance.liquidGlass).toEqual(
        config.workspaces[0]!.appearance.liquidGlass,
      );
    });
  });

  it('previews, persists, resets, and toggles Liquid Glass settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    const app = screen.getByRole('main');
    expect(app).toHaveClass('liquid-glass-enabled');
    expect(document.querySelector('.dashboard-toolbar')).toHaveClass(
      'liquid-glass-surface',
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('button', { name: 'Настроить эффект' }));

    const transparency = screen.getByRole('slider', {
      name: 'Прозрачность',
    });
    fireEvent.change(transparency, { target: { value: '70' } });
    await waitFor(() => expect(screen.getByText('70%')).toBeVisible());
    fireEvent.pointerUp(transparency);

    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(
        storedConfig?.workspaces[0]?.appearance.liquidGlass.transparency,
      ).toBe(70);
    });

    await user.click(screen.getByRole('switch', { name: 'Эффект стекла' }));

    expect(app).not.toHaveClass('liquid-glass-enabled');
    expect(
      screen.queryByRole('button', { name: 'Настроить эффект' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Эффект стекла' }));
    await user.click(screen.getByRole('button', { name: 'Настроить эффект' }));
    await user.click(
      screen.getByRole('button', { name: 'Вернуть стандартные параметры' }),
    );

    await waitFor(async () => {
      const storedConfig = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(storedConfig?.workspaces[0]?.appearance.liquidGlass).toEqual({
        enabled: true,
        transparency: 40,
        blur: 18,
        shadow: 50,
      });
    });
  });

  it('restores a saved appearance on load', async () => {
    const user = userEvent.setup();
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.appearance = {
      theme: { type: 'builtin', id: 'light' },
      backgroundColor: { type: 'custom', color: '#abcdef' },
      wallpaper: { type: 'none' },
      liquidGlass: {
        enabled: true,
        transparency: 40,
        blur: 18,
        shadow: 50,
      },
    };
    await saveDashboardConfig(config);

    render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByText('Выбрать тему', { selector: 'button' }));

    expect(screen.getByRole('button', { name: 'Светлая' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Цвет фона')).toHaveValue('#abcdef');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('maps saved Liquid Glass controls to CSS custom properties', async () => {
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.appearance = {
      theme: { type: 'builtin', id: 'dark' },
      backgroundColor: { type: 'custom', color: '#18181b' },
      wallpaper: { type: 'none' },
      liquidGlass: {
        enabled: true,
        transparency: 75,
        blur: 12,
        shadow: 80,
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
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.appearance = {
      theme: { type: 'builtin', id: 'light' },
      backgroundColor: { type: 'custom', color: '#f4f4f5' },
      wallpaper: { type: 'none' },
      liquidGlass: {
        enabled: false,
        transparency: 25,
        blur: 30,
        shadow: 10,
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
      enabled: true,
    };
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.appearance = {
      theme: { type: 'builtin', id: 'system' },
      backgroundColor: { type: 'custom', color: '#f4f4f5' },
      wallpaper: previousWallpaper,
      liquidGlass: {
        enabled: true,
        transparency: 40,
        blur: 18,
        shadow: 50,
      },
    };
    await saveDashboardConfig(config);
    render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(
      screen.getByText('Использовать ссылку', { selector: 'button' }),
    );
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
    expect(storedConfig?.workspaces[0]?.appearance.wallpaper).toEqual(
      previousWallpaper,
    );
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
    const helpDialog = screen.getByRole('dialog', { name: 'Настройки' });
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
    const appearanceDialog = screen.getByRole('dialog', { name: 'Настройки' });
    expect(appearanceDialog).toHaveAttribute('open');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(appearanceDialog).not.toHaveAttribute('open');
    });

    // 'b' opens backup dialog
    await user.keyboard('{b}');
    const backupDialog = screen.getByRole('dialog', {
      name: 'Настройки',
    });
    expect(backupDialog).toHaveAttribute('open');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(backupDialog).not.toHaveAttribute('open');
    });
  });

  it('opens command palette on slash (/) shortcut', async () => {
    const user = userEvent.setup();
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.widgets = [
      {
        id: 'search-widget',
        type: 'search',
        engine: 'google',
        layout: { x: 0, y: 0, w: 6, h: 1 },
      },
    ];
    config.workspaces[0]!.appearance = {
      theme: { type: 'builtin', id: 'system' },
      backgroundColor: { type: 'custom', color: '#18181b' },
      wallpaper: { type: 'none' },
      liquidGlass: {
        enabled: true,
        transparency: 40,
        blur: 18,
        shadow: 50,
      },
    };
    await saveDashboardConfig(config);

    render(<App />);

    const searchInput = await screen.findByRole('searchbox');
    expect(searchInput).not.toHaveFocus();

    await user.keyboard('/');
    expect(
      await screen.findByRole('combobox', { name: 'Поиск команд' }),
    ).toHaveFocus();
    expect(searchInput).not.toHaveFocus();
    expect(searchInput).toHaveValue('');
  });
  it('preserves the theme draft through full screen preview and returns focus to its appearance opener', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', {
      name: 'Включить режим редактирования',
    });
    await user.keyboard('e');
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(
      await screen.findByRole('button', { name: 'Выбрать тему' }),
    );
    const opener = screen.getByRole('button', { name: /Добавить собственную/ });
    await user.click(opener);
    const name = await screen.findByRole('textbox', {
      name: 'Название темы *',
    });
    expect(name).toHaveFocus();
    await user.clear(name);
    await user.type(name, 'Морской бриз');
    await user.click(
      screen.getByRole('button', { name: 'Показать всю страницу' }),
    );
    const returnButton = await screen.findByRole('button', {
      name: 'Вернуться к редактированию',
    });
    await waitFor(() => expect(returnButton).toHaveFocus());
    expect(
      screen.queryByRole('dialog', { name: 'Создание темы' }),
    ).not.toBeInTheDocument();
    await user.click(returnButton);
    const restoredName = screen.getByRole('textbox', {
      name: 'Название темы *',
    });
    expect(restoredName).toHaveValue('Морской бриз');
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    await user.click(screen.getByRole('button', { name: 'Не сохранять' }));
    await screen.findByRole('dialog', { name: 'Настройки' });
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Добавить собственную/ }),
      ).toHaveFocus(),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Создание темы' }),
    ).not.toBeInTheDocument();
  });
});
