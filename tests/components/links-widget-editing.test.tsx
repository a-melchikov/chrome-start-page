import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import { App } from '../../entrypoints/newtab/App';
import {
  DASHBOARD_STORAGE_KEY,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';
import type { LinksWidgetConfig } from '../../widgets/links/types';

function createLinksWidget(
  id: string,
  title: string,
  content: string,
  y = 0,
): LinksWidgetConfig {
  return {
    id,
    type: 'links',
    title,
    content,
    layout: { x: 0, y, w: 4, h: 3 },
  };
}

async function seedWidgets(widgets: LinksWidgetConfig[]) {
  await saveDashboardConfig({
    version: 1,
    widgets,
    appearance: { theme: 'system', backgroundColor: '#18181b' },
  });
}

async function getStoredConfig(): Promise<DashboardConfig | null> {
  return storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);
}

async function getStoredLinksWidget(
  index = 0,
): Promise<LinksWidgetConfig | undefined> {
  const widget = (await getStoredConfig())?.widgets[index];
  return widget?.type === 'links' ? widget : undefined;
}

async function enableDashboardEditing(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    await screen.findByRole('button', {
      name: 'Включить режим редактирования',
    }),
  );

  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Добавить виджет' }),
    ).toBeEnabled(),
  );
}

async function openWidgetEditor(
  user: ReturnType<typeof userEvent.setup>,
  widgetName: string,
) {
  await user.click(
    screen.getByRole('button', {
      name: `Редактировать виджет «${widgetName}»`,
    }),
  );
}

function changeMarkdown(textarea: HTMLElement, content: string) {
  fireEvent.change(textarea, { target: { value: content } });
}

