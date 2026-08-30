import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
import type { MarkdownWidgetConfig } from '../../widgets/markdown/types';

function createMarkdownWidget(
  id: string,
  title: string,
  content: string,
  y = 0,
): MarkdownWidgetConfig {
  return {
    id,
    type: 'markdown',
    title,
    content,
    layout: { x: 0, y, w: 4, h: 3 },
  };
}

async function seedWidgets(widgets: MarkdownWidgetConfig[]) {
  await saveDashboardConfig({
    version: 3,
    widgets,
    appearance: {
      theme: 'system',
      backgroundColor: '#18181b',
      wallpaper: { type: 'none' },
    },
  });
}

async function getStoredMarkdownWidget(
  index = 0,
): Promise<MarkdownWidgetConfig | undefined> {
  const config = await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);
  const widget = config?.widgets[index];
  return widget?.type === 'markdown' ? widget : undefined;
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

describe('MarkdownWidget editing', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('opens a fullscreen split editor with live preview and autosave', async () => {
    const initialContent = '# Старый заголовок';
    await seedWidgets([
      createMarkdownWidget('work-markdown', 'Работа', initialContent),
    ]);
    const user = userEvent.setup();
    render(<App />);

    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Работа');

    const dialog = screen.getByRole('dialog', { name: 'Редактор Markdown' });
    expect(dialog).toHaveClass('h-dvh', 'w-screen');
    expect(screen.getByRole('textbox', { name: 'Заголовок' })).toHaveFocus();
    expect(
      dialog.querySelector('section[aria-label="Редактор Markdown"]'),
    ).toBeVisible();
    expect(
      dialog.querySelector('section[aria-label="Предпросмотр Markdown"]'),
    ).toBeVisible();

    const textarea = screen.getByRole('textbox', {
      name: 'Markdown-содержимое',
    });
    fireEvent.change(textarea, {
      target: { value: '# Новый заголовок\n\n**Живой preview**' },
    });

    expect(
      screen.getByLabelText('Предпросмотр Markdown').querySelector('strong'),
    ).toHaveTextContent('Живой preview');
    expect((await getStoredMarkdownWidget())?.content).toBe(initialContent);
    await waitFor(async () =>
      expect((await getStoredMarkdownWidget())?.content).toContain(
        'Живой preview',
      ),
    );
  });

  it('flushes title and content on Escape, closes, and restores focus', async () => {
    await seedWidgets([
      createMarkdownWidget('work-markdown', 'Работа', 'Старый текст'),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Работа');

    await user.clear(screen.getByRole('textbox', { name: 'Заголовок' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Заголовок' }),
      'Заметки',
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Markdown-содержимое' }),
      { target: { value: 'Новый **текст**' } },
    );
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const editButton = screen.getByRole('button', {
      name: 'Редактировать виджет «Заметки»',
    });
    await waitFor(() => expect(editButton).toHaveFocus());
    expect(screen.getByRole('article', { name: 'Заметки' })).toBeVisible();
    expect(screen.getByText('текст').tagName).toBe('STRONG');
    await waitFor(async () =>
      expect(await getStoredMarkdownWidget()).toMatchObject({
        title: 'Заметки',
        content: 'Новый **текст**',
      }),
    );
  });

  it('supports a keyboard-resizable 30–70 split and resets it on reopen', async () => {
    await seedWidgets([createMarkdownWidget('notes', 'Заметки', '')]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Заметки');

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-valuenow', '50');
    vi.spyOn(
      separator.parentElement as HTMLElement,
      'getBoundingClientRect',
    ).mockReturnValue({ left: 0, width: 1000 } as DOMRect);
    fireEvent.pointerDown(separator, { clientX: 500 });
    fireEvent.pointerMove(window, { clientX: 650 });
    fireEvent.pointerUp(window);
    expect(separator).toHaveAttribute('aria-valuenow', '65');

    separator.focus();
    await user.keyboard('{End}{ArrowRight}');
    expect(separator).toHaveAttribute('aria-valuenow', '70');
    await user.click(screen.getByRole('button', { name: 'Готово' }));

    await openWidgetEditor(user, 'Заметки');
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });

  it('keeps preview task checkboxes interactive', async () => {
    await seedWidgets([
      createMarkdownWidget('tasks', 'Задачи', '- [ ] Проверить Markdown'),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Задачи');

    const preview = screen.getByLabelText('Предпросмотр Markdown');
    await user.click(
      preview.querySelector('input[type="checkbox"]') as HTMLInputElement,
    );

    expect(
      screen.getByRole('textbox', { name: 'Markdown-содержимое' }),
    ).toHaveValue('- [x] Проверить Markdown');
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    await waitFor(async () =>
      expect((await getStoredMarkdownWidget())?.content).toBe(
        '- [x] Проверить Markdown',
      ),
    );
  });
});
