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

import { WidgetHost } from '../../components/dashboard/WidgetHost';
import { App } from '../../entrypoints/newtab/App';
import { DASHBOARD_STORAGE_KEY } from '../../storage/dashboard-storage';
import type { DashboardConfig, WidgetConfig } from '../../storage/schema';

type User = ReturnType<typeof userEvent.setup>;

async function enableEditMode(user: User) {
  await user.click(
    screen.getByRole('button', { name: 'Включить режим редактирования' }),
  );

  const addWidgetButton = screen.getByRole('button', {
    name: 'Добавить виджет',
  });
  await waitFor(() => expect(addWidgetButton).toBeEnabled());
}

async function addMarkdownWidget(user: User) {
  await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
  await user.click(screen.getByRole('button', { name: 'Markdown' }));
}

async function addSearchWidget(user: User) {
  await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
  await user.click(screen.getByRole('button', { name: 'Поиск' }));
}

async function addPomodoroWidget(user: User) {
  await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
  await user.click(screen.getByRole('button', { name: 'Помодоро' }));
}

async function addImageWidget(user: User) {
  await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
  await user.click(screen.getByRole('button', { name: 'Изображение' }));
}

async function addClockWidget(user: User) {
  await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
  await user.click(screen.getByRole('button', { name: 'Часы' }));
}

async function addWeatherWidget(user: User) {
  await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
  await user.click(screen.getByRole('button', { name: 'Погода' }));
}

async function getStoredConfig(): Promise<DashboardConfig | null> {
  return storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);
}

