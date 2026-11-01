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
import { DashboardToolbar } from '../../components/dashboard/DashboardToolbar';
import { useDashboardToolbar } from '../../hooks/use-dashboard-toolbar';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import {
  DASHBOARD_STORAGE_KEY,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import type { DashboardConfig, ToolbarMode } from '../../storage/schema';

function Harness({
  mode = 'left-collapsible',
  editing = false,
  epoch = 0,
}: {
  mode?: ToolbarMode;
  editing?: boolean;
  epoch?: number;
}) {
  const toolbar = useDashboardToolbar({
    mode,
    isEditing: editing,
    resetEpoch: epoch,
    onCollapse: () => {},
  });
  return (
    <>
      <DashboardToolbar
        mode={mode}
        isOpen={toolbar.isOpen}
        isInteracting={false}
        canManage
        toolbarId={toolbar.toolbarId}
        panelRef={toolbar.panelRef}
        revealRef={toolbar.revealRef}
        onExpand={() => toolbar.expand(true)}
        onCollapse={() => toolbar.collapse()}
      >
        <button>Действие</button>
      </DashboardToolbar>
      <button>Снаружи</button>
      <button data-toolbar-owner={toolbar.toolbarId}>Внутри popup</button>
    </>
  );
}

function panel() {
  return document.querySelector<HTMLElement>('.dashboard-toolbar[data-mode]')!;
}

async function startApp(mode: ToolbarMode = 'left-collapsible') {
  const config = createDefaultDashboardConfig();
  config.toolbar = { mode };
  config.workspaces[0]!.widgets = [
    {
      id: 'note',
      type: 'markdown',
      title: 'Заметка',
      content: 'Текст',
      template: 'blank',
      quickAddEnabled: false,
      hideCompletedTasks: false,
      layout: { x: 0, y: 0, w: 4, h: 3 },
    },
  ];
  await saveDashboardConfig(config);
  const view = render(<App />);
  await screen.findByRole('heading', { name: 'Заметка' });
  return { config, ...view };
}

async function stored() {
  return (await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY))!;
}

async function chooseMode(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(
    await screen.findByRole('combobox', { name: 'Расположение и видимость' }),
  );
  await user.click(screen.getByRole('option', { name: label }));
}

beforeEach(() => fakeBrowser.reset());

describe('toolbar visibility and focus', () => {
  it('opens on trigger click rather than hover and restores focus on collapse', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', {
      name: 'Раскрыть панель управления',
    });
    expect(panel()).toHaveAttribute('inert');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.hover(trigger.parentElement!);
    expect(panel()).toHaveAttribute('inert');
    await user.click(trigger);
    expect(panel()).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Действие' })).toHaveFocus();
    await user.unhover(panel());
    expect(panel()).toHaveAttribute('data-open', 'true');
    await user.click(
      screen.getByRole('button', { name: 'Свернуть панель управления' }),
    );
    expect(panel()).toHaveAttribute('inert');
    expect(trigger).toHaveFocus();
  });

  it('allows keyboard access to the collapsed panel trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Раскрыть панель управления' }),
    ).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Действие' })).toHaveFocus();
  });

  it('treats portalled menus as internal and passes an outside click through', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(
      screen.getByRole('button', { name: 'Раскрыть панель управления' }),
    );
    await user.click(screen.getByRole('button', { name: 'Внутри popup' }));
    expect(panel()).toHaveAttribute('data-open', 'true');
    const outside = screen.getByRole('button', { name: 'Снаружи' });
    const onOutsideClick = vi.fn(() => {
      expect(panel()).toHaveAttribute('data-open', 'true');
    });
    outside.addEventListener('click', onOutsideClick);
    await user.pointer({ target: outside, keys: '[MouseLeft>]' });
    expect(panel()).toHaveAttribute('data-open', 'true');
    await user.pointer({ keys: '[/MouseLeft]' });
    expect(onOutsideClick).toHaveBeenCalledOnce();
    expect(panel()).toHaveAttribute('data-open', 'false');
    expect(outside).toHaveFocus();
  });

  it('opens on entry to editing but allows collapse until the next entry', async () => {
    const user = userEvent.setup();
    const view = render(<Harness />);
    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Раскрыть панель управления' }),
    ).toHaveFocus();
    view.rerender(<Harness editing />);
    expect(panel()).toHaveAttribute('data-open', 'true');
    expect(screen.getByRole('button', { name: 'Действие' })).toHaveFocus();
    await user.click(
      screen.getByRole('button', { name: 'Свернуть панель управления' }),
    );
    view.rerender(<Harness editing />);
    expect(panel()).toHaveAttribute('data-open', 'false');
    view.rerender(<Harness />);
    expect(panel()).toHaveAttribute('data-open', 'false');
    view.rerender(<Harness editing />);
    expect(panel()).toHaveAttribute('data-open', 'true');
    view.rerender(<Harness editing epoch={1} />);
    expect(panel()).toHaveAttribute('data-open', 'false');
  });

  it.each(['top-right', 'left-fixed'] as const)(
    'keeps %s visible without collapse controls',
    (mode) => {
      render(<Harness mode={mode} />);
      expect(panel()).not.toHaveAttribute('inert');
      expect(
        screen.queryByRole('button', { name: 'Раскрыть панель управления' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Свернуть панель управления' }),
      ).not.toBeInTheDocument();
    },
  );
});

