import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import { WidgetHost } from '../../components/dashboard/WidgetHost';
import { App } from '../../entrypoints/newtab/App';
import { DASHBOARD_STORAGE_KEY } from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';

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

    expect(
      await screen.findByRole('article', { name: 'Markdown' }),
    ).toBeVisible();
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

  it('creates and immediately persists a SearchWidget', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
    expect(screen.getByRole('button', { name: 'Поиск' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    await addSearchWidget(user);

    expect(await screen.findByRole('article', { name: 'Поиск' })).toBeVisible();
    expect(
      screen.getByRole('search', { name: 'Поиск в Google' }),
    ).toBeVisible();
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
      screen.getByRole('dialog', { name: 'Настройки поиска' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('Заголовок')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Поисковик'), 'yandex');
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
    expect(editButton.closest('[role="toolbar"]')).toHaveClass('bottom-full');
    await user.click(editButton);
    await user.selectOptions(screen.getByLabelText('Поисковик'), 'bing');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
});
