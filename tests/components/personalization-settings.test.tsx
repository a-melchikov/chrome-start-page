import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';
import { App } from '../../entrypoints/newtab/App';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  DASHBOARD_STORAGE_KEY,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';
import { createDefaultMarkdownWidget } from '../../widgets/markdown/defaults';

const stored = () => storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);

describe('Personalization settings', () => {
  beforeEach(() => fakeBrowser.reset());

  it('saves the interface text scale globally, restores it on reload and resets to 100%', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('tab', { name: 'Интерфейс' }));
    fireEvent.change(
      screen.getByRole('slider', { name: 'Размер текста интерфейса' }),
      { target: { value: '150' } },
    );
    await user.keyboard('{Escape}');
    await waitFor(async () =>
      expect((await stored())?.interfaceTextScale).toBe(150),
    );
    expect(
      document
        .querySelector('main')
        ?.style.getPropertyValue('--interface-text-scale'),
    ).toBe('1.5');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Настройки' })).toHaveFocus(),
    );
    first.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('tab', { name: 'Интерфейс' }));
    expect(
      screen.getByRole('slider', { name: 'Размер текста интерфейса' }),
    ).toHaveValue('150');
    await user.click(
      screen.getByRole('button', { name: 'Вернуть размер 100%' }),
    );
    await waitFor(async () =>
      expect((await stored())?.interfaceTextScale).toBe(100),
    );
  });

  it('persists individual card settings on Escape, preserves inheritance and resets all overrides', async () => {
    const config = createDefaultDashboardConfig();
    const workspace = config.workspaces[0]!;
    workspace.appearance.liquidGlass.enabled = false;
    workspace.appearance.liquidGlass.blur = 9;
    workspace.widgets = [
      {
        ...createDefaultMarkdownWidget('card', 0),
        title: 'Карточка',
        content: 'Текст',
      },
    ];
    await saveDashboardConfig(config);
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Редактировать виджет «Карточка»' }),
    );
    await user.click(await screen.findByText('Оформление карточки'));
    expect(
      screen.getByRole('slider', { name: 'Размытие карточки' }),
    ).toHaveValue('9');
    fireEvent.change(
      screen.getByRole('slider', { name: 'Скругление карточки' }),
      { target: { value: '30' } },
    );
    await user.click(screen.getByRole('combobox', { name: 'Стекло карточки' }));
    await user.click(screen.getByRole('option', { name: 'Включён' }));
    fireEvent.change(
      screen.getByRole('slider', { name: 'Прозрачность карточки' }),
      { target: { value: '80' } },
    );
    await user.keyboard('{Escape}');
    await waitFor(async () =>
      expect((await stored())?.workspaces[0]?.widgets[0]?.appearance).toEqual({
        borderRadius: 30,
        liquidGlass: { enabled: true, transparency: 80 },
      }),
    );
    expect((await stored())?.workspaces[0]?.appearance).toEqual(
      workspace.appearance,
    );
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('data-widget-glass', 'true');
    expect(article.style.getPropertyValue('--widget-border-radius')).toBe(
      '30px',
    );
    expect(article.style.getPropertyValue('--liquid-glass-blur')).toBe('9px');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Редактировать виджет «Карточка»' }),
      ).toHaveFocus(),
    );
    first.unmount();
    render(<App />);
    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Редактировать виджет «Карточка»' }),
    );
    await user.click(await screen.findByText('Оформление карточки'));
    expect(
      screen.getByRole('slider', { name: 'Скругление карточки' }),
    ).toHaveValue('30');
    await user.click(
      screen.getByRole('button', { name: 'Скругление как у пространства' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Прозрачность карточки: как у пространства',
      }),
    );
    expect(
      screen.getByRole('slider', { name: 'Скругление карточки' }),
    ).toHaveValue('12');
    expect(
      screen.getByRole('slider', { name: 'Прозрачность карточки' }),
    ).toHaveValue('40');
    await waitFor(async () =>
      expect((await stored())?.workspaces[0]?.widgets[0]?.appearance).toEqual({
        liquidGlass: { enabled: true },
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Использовать оформление пространства',
      }),
    );
    await user.keyboard('{Escape}');
    await waitFor(async () =>
      expect(
        (await stored())?.workspaces[0]?.widgets[0]?.appearance,
      ).toBeUndefined(),
    );
    expect(screen.getByRole('article')).toHaveAttribute(
      'data-widget-glass',
      'false',
    );
    expect((await stored())?.workspaces[0]?.widgets[0]).toMatchObject({
      content: 'Текст',
      title: 'Карточка',
    });
  });

  it('saves workspace spacing on close and reloads the global animation preference', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    fireEvent.change(
      await screen.findByRole('slider', { name: 'Расстояние между виджетами' }),
      { target: { value: '32' } },
    );
    fireEvent.change(
      screen.getByRole('slider', { name: 'Отступ от краёв страницы' }),
      { target: { value: '40' } },
    );
    await user.click(screen.getByRole('tab', { name: 'Интерфейс' }));
    await user.click(screen.getByRole('combobox', { name: 'Режим анимации' }));
    await user.click(screen.getByRole('option', { name: 'Выключены' }));
    await waitFor(async () => {
      expect((await stored())?.animationMode).toBe('off');
      expect((await stored())?.workspaces[0]?.appearance).toMatchObject({
        gridGap: 32,
        gridPadding: 40,
      });
    });
    expect(document.documentElement).toHaveAttribute('data-motion', 'off');
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Настройки' })).toHaveFocus(),
    );
    first.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    expect(
      await screen.findByRole('slider', { name: 'Расстояние между виджетами' }),
    ).toHaveValue('32');
    expect(
      screen.getByRole('slider', { name: 'Отступ от краёв страницы' }),
    ).toHaveValue('40');
    await user.click(
      screen.getByRole('button', { name: 'Вернуть стандартные отступы' }),
    );
    await waitFor(async () =>
      expect((await stored())?.workspaces[0]?.appearance).toMatchObject({
        gridGap: 16,
        gridPadding: 24,
      }),
    );
  });

  it('records shortcuts, rejects conflicts and reserved keys, cancels with Escape and restores defaults', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Горячие клавиши' }),
    );
    const recordEdit = screen.getByRole('button', {
      name: 'Изменить сочетание: Режим редактирования',
    });
    await user.click(recordEdit);
    await user.keyboard('[KeyQ]');
    await waitFor(async () =>
      expect((await stored())?.shortcuts?.edit?.[0]?.code).toBe('KeyQ'),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Изменить сочетание: Резервные копии',
      }),
    );
    await user.keyboard('[KeyQ]');
    expect(screen.getByRole('alert')).toHaveTextContent('уже используется');
    await user.keyboard('{Control>}[KeyC]{/Control}');
    expect(screen.getByRole('alert')).toHaveTextContent('зарезервировано');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toBeVisible();
    await user.keyboard('{Escape}');
    await user.keyboard('[KeyE]');
    expect(
      screen.getByRole('button', { name: 'Включить режим редактирования' }),
    ).toBeVisible();
    await user.keyboard('[KeyQ]');
    expect(
      screen.getByRole('button', { name: 'Выключить режим редактирования' }),
    ).toBeVisible();
    first.unmount();
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Горячие клавиши' }),
    );
    expect(
      screen.getByRole('button', {
        name: 'Изменить сочетание: Режим редактирования',
      }),
    ).toHaveTextContent('Q');
    await user.click(
      screen.getByRole('button', {
        name: 'Отключить сочетание: Режим редактирования',
      }),
    );
    await waitFor(async () =>
      expect((await stored())?.shortcuts?.edit).toEqual([]),
    );
    await user.click(
      screen.getByRole('button', { name: 'Вернуть стандартные сочетания' }),
    );
    await waitFor(async () => expect((await stored())?.shortcuts).toEqual({}));
  });

  it('persists note typography, applies the title and keeps the source unchanged', async () => {
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.widgets = [
      {
        ...createDefaultMarkdownWidget('note', 0),
        title: 'Моя заметка',
        content: 'Текст заметки',
      },
    ];
    await saveDashboardConfig(config);
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(
      await screen.findByRole('button', {
        name: 'Включить режим редактирования',
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Редактировать виджет «Моя заметка»',
      }),
    );
    const editor = await screen.findByRole('dialog', {
      name: 'Редактор Markdown',
    });
    await user.click(within(editor).getByRole('button', { name: 'Настройки' }));
    fireEvent.change(
      screen.getByRole('slider', { name: 'Размер основного текста' }),
      { target: { value: '20' } },
    );
    fireEvent.change(
      screen.getByRole('slider', { name: 'Размер заголовка карточки' }),
      { target: { value: '28' } },
    );
    fireEvent.change(
      screen.getByRole('slider', { name: 'Ширина текста при чтении' }),
      { target: { value: '90' } },
    );
    await user.click(
      screen.getByRole('combobox', { name: 'Межстрочный интервал' }),
    );
    await user.click(screen.getByRole('option', { name: 'Свободный' }));
    await user.click(
      screen.getByRole('combobox', { name: 'Выравнивание заголовка' }),
    );
    await user.click(screen.getByRole('option', { name: 'По центру' }));
    await user.keyboard('{Escape}');
    await user.click(within(editor).getByRole('button', { name: 'Готово' }));
    await waitFor(async () =>
      expect((await stored())?.workspaces[0]?.widgets[0]).toMatchObject({
        content: 'Текст заметки',
        typography: {
          fontSize: 20,
          titleSize: 28,
          readerWidth: 90,
          lineSpacing: 'relaxed',
          titleAlign: 'center',
        },
      }),
    );
    first.unmount();
    render(<App />);
    const title = await screen.findByRole('heading', {
      name: 'Моя заметка',
    });
    expect(title).toHaveStyle({ fontSize: '28px', textAlign: 'center' });
    await user.click(
      screen.getByRole('button', { name: 'Развернуть виджет «Моя заметка»' }),
    );
    const reader = await screen.findByRole('region', {
      name: 'Содержимое заметки',
    });
    expect(reader.firstElementChild?.getAttribute('style')).toContain(
      'max-width: 90ch',
    );
    expect(within(reader).getByText('Текст заметки').parentElement).toHaveStyle(
      { fontSize: '20px', lineHeight: '2' },
    );
  });
});
