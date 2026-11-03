import { useState } from 'react';
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

import {
  SettingsPanel,
  type SettingsSection,
} from '../../components/dashboard/SettingsPanel';
import { App } from '../../entrypoints/newtab/App';
import { DASHBOARD_STORAGE_KEY } from '../../storage/dashboard-storage';
import type { DashboardConfig } from '../../storage/schema';
import type { SettingsBlockId } from '../../storage/settings-panel';

async function chooseSection(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole('tab', { name }));
}

describe('Shared settings panel', () => {
  beforeEach(() => fakeBrowser.reset());

  it('keeps one dialog across every section and restores the original opener', async () => {
    const user = userEvent.setup();
    render(<App />);
    const opener = await screen.findByRole('button', {
      name: 'Настройки',
    });
    await user.click(opener);
    const panel = await screen.findByRole('dialog', { name: 'Настройки' });
    expect(screen.getByRole('tab', { selected: true })).toHaveFocus();
    for (const name of [
      'Интерфейс',
      'Пространства',
      'Резервные копии',
      'Горячие клавиши',
      'Оформление',
    ]) {
      await chooseSection(user, name);
      expect(await screen.findByRole('tabpanel', { name })).toBeVisible();
      expect(screen.getByRole('dialog', { name: 'Настройки' })).toBe(panel);
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(within(panel).getAllByText(name)).toHaveLength(1);
      expect(screen.getByRole('tab', { selected: true })).toHaveFocus();
    }
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
    expect(panel).not.toHaveAttribute('open');
  });

  it.each([
    ['b', 'Резервные копии'],
    ['?', 'Горячие клавиши'],
    ['[F1]', 'Горячие клавиши'],
  ] as const)(
    'opens the requested section directly with %s',
    async (key, name) => {
      const user = userEvent.setup();
      render(<App />);
      await screen.findByRole('button', { name: 'Настройки' });
      await user.keyboard(key);
      expect(await screen.findByRole('tabpanel', { name })).toBeVisible();
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
        name,
      );
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    },
  );

  it('navigates visible tabs with the keyboard and skips unavailable sections', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    function Harness() {
      const [section, setSection] = useState<SettingsSection>('appearance');
      return (
        <SettingsPanel
          open
          section={section}
          onOpenChange={() => {}}
          disabledSections={['interface', 'backup']}
          onSectionChange={(next) => {
            onSectionChange(next);
            setSection(next);
          }}
        >
          Содержимое
        </SettingsPanel>
      );
    }
    render(<Harness />);
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Интерфейс' })).toBeDisabled();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Пространства' })).toHaveFocus();
    expect(
      screen.getByRole('tabpanel', { name: 'Пространства' }),
    ).toBeVisible();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Горячие клавиши' })).toHaveFocus();
    await user.keyboard('{Home}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Горячие клавиши' })).toHaveFocus();
    expect(onSectionChange).not.toHaveBeenCalledWith('interface');
    expect(onSectionChange).not.toHaveBeenCalledWith('backup');
  });

  it('persists a pending appearance preview when leaving its section', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    fireEvent.change(
      await screen.findByRole('slider', { name: 'Скругление углов' }),
      { target: { value: '27' } },
    );
    await chooseSection(user, 'Резервные копии');
    await waitFor(async () => {
      const saved = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(saved?.workspaces[0]?.appearance.widgetBorderRadius).toBe(27);
    });
    view.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    expect(
      await screen.findByRole('slider', { name: 'Скругление углов' }),
    ).toHaveValue('27');
  });

  it('cancels an inline rename with Escape while keeping the panel open', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await chooseSection(user, 'Пространства');
    const rename = screen.getAllByRole('button', {
      name: 'Переименовать пространство',
    })[0]!;
    await user.click(rename);
    const input = screen.getByRole('textbox', {
      name: 'Название пространства',
    });
    await user.clear(input);
    await user.type(input, 'Не сохранять{Escape}');
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toHaveAttribute(
      'open',
    );
    expect(screen.getByRole('button', { name: 'Основной' })).toBeVisible();
    await waitFor(() => expect(rename).toHaveFocus());
    expect(
      screen.queryByRole('button', { name: 'Не сохранять' }),
    ).not.toBeInTheDocument();
  });

  it('dismisses a workspace deletion confirmation without closing the panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await chooseSection(user, 'Пространства');
    const remove = screen.getAllByRole('button', {
      name: 'Удалить пространство',
    })[1]!;
    await user.click(remove);
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    expect(
      screen.getByRole('tabpanel', { name: 'Пространства' }),
    ).toBeVisible();
    expect(remove).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Работа' })).toBeVisible();
  });

  it('persists width and collapsed blocks from every tab across a reload', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    const handle = screen.getByRole('separator', {
      name: 'Ширина панели настроек',
    });
    handle.focus();
    await user.keyboard('{ArrowLeft}{Shift>}{ArrowLeft}{/Shift}');
    expect(screen.getByRole('dialog')).toHaveStyle({ width: '528px' });

    const blocks = [
      ['Оформление', 'Тема', 'appearance.theme'],
      ['Оформление', 'Сетка', 'appearance.grid'],
      ['Интерфейс', 'Панель управления', 'interface.toolbar'],
      ['Интерфейс', 'Анимации', 'interface.animations'],
      ['Пространства', 'Список пространств', 'workspaces.active'],
      ['Пространства', 'Корзина (0)', 'workspaces.trash'],
      ['Резервные копии', 'Экспорт', 'backup.export'],
      ['Резервные копии', 'Импорт', 'backup.import'],
      ['Горячие клавиши', 'Назначения клавиш', 'shortcuts.bindings'],
      ['Горячие клавиши', 'Общие', 'shortcuts.general'],
      ['Горячие клавиши', 'В режиме редактирования', 'shortcuts.editing'],
    ] as const;
    for (const [tab, title] of blocks) {
      await chooseSection(user, tab);
      const trigger = await screen.findByRole('button', { name: title });
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
    await waitFor(async () => {
      const saved = await storage.getItem<DashboardConfig>(
        DASHBOARD_STORAGE_KEY,
      );
      expect(saved?.settingsPanel).toEqual({
        width: 528,
        collapsedBlocks: blocks.map(([, , id]) => id),
      });
    });
    view.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    expect(screen.getByRole('dialog')).toHaveStyle({ width: '528px' });
    for (const [tab, title] of blocks) {
      await chooseSection(user, tab);
      expect(
        await screen.findByRole('button', { name: title }),
      ).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('preserves a wallpaper URL draft and excludes fields while its block is collapsed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    const input = await screen.findByRole('textbox', {
      name: 'Ссылка на изображение',
    });
    await user.type(input, 'https://example.com/wallpaper.png');
    const trigger = screen.getByRole('button', { name: 'Фон' });
    await user.click(trigger);
    expect(input.closest('[inert]')).not.toBeNull();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('textbox', { name: 'Ссылка на изображение' }),
    ).toHaveValue('https://example.com/wallpaper.png');
  });

  it('opens a collapsed theme block when navigating from the command palette', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(
      await screen.findByRole('button', { name: 'Выбрать тему' }),
    );
    await user.click(screen.getByRole('button', { name: /^Тема$/ }));
    await user.keyboard('{Escape}/');
    await user.type(
      await screen.findByRole('combobox', { name: 'Поиск команд' }),
      'Открыть настройки: Тема',
    );
    await user.click(
      screen.getByRole('option', { name: /Открыть настройки: Тема/ }),
    );
    expect(
      await screen.findByRole('button', { name: /^Тема$/, expanded: true }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      await screen.findByRole('button', {
        name: 'Выбрать тему',
        expanded: true,
      }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the preferred width when the viewport temporarily becomes narrower', () => {
    const originalWidth = window.innerWidth;
    const onPreferencesChange = vi.fn();
    const preferences = {
      width: 720,
      collapsedBlocks: [] as SettingsBlockId[],
    };
    try {
      render(
        <SettingsPanel
          open
          section="appearance"
          onSectionChange={() => {}}
          onOpenChange={() => {}}
          preferences={preferences}
          onPreferencesChange={onPreferencesChange}
        >
          Содержимое
        </SettingsPanel>,
      );
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 400,
      });
      fireEvent(window, new Event('resize'));
      expect(screen.getByRole('dialog')).toHaveStyle({ width: '400px' });
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 1200,
      });
      fireEvent(window, new Event('resize'));
      expect(screen.getByRole('dialog')).toHaveStyle({ width: '720px' });
      expect(onPreferencesChange).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalWidth,
      });
    }
  });

  it.each(['pointerup', 'lostpointercapture', 'pagehide', 'unmount'])(
    'saves a completed resize once on %s, without saving intermediate moves',
    (finish) => {
      const onPreferencesChange = vi.fn();
      const view = render(
        <SettingsPanel
          open
          section="appearance"
          onSectionChange={() => {}}
          onOpenChange={() => {}}
          onPreferencesChange={onPreferencesChange}
        >
          Содержимое
        </SettingsPanel>,
      );
      const handle = screen.getByRole('separator');
      Object.assign(handle, {
        setPointerCapture: vi.fn(),
        hasPointerCapture: () => true,
        releasePointerCapture: vi.fn(),
      });
      fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 800 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 700 });
      expect(screen.getByRole('dialog')).toHaveStyle({ width: '548px' });
      expect(onPreferencesChange).not.toHaveBeenCalled();
      if (finish === 'unmount') view.unmount();
      else if (finish === 'pagehide') fireEvent(window, new Event('pagehide'));
      else if (finish === 'lostpointercapture')
        fireEvent.lostPointerCapture(handle, { pointerId: 1 });
      else fireEvent.pointerUp(handle, { pointerId: 1 });
      expect(onPreferencesChange).toHaveBeenCalledExactlyOnceWith({
        width: 548,
      });
    },
  );

  it('cancels a resize with Escape before allowing Escape to close the panel', () => {
    const onPreferencesChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <SettingsPanel
        open
        section="appearance"
        onSectionChange={() => {}}
        onOpenChange={onOpenChange}
        onPreferencesChange={onPreferencesChange}
      >
        Содержимое
      </SettingsPanel>,
    );
    const handle = screen.getByRole('separator');
    Object.assign(handle, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: () => true,
      releasePointerCapture: vi.fn(),
    });
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 800 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 700 });
    fireEvent.keyDown(handle, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toHaveStyle({ width: '448px' });
    expect(onPreferencesChange).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.keyDown(handle, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