describe('dashboard toolbar integration', () => {
  it.each(['top-right', 'left-fixed'] as const)(
    'opens settings and backup without editing in %s mode and restores focus',
    async (mode) => {
      const user = userEvent.setup();
      await startApp(mode);

      const appearanceButton = screen.getByRole('button', {
        name: 'Настройки',
      });
      await user.click(appearanceButton);
      const appearanceDialog = await screen.findByRole('dialog', {
        name: 'Настройки',
      });
      expect(appearanceDialog).toHaveAttribute('open');
      await user.keyboard('{Escape}');
      await waitFor(() => expect(appearanceButton).toHaveFocus());

      const backupButton = screen.getByRole('button', {
        name: 'Импорт и экспорт',
      });
      await user.click(backupButton);
      const backupDialog = await screen.findByRole('dialog', {
        name: 'Настройки',
      });
      expect(backupDialog).toHaveAttribute('open');
      await user.keyboard('{Escape}');
      await waitFor(() => expect(backupButton).toHaveFocus());
      expect(
        screen.getByRole('button', { name: 'Включить режим редактирования' }),
      ).toHaveAttribute('aria-pressed', 'false');
    },
  );

  it('persists the global setting immediately, keeps the dialog open, and restores focus to the reveal button', async () => {
    const user = userEvent.setup();
    const { config } = await startApp('top-right');
    await user.keyboard('e');
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('tab', { name: 'Интерфейс' }));
    await chooseMode(user, 'Слева — скрываемая');
    await waitFor(async () =>
      expect((await stored()).toolbar.mode).toBe('left-collapsible'),
    );
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toHaveAttribute(
      'open',
    );
    expect((await stored()).workspaces).toEqual(config.workspaces);
    expect(panel()).toHaveAttribute('inert');
    await user.keyboard('{Escape}');
    expect(
      screen.getByRole('button', { name: 'Раскрыть панель управления' }),
    ).toHaveFocus();
    expect(document.querySelector('[aria-label="Виджеты"]')).toHaveStyle({
      paddingTop: '24px',
    });
  });

  it('M toggles visibility without persisting state or changing saved grid coordinates', async () => {
    const user = userEvent.setup();
    const { config } = await startApp();
    const save = vi.spyOn(fakeBrowser.storage.local, 'set');
    const grid = document.querySelector('[aria-label="Виджеты"]');
    await user.keyboard('m');
    expect(panel()).toHaveAttribute('data-open', 'true');
    expect(
      screen.getByRole('button', { name: 'Пространство: Основной' }),
    ).toHaveFocus();
    await user.keyboard('m');
    expect(panel()).toHaveAttribute('data-open', 'false');
    expect(grid).toHaveStyle({ paddingTop: '24px' });
    expect(await stored()).toEqual(config);
    expect(save).not.toHaveBeenCalled();
    save.mockRestore();
  });

  it('preserves editing while hidden and preserves existing Escape behavior', async () => {
    const user = userEvent.setup();
    await startApp();
    await user.keyboard('e');
    expect(panel()).toHaveAttribute('data-open', 'true');
    await user.click(
      screen.getByRole('button', { name: 'Свернуть панель управления' }),
    );
    expect(
      document.querySelector('.dashboard-grid--editing'),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(
      document.querySelector('.dashboard-grid--editing'),
    ).not.toBeInTheDocument();
    expect(panel()).toHaveAttribute('data-open', 'false');
  });

  it('keeps the panel open behind a dialog and restores launcher focus', async () => {
    const user = userEvent.setup();
    await startApp();
    await user.keyboard('m');
    const help = screen.getByRole('button', { name: 'Горячие клавиши' });
    await user.click(help);
    const dialog = screen.getByRole('dialog', { name: 'Настройки' });
    fireEvent.pointerDown(dialog);
    expect(panel()).toHaveAttribute('data-open', 'true');
    await user.keyboard('m');
    expect(panel()).toHaveAttribute('data-open', 'true');
    await user.keyboard('{Escape}');
    expect(help).toHaveFocus();
  });

  it('W reveals the panel and opens an unclipped workspace menu; switching preserves visibility', async () => {
    const user = userEvent.setup();
    const { config } = await startApp();
    await user.keyboard('w');
    const menu = screen.getByRole('menu');
    expect(menu.parentElement).toBe(screen.getByRole('main'));
    expect(menu).toHaveClass('fixed');
    expect(panel()).toHaveAttribute('data-open', 'true');
    await user.click(screen.getByRole('menuitem', { name: /Работа/ }));
    await waitFor(async () =>
      expect((await stored()).activeWorkspaceId).toBe(config.workspaces[1]!.id),
    );
    expect(panel()).toHaveAttribute('data-open', 'true');
    expect((await stored()).toolbar.mode).toBe('left-collapsible');
  });

  it('opens the toolbar section from the command palette', async () => {
    const user = userEvent.setup();
    await startApp();
    await user.keyboard('/');
    await user.type(
      await screen.findByRole('combobox', { name: 'Поиск команд' }),
      'Панель управления',
    );
    await user.click(screen.getByRole('option', { name: /Панель управления/ }));
    expect(
      await screen.findByRole('tab', { name: 'Интерфейс', selected: true }),
    ).toHaveTextContent('Интерфейс');
    expect(
      screen.getByRole('heading', { name: 'Панель управления' }),
    ).toBeVisible();
  });

  it('starts collapsed on remount and resets on accepted external configuration', async () => {
    const user = userEvent.setup();
    const view = await startApp();
    await user.keyboard('m');
    expect(panel()).toHaveAttribute('data-open', 'true');
    const external = {
      ...view.config,
      workspaces: view.config.workspaces.map((workspace) => ({
        ...workspace,
        name: `${workspace.name} 2`,
      })),
    };
    await act(async () => {
      await saveDashboardConfig(external);
    });
    await waitFor(() => expect(panel()).toHaveAttribute('data-open', 'false'));
    await user.keyboard('m');
    view.unmount();
    render(<App />);
    await screen.findByRole('heading', { name: 'Заметка' });
    expect(panel()).toHaveAttribute('data-open', 'false');
  });
});