describe('LinksWidget editing', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('shows initial raw Markdown and autosaves edited content after debounce', async () => {
    const initialContent = '[Mail](https://mail.example.com/)';
    await seedWidgets([
      createLinksWidget('work-links', 'Работа', initialContent),
    ]);
    const user = userEvent.setup();
    render(<App />);

    expect(
      await screen.findByRole('article', { name: 'Работа' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: 'Редактировать виджет «Работа»',
      }),
    ).not.toBeInTheDocument();

    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Работа');

    expect(screen.getByRole('textbox', { name: 'Заголовок' })).toHaveFocus();

    const textarea = screen.getByRole('textbox', {
      name: 'Markdown-содержимое',
    });
    expect(textarea).toHaveValue(initialContent);

    changeMarkdown(textarea, '[Docs](docs.example.com)');

    expect((await getStoredLinksWidget())?.content).toBe(initialContent);
    await waitFor(async () =>
      expect((await getStoredLinksWidget())?.content).toBe(
        '[Docs](docs.example.com)',
      ),
    );
  });

  it('returns to the renderer with updated content and flushes on finish', async () => {
    await seedWidgets([
      createLinksWidget('work-links', 'Работа', '[Mail](mail.example.com)'),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Работа');

    const textarea = screen.getByRole('textbox', {
      name: 'Markdown-содержимое',
    });
    changeMarkdown(textarea, 'Новая [ссылка](new.example.com)');
    await user.click(textarea);
    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('textbox', { name: 'Markdown-содержимое' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Редактировать виджет «Работа»',
      }),
    ).toHaveFocus();
    expect(screen.getByText('Новая')).toBeVisible();
    expect(screen.getByRole('link', { name: 'ссылка' })).toHaveAttribute(
      'href',
      'https://new.example.com/',
    );
    await waitFor(async () =>
      expect((await getStoredLinksWidget())?.content).toBe(
        'Новая [ссылка](new.example.com)',
      ),
    );
  });

  it('blocks finishing and shows an error for a recognized invalid link', async () => {
    await seedWidgets([
      createLinksWidget('work-links', 'Работа', '[Mail](mail.example.com)'),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Работа');

    const textarea = screen.getByRole('textbox', {
      name: 'Markdown-содержимое',
    });
    changeMarkdown(textarea, '[Ошибка](not a url)');
    await user.click(textarea);
    await user.keyboard('{Escape}');

    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/URL не должен содержать пробелы/)).toBeVisible();

    await user.click(
      screen.getByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    );
    expect(textarea).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Выключить режим редактирования',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('allows an empty title and unsupported Markdown', async () => {
    await seedWidgets([
      createLinksWidget('work-links', 'Работа', '[Mail](mail.example.com)'),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Работа');

    const titleInput = screen.getByRole('textbox', { name: 'Заголовок' });
    const textarea = screen.getByRole('textbox', {
      name: 'Markdown-содержимое',
    });
    await user.clear(titleInput);
    changeMarkdown(textarea, 'Обычный **Markdown**');
    await user.click(screen.getByRole('button', { name: 'Готово' }));

    expect(screen.getByText('Обычный **Markdown**')).toBeVisible();
    expect(
      screen.getByRole('article', { name: 'Список ссылок' }),
    ).toBeVisible();
    await waitFor(async () => {
      expect((await getStoredConfig())?.widgets[0]).toMatchObject({
        title: '',
        content: 'Обычный **Markdown**',
      });
    });
  });

  it('keeps multiple LinksWidget configurations independent', async () => {
    await seedWidgets([
      createLinksWidget('first-links', 'Первый', '[One](one.example.com)'),
      createLinksWidget('second-links', 'Второй', '[Two](two.example.com)', 3),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);

    await openWidgetEditor(user, 'Первый');
    let textarea = screen.getByRole('textbox', {
      name: 'Markdown-содержимое',
    });
    changeMarkdown(textarea, '[First updated](first.example.com)');
    await user.click(screen.getByRole('button', { name: 'Готово' }));

    await openWidgetEditor(user, 'Второй');
    textarea = screen.getByRole('textbox', { name: 'Markdown-содержимое' });
    changeMarkdown(textarea, '[Second updated](second.example.com)');
    await user.click(screen.getByRole('button', { name: 'Готово' }));

    await waitFor(async () => {
      const widgets = (await getStoredConfig())?.widgets.filter(
        (widget): widget is LinksWidgetConfig => widget.type === 'links',
      );
      expect(widgets?.map(({ id, content }) => ({ id, content }))).toEqual([
        {
          id: 'first-links',
          content: '[First updated](first.example.com)',
        },
        {
          id: 'second-links',
          content: '[Second updated](second.example.com)',
        },
      ]);
    });
  });

  it('flushes the latest pending change when the app unmounts', async () => {
    const initialContent = '[Mail](mail.example.com)';
    const updatedContent = '[Docs](docs.example.com)';
    await seedWidgets([
      createLinksWidget('work-links', 'Работа', initialContent),
    ]);
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Работа');

    changeMarkdown(
      screen.getByRole('textbox', { name: 'Markdown-содержимое' }),
      updatedContent,
    );
    expect((await getStoredLinksWidget())?.content).toBe(initialContent);

    unmount();

    await waitFor(async () =>
      expect((await getStoredLinksWidget())?.content).toBe(updatedContent),
    );
  });

  it('restores autosaved Markdown after the app is mounted again', async () => {
    await seedWidgets([
      createLinksWidget('work-links', 'Работа', '[Mail](mail.example.com)'),
    ]);
    const user = userEvent.setup();
    const firstRender = render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Работа');

    changeMarkdown(
      screen.getByRole('textbox', { name: 'Markdown-содержимое' }),
      'Документы: [Docs](docs.example.com)',
    );
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    await waitFor(async () =>
      expect((await getStoredLinksWidget())?.content).toBe(
        'Документы: [Docs](docs.example.com)',
      ),
    );

    firstRender.unmount();
    render(<App />);

    expect(await screen.findByText('Документы:')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      'https://docs.example.com/',
    );
  });
});
