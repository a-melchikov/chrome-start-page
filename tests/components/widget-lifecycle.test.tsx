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

async function addLinksWidget(user: User) {
  await user.click(screen.getByRole('button', { name: 'Добавить виджет' }));
  await user.click(screen.getByRole('button', { name: 'Список ссылок' }));
}

async function getStoredConfig(): Promise<DashboardConfig | null> {
  return storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);
}

describe('widget lifecycle', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('creates and immediately persists a LinksWidget', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await addLinksWidget(user);

    expect(
      await screen.findByRole('article', { name: 'Список ссылок' }),
    ).toBeVisible();
    await waitFor(async () => {
      const config = await getStoredConfig();
      expect(config?.widgets).toHaveLength(1);
      expect(config?.widgets[0]).toMatchObject({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        type: 'links',
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
        name: 'Удалить виджет «Список ссылок»',
      }),
    ).not.toBeInTheDocument();
  });

  it('creates multiple widgets with independent IDs and layouts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);

    await addLinksWidget(user);
    await addLinksWidget(user);

    expect(
      screen.getAllByRole('article', { name: 'Список ссылок' }),
    ).toHaveLength(2);
    await waitFor(async () => {
      const widgets = (await getStoredConfig())?.widgets ?? [];
      expect(widgets).toHaveLength(2);
      expect(widgets[0]?.id).not.toBe(widgets[1]?.id);
      expect(widgets.map((widget) => widget.layout.y)).toEqual([0, 3]);
    });
  });

  it('deletes a widget only after confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await enableEditMode(user);
    await addLinksWidget(user);

    await user.click(
      screen.getByRole('button', {
        name: 'Удалить виджет «Список ссылок»',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Удалить виджет?' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Удалить' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('article', { name: 'Список ссылок' }),
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
    await addLinksWidget(user);

    await user.click(
      screen.getByRole('button', {
        name: 'Удалить виджет «Список ссылок»',
      }),
    );
    const cancelButton = screen.getByRole('button', { name: 'Отмена' });
    expect(cancelButton).toHaveFocus();
    await user.click(cancelButton);

    expect(
      screen.getByRole('article', { name: 'Список ссылок' }),
    ).toBeVisible();
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