describe('widget lifecycle', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('creates and immediately persists a MarkdownWidget', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await addMarkdownWidget(user);

    const markdownArticle = await screen.findByRole('article', {
      name: 'Markdown',
    });
    expect(markdownArticle).toBeVisible();
    expect(markdownArticle).toHaveClass('new-widget');
    expect(markdownArticle).toHaveAttribute('data-new-widget', 'true');
    fireEvent(
      markdownArticle,
      new Event('webkitAnimationEnd', { bubbles: true }),
    );
    await waitFor(() =>
      expect(screen.getByRole('article', { name: 'Markdown' })).not.toHaveClass(
        'new-widget',
      ),
    );
    expect(markdownArticle).toHaveClass(
      'widget-card-surface',
      'liquid-glass-surface',
    );
    expect(
      screen
        .getByRole('button', {
          name: 'Редактировать виджет «Markdown»',
        })
        .querySelector('svg'),
    ).not.toBeNull();
    expect(
      screen
        .getByRole('button', {
          name: 'Удалить виджет «Markdown»',
        })
        .querySelector('svg'),
    ).not.toBeNull();
    await waitFor(async () => {
      const config = await getStoredConfig();
      expect(config?.widgets).toHaveLength(1);
      expect(config?.widgets[0]).toMatchObject({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        type: 'markdown',
        title: '',
        content: '',
        layout: { x: 0, y: 0, w: 4, h: 3 },
      });
    });

    await user.click(
      screen.getByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    );
    expect(
      screen.queryByRole('button', {
        name: 'Удалить виджет «Markdown»',
      }),
    ).not.toBeInTheDocument();
  });

  it('creates multiple widgets with independent IDs and layouts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await addMarkdownWidget(user);
    await addMarkdownWidget(user);

    expect(screen.getAllByRole('article', { name: 'Markdown' })).toHaveLength(
      2,
    );
    await waitFor(async () => {
      const widgets = (await getStoredConfig())?.widgets ?? [];
      expect(widgets).toHaveLength(2);
      expect(widgets[0]?.id).not.toBe(widgets[1]?.id);
      expect(widgets.map((widget) => widget.layout.y)).toEqual([0, 3]);
    });
  });

  it('places sequentially added widgets of different types directly below each other', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await addPomodoroWidget(user);
    await addMarkdownWidget(user);
    await addPomodoroWidget(user);

    await waitFor(async () => {
      const widgets = (await getStoredConfig())?.widgets ?? [];
      expect(widgets).toHaveLength(3);
      expect(widgets.map((widget) => widget.layout.y)).toEqual([0, 5, 8]);
    });
  });

  it('creates and immediately persists a SearchWidget', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
    expect(screen.getByRole('button', { name: 'Поиск' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    await addSearchWidget(user);

    expect(await screen.findByRole('article', { name: 'Поиск' })).toBeVisible();
    const searchForm = await screen.findByRole('search', {
      name: 'Поиск в Google',
    });
    expect(searchForm).toBeVisible();
    expect(searchForm).toHaveClass(
      'widget-search-surface',
      'liquid-glass-surface',
    );
    expect(
      screen.getByRole('searchbox', { name: 'Поиск в Google' }),
    ).toHaveClass('widget-search-field');
    await waitFor(async () => {
      const config = await getStoredConfig();
      expect(config?.widgets).toHaveLength(1);
      expect(config?.widgets[0]).toMatchObject({
        type: 'search',
        title: '',
        engine: 'google',
        layout: { x: 0, y: 0, w: 6, h: 1 },
      });
    });
  });

  it('edits and persists SearchWidget settings independently from the query', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);
    await addSearchWidget(user);

    await user.click(
      screen.getByRole('button', {
        name: 'Редактировать виджет «Поиск»',
      }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Настройки поиска' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('Заголовок')).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole('combobox', { name: 'Поисковик' }),
    );
    await user.click(screen.getByRole('option', { name: 'Яндекс' }));
    await user.click(screen.getByRole('button', { name: 'Готово' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Поиск' })).toBeVisible();
    expect(
      screen.getByRole('search', { name: 'Поиск в Яндекс' }),
    ).toBeVisible();
    await waitFor(async () => {
      const widget = (await getStoredConfig())?.widgets[0];
      expect(widget).toMatchObject({
        type: 'search',
        title: '',
        engine: 'yandex',
      });
      expect(widget).not.toHaveProperty('query');
    });
  });

  it('renders SearchWidget without card chrome and closes its settings on Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);
    await addSearchWidget(user);

    const article = await screen.findByRole('article', { name: 'Поиск' });
    expect(article.querySelector('h2')).toBeNull();
    expect(article).not.toHaveClass('rounded-xl', 'border', 'bg-white', 'p-4');

    const editButton = screen.getByRole('button', {
      name: 'Редактировать виджет «Поиск»',
    });
    const toolbar = editButton.closest<HTMLElement>('[role="toolbar"]');
    expect(toolbar).not.toBeNull();
    expect(toolbar).not.toHaveClass('bottom-full');
    expect(toolbar).not.toHaveClass('liquid-glass-surface');
    expect(editButton).toHaveClass('size-8');
    expect(article).toContainElement(toolbar);
    await user.click(editButton);
    await user.click(
      await screen.findByRole('combobox', { name: 'Поисковик' }),
    );
    await user.click(screen.getByRole('option', { name: 'Bing' }));
    const dialog = screen.getByRole('dialog', { name: 'Настройки поиска' });
    let finishExit = () => {};
    const finished = new Promise<void>((resolve) => {
      finishExit = resolve;
    });
    const getAnimations = vi.fn(() => [{ finished }] as unknown as Animation[]);
    Object.defineProperty(dialog, 'getAnimations', {
      configurable: true,
      value: getAnimations,
    });
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(getAnimations).toHaveBeenCalledOnce());
    expect(dialog).toBeInTheDocument();
    await act(async () => finishExit());
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'Редактировать виджет «Поиск»',
        }),
      ).toHaveFocus(),
    );
    await waitFor(async () => {
      expect((await getStoredConfig())?.widgets[0]).toMatchObject({
        type: 'search',
        engine: 'bing',
      });
    });

    const searchForm = await screen.findByRole('search', {
      name: 'Поиск в Bing',
    });
    const searchContainer = searchForm.closest('.min-w-0');
    expect(searchContainer).toHaveClass('pointer-events-none');
    expect(searchContainer).toHaveAttribute('inert');

    await user.click(
      screen.getByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    );
    expect(searchContainer).not.toHaveClass('pointer-events-none');
    expect(searchContainer).not.toHaveAttribute('inert');
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('deletes a widget only after confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);
    await addMarkdownWidget(user);

    await user.click(
      screen.getByRole('button', {
        name: 'Удалить виджет «Markdown»',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Удалить виджет?' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('article', { name: 'Markdown' }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(async () =>
      expect((await getStoredConfig())?.widgets).toEqual([]),
    );
  });

  it('keeps a widget when deletion is cancelled', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);
    await addMarkdownWidget(user);

    await user.click(
      screen.getByRole('button', {
        name: 'Удалить виджет «Markdown»',
      }),
    );
    const cancelButton = screen.getByRole('button', { name: 'Отмена' });
    expect(cancelButton).toHaveFocus();
    await user.click(cancelButton);

    expect(screen.getByRole('article', { name: 'Markdown' })).toBeVisible();
    await waitFor(async () =>
      expect((await getStoredConfig())?.widgets).toHaveLength(1),
    );
  });

  it('selects a group, confirms one deletion, and restores it with Undo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);
    await addMarkdownWidget(user);
    await addMarkdownWidget(user);

    const widgets = screen.getAllByRole('article', { name: 'Markdown' });
    await user.click(widgets[0]!);
    await user.keyboard('{Control>}a{/Control}');
    expect(screen.getByText('Выбрано: 2')).toBeVisible();

    await user.keyboard('{Delete}');
    expect(
      screen.getByRole('dialog', { name: 'Удалить выбранные виджеты?' }),
    ).toHaveTextContent('2 виджета');
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    await waitFor(() =>
      expect(
        screen.queryAllByRole('article', { name: 'Markdown' }),
      ).toHaveLength(0),
    );

    await user.keyboard('{Control>}z{/Control}');
    await waitFor(() =>
      expect(screen.getAllByRole('article', { name: 'Markdown' })).toHaveLength(
        2,
      ),
    );
  });

  it('supports additive selection, Space, and two consecutive Escapes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);
    await addMarkdownWidget(user);
    await addMarkdownWidget(user);

    const widgets = screen.getAllByRole('article', { name: 'Markdown' });
    await user.click(widgets[0]!);
    await user.keyboard('{Control>}');
    await user.click(widgets[1]!);
    await user.keyboard('{/Control}');
    expect(screen.getByText('Выбрано: 2')).toBeVisible();

    widgets[0]!.focus();
    await user.keyboard(' ');
    expect(screen.getByText('Выбрано: 1')).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('Выбрано: 1')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Выключить режим редактирования' }),
    ).toBeVisible();
    await user.keyboard('{Escape}');
    expect(
      screen.getByRole('button', { name: 'Включить режим редактирования' }),
    ).toBeVisible();
  });

  it('creates an ImageWidget, uses edit button in edit mode, and opens editor by clicking empty placeholder in view mode', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await addImageWidget(user);

    const imageArticle = await screen.findByRole('article', {
      name: 'Изображение',
    });
    expect(imageArticle).toBeVisible();

    const placeholder = await screen.findByText('Выберите изображение');
    expect(placeholder).toBeInTheDocument();

    const placeholderContainer = placeholder.closest('.min-w-0');
    expect(placeholderContainer).toHaveClass('pointer-events-none');
    expect(placeholderContainer).toHaveAttribute('inert');

    // In edit mode, editing is accessed via the toolbar button
    await user.click(
      screen.getByRole('button', {
        name: 'Редактировать виджет «Изображение»',
      }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Настройки изображения' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Готово' }));

    // In view mode, clicking the empty placeholder directly opens the editor
    await user.click(
      screen.getByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    );
    expect(placeholderContainer).not.toHaveClass('pointer-events-none');
    expect(placeholderContainer).not.toHaveAttribute('inert');

    await user.click(placeholder);
    expect(
      await screen.findByRole('dialog', { name: 'Настройки изображения' }),
    ).toBeVisible();
  });

  it('renders a safe fallback for an unsupported widget type', () => {
    render(
      <WidgetHost
        isEditing={false}
        widget={{
          id: 'unsupported-widget',
          type: 'unknown',
          layout: { x: 0, y: 0, w: 1, h: 1 },
        }}
        onRequestDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Неподдерживаемый тип виджета: unknown'),
    ).toBeVisible();
  });

  it('reports completion of a new widget entrance', () => {
    const onWidgetEnterEnd = vi.fn();
    const widget: WidgetConfig = {
      id: 'new-widget',
      type: 'search',
      title: '',
      engine: 'google',
      layout: { x: 0, y: 0, w: 6, h: 1 },
    };
    render(
      <WidgetHost
        isEditing={false}
        isNew
        widget={widget}
        onRequestDelete={vi.fn()}
        onWidgetEnterEnd={onWidgetEnterEnd}
      />,
    );
    fireEvent(
      screen.getByRole('article', { name: 'Поиск' }),
      new Event('webkitAnimationEnd', { bubbles: true }),
    );
    expect(onWidgetEnterEnd).toHaveBeenCalledOnce();
  });

  it('creates, edits and immediately persists a ClockWidget', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await addClockWidget(user);

    const clockArticle = await screen.findByRole('article', {
      name: 'Часы',
    });
    expect(clockArticle).toBeInTheDocument();
    expect(clockArticle).toHaveClass(
      'widget-card-surface',
      'liquid-glass-surface',
    );

    const storedConfig = await getStoredConfig();
    expect(storedConfig?.widgets).toHaveLength(1);
    expect(storedConfig?.widgets[0]).toMatchObject({
      type: 'clock',
      timeFormat: '24h',
      showTime: true,
      showSeconds: false,
      timezone: 'local',
      layout: { w: 4, h: 2 },
    });

    await user.click(
      screen.getByRole('button', {
        name: 'Редактировать виджет «Часы»',
      }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Настройки часов' }),
    ).toBeVisible();

    const timeFormatSelect = await screen.findByRole('combobox', {
      name: 'Формат времени',
    });
    await user.click(timeFormatSelect);
    await user.click(screen.getByRole('option', { name: /12-часовой/ }));

    expect(screen.queryByLabelText(/Название виджета/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Готово' }));

    await waitFor(async () => {
      const updatedConfig = await getStoredConfig();
      expect(updatedConfig?.widgets[0]).toMatchObject({
        type: 'clock',
        timeFormat: '12h',
      });
    });
  });

  it('creates a WeatherWidget, opens editor immediately, and persists config', async () => {
    const user = userEvent.setup();
    render(<App />);

    await enableEditMode(user);
    await addWeatherWidget(user);

    const weatherArticle = await screen.findByRole('article', {
      name: 'Погода',
    });
    expect(weatherArticle).toHaveClass('widget-card-surface--full-bleed');
    expect(weatherArticle).not.toHaveClass('p-4');
    expect(
      screen.getByRole('button', { name: 'Удалить виджет «Погода»' })
        .parentElement?.parentElement,
    ).toHaveClass('bg-theme-surface-elevated');

    expect(
      await screen.findByRole('dialog', { name: 'Настройки погоды' }),
    ).toBeVisible();

    const storedConfig = await getStoredConfig();
    expect(storedConfig?.widgets).toHaveLength(1);
    expect(storedConfig?.widgets[0]).toMatchObject({
      type: 'weather',
      mode: 'visual',
      location: { type: 'unset' },
      layout: { w: 5, h: 5 },
    });

    await user.click(screen.getByRole('button', { name: 'Готово' }));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Настройки погоды' }),
      ).not.toBeInTheDocument();
    });
  });
});
