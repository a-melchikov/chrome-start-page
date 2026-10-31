import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
import { createDefaultDashboardConfig } from '../../storage/defaults';
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
    template: 'blank',
    quickAddEnabled: false,
    hideCompletedTasks: false,
    layout: { x: 0, y, w: 4, h: 3 },
  };
}

async function seedWidgets(widgets: MarkdownWidgetConfig[]) {
  const config = createDefaultDashboardConfig();
  await saveDashboardConfig({
    ...config,
    workspaces: [
      {
        ...config.workspaces[0]!,
        widgets,
      },
      ...config.workspaces.slice(1),
    ],
  });
}

async function getStoredMarkdownWidget(
  index = 0,
): Promise<MarkdownWidgetConfig | undefined> {
  const config = await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);
  const activeWorkspace =
    config?.workspaces.find((w) => w.id === config.activeWorkspaceId) ??
    config?.workspaces[0];
  const widget = activeWorkspace?.widgets[index];
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

  it('opts into the website launch button per note and persists both choices', async () => {
    await seedWidgets([
      createMarkdownWidget('sites', 'Сайты', '[A](https://example.com)'),
    ]);
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await enableDashboardEditing(user);
    expect(
      screen.queryByRole('button', { name: /Начать работу/ }),
    ).not.toBeInTheDocument();
    await openWidgetEditor(user, 'Сайты');
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    const toggle = await screen.findByRole('switch', {
      name: 'Кнопка «Начать работу»',
    });
    expect(toggle).not.toBeChecked();
    await user.click(
      within(toggle).getByText('Открывать сайты заметки одной кнопкой'),
    );
    expect(toggle).toBeChecked();
    await user.keyboard('{Escape}');
    await user.keyboard('{Escape}');
    expect(
      await screen.findByRole('button', {
        name: 'Начать работу: открыть сайты (1)',
      }),
    ).toBeVisible();
    await waitFor(async () =>
      expect((await getStoredMarkdownWidget())?.showWebsiteSetButton).toBe(
        true,
      ),
    );
    unmount();

    render(<App />);
    expect(
      await screen.findByRole('button', {
        name: 'Начать работу: открыть сайты (1)',
      }),
    ).toBeVisible();
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Сайты');
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    const savedToggle = await screen.findByRole('switch', {
      name: 'Кнопка «Начать работу»',
    });
    expect(savedToggle).toBeChecked();
    await user.click(screen.getByText('Кнопка «Начать работу»'));
    expect(savedToggle).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    expect(
      screen.queryByRole('button', { name: /Начать работу/ }),
    ).not.toBeInTheDocument();
    await waitFor(async () =>
      expect((await getStoredMarkdownWidget())?.showWebsiteSetButton).toBe(
        false,
      ),
    );
  });

  it('opens settings on demand, closes them without leaving the editor, and persists choices', async () => {
    await seedWidgets([createMarkdownWidget('notes', 'Заметки', 'Текст')]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Заметки');

    const settingsButton = await screen.findByRole('button', {
      name: 'Настройки',
    });
    const editorPane = screen.getByRole('region', {
      name: 'Редактор Markdown',
    });
    expect(
      within(editorPane).getByRole('textbox', { name: 'Заголовок' }),
    ).toHaveValue('Заметки');
    expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('combobox', { name: 'Шаблон виджета' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Изменения сохраняются автоматически'),
    ).not.toBeInTheDocument();

    await user.click(settingsButton);
    const templatePicker = screen.getByRole('combobox', {
      name: 'Шаблон виджета',
    });
    await user.click(templatePicker);
    await user.keyboard('{Escape}');
    expect(templatePicker).toHaveAttribute('aria-expanded', 'false');
    expect(templatePicker).toHaveFocus();
    expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(templatePicker);
    await user.click(screen.getByRole('option', { name: 'Задачи' }));
    expect(templatePicker).toHaveTextContent('Задачи');
    expect(templatePicker).toHaveFocus();
    expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    // Temporary blur must not dismiss the menu before another control receives focus.
    fireEvent.blur(templatePicker, { relatedTarget: null });
    expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByText('Быстрое добавление'));
    expect(
      screen.getByRole('switch', { name: 'Быстрое добавление' }),
    ).toBeChecked();
    await user.keyboard(' ');
    expect(
      screen.getByRole('switch', { name: 'Быстрое добавление' }),
    ).not.toBeChecked();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('switch', { name: 'Быстрое добавление' }),
    ).toBeChecked();
    await user.click(screen.getByText('Скрывать выполненные задачи'));
    expect(
      screen.getByRole('switch', { name: 'Только незавершённые' }),
    ).toBeChecked();
    await user.keyboard('{Escape}');
    expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    expect(settingsButton).toHaveFocus();
    expect(
      screen.getByRole('dialog', { name: 'Редактор Markdown' }),
    ).toHaveAttribute('open');

    await user.click(settingsButton);
    expect(
      screen.getByRole('combobox', { name: 'Шаблон виджета' }),
    ).toHaveTextContent('Задачи');
    expect(
      screen.getByRole('switch', { name: 'Быстрое добавление' }),
    ).toBeChecked();
    await user.click(
      screen.getByRole('textbox', { name: 'Markdown-содержимое' }),
    );
    expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    await waitFor(async () =>
      expect(await getStoredMarkdownWidget()).toMatchObject({
        title: 'Заметки',
        content: 'Текст',
        template: 'tasks',
        quickAddEnabled: true,
        hideCompletedTasks: true,
      }),
    );
  });

  it('formats the source selection from the shared toolbar and closes its menu before the editor', async () => {
    await seedWidgets([
      createMarkdownWidget('notes', 'Заметки', 'Текст заметки'),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await enableDashboardEditing(user);
    await openWidgetEditor(user, 'Заметки');

    const sizeButton = await screen.findByRole('button', {
      name: 'Размер текста',
    });
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', {
      name: 'Markdown-содержимое',
    });
    expect(
      screen.queryByRole('heading', { name: 'Предпросмотр' }),
    ).not.toBeInTheDocument();
    await user.click(textarea);
    textarea.setSelectionRange(0, 5);
    await user.click(sizeButton);
    await user.keyboard('{Escape}');
    expect(sizeButton).toHaveAttribute('aria-expanded', 'false');
    expect(sizeButton).toHaveFocus();
    expect(
      screen.getByRole('dialog', { name: 'Редактор Markdown' }),
    ).toHaveAttribute('open');

    await user.click(sizeButton);
    await user.click(screen.getByRole('menuitem', { name: 'Крупный — 18 px' }));
    expect(textarea).toHaveValue(':large[Текст] заметки');
    await waitFor(() => expect(textarea).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Готово' }));
    await waitFor(async () =>
      expect(await getStoredMarkdownWidget()).toMatchObject({
        title: 'Заметки',
        content: ':large[Текст] заметки',
      }),
    );
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

    const dialog = await screen.findByRole(
      'dialog',
      { name: 'Редактор Markdown' },
      { timeout: 5000 },
    );
    expect(dialog).toHaveClass('h-dvh', 'w-screen');
    expect(
      await screen.findByRole('textbox', { name: 'Заголовок' }),
    ).toHaveFocus();
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
    const article = screen.getByRole('article', { name: 'Заметки' });
    expect(article).toBeVisible();
    expect(within(article).getByText('текст').tagName).toBe('STRONG');
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
