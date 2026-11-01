import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { App } from '../../entrypoints/newtab/App';
import {
  loadDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { trashWorkspace } from '../../storage/workspace-trash';

describe('Workspace management', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('renders active workspace in toolbar and switches workspaces via dropdown', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Default active workspace is "Основной"
    const selectorButton = await screen.findByRole('button', {
      name: /Пространство: Основной/,
    });
    expect(selectorButton).toBeVisible();

    // Open workspace menu
    await user.click(selectorButton);
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Рабочие пространства' }),
      ).toBeVisible(),
    );

    // Click on "Работа" workspace
    const workWorkspaceOption = screen.getByRole('menuitem', {
      name: 'Работа',
    });
    await user.click(workWorkspaceOption);

    // Toolbar button now shows "Работа"
    expect(
      await screen.findByRole('button', {
        name: /Пространство: Работа/,
      }),
    ).toBeVisible();

    // Work workspace has preset widgets (Поиск, Помодоро, Задачи)
    expect(screen.getByRole('heading', { name: 'Помодоро' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Задачи' })).toBeVisible();
  });

  it('opens workspace menu with shortcut W in view mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('button', {
      name: /Пространство: Основной/,
    });

    // Press W to open workspace menu
    await user.keyboard('w');
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Рабочие пространства' }),
      ).toBeVisible(),
    );

    // Press Escape to close menu
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: 'Рабочие пространства' }),
      ).not.toBeInTheDocument();
    });
  });

  it('switches workspaces through command palette', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('button', {
      name: /Пространство: Основной/,
    });

    // Open command palette
    await user.keyboard('/');
    const paletteInput = await screen.findByRole('combobox', {
      name: 'Поиск команд',
    });
    expect(paletteInput).toHaveFocus();

    // Search for workspace "Работа"
    await user.type(paletteInput, 'Работа');
    const option = await screen.findByRole('option', {
      name: /Переключить рабочее пространство: Работа/,
    });
    await user.click(option);

    // Active workspace switched to "Работа"
    expect(
      await screen.findByRole('button', {
        name: /Пространство: Работа/,
      }),
    ).toBeVisible();
  });

  it('creates, renames, and manages workspaces through manager dialog', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Open workspace menu
    await user.click(
      await screen.findByRole('button', {
        name: /Пространство: Основной/,
      }),
    );

    // Open workspace manager
    const manageButton = screen.getByRole('menuitem', {
      name: 'Управление пространствами...',
    });
    await user.click(manageButton);

    const dialog = await screen.findByRole('dialog', {
      name: 'Настройки',
    });
    expect(dialog).toBeVisible();

    // Click "Добавить пространство"
    const addButton = screen.getByRole('button', {
      name: 'Добавить пространство',
    });
    await user.click(addButton);

    // Verify new workspace was added and has empty dashboard text
    expect(
      screen.getByText('Пространство 3', { selector: 'button' }),
    ).toBeVisible();
    expect(screen.getAllByText('Пустой дашборд')).toHaveLength(2);

    // Rename workspace using the new pencil button
    const renameButtons = screen.getAllByRole('button', {
      name: 'Переименовать пространство',
    });
    await user.click(renameButtons[renameButtons.length - 1]!);

    const renameInput = screen.getByRole('textbox');
    await user.clear(renameInput);
    await user.type(renameInput, 'Учёба{Enter}');

    expect(screen.getByText('Учёба', { selector: 'button' })).toBeVisible();

    // Close manager dialog
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    await waitFor(() => {
      expect(dialog).not.toHaveAttribute('open');
    });

    // Active workspace is now the newly added and renamed "Учёба"
    expect(
      await screen.findByRole('button', {
        name: /Пространство: Учёба/,
      }),
    ).toBeVisible();
  });
  it('focuses the active workspace on open and keeps management actions reachable by keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = await screen.findByRole('button', {
      name: /Пространство: Основной/,
    });
    await user.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Основной' })).toHaveFocus(),
    );
    await user.tab();
    expect(
      screen.getAllByRole('button', { name: 'Переименовать' })[0],
    ).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('textbox', { name: 'Название пространства' }),
    ).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('cancels an inline rename before closing the workspace menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    const trigger = await screen.findByRole('button', {
      name: /Пространство: Основной/,
    });
    await user.click(trigger);
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Основной' })).toHaveFocus(),
    );
    await user.tab();
    await user.keyboard('{Enter}');
    const input = screen.getByRole('textbox', {
      name: 'Название пространства',
    });
    await user.clear(input);
    await user.type(input, 'Несохранённое название');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('menuitem', { name: 'Основной' })).toHaveFocus();
    expect(screen.getByRole('menu')).toBeVisible();
    expect(
      screen.queryByRole('menuitem', { name: 'Несохранённое название' }),
    ).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('safe workspace deletion', () => {
  beforeEach(() => fakeBrowser.reset());

  it('requires separate confirmation for permanent deletion and preserves the last workspace', async () => {
    const user = userEvent.setup();
    const config = createDefaultDashboardConfig();
    await saveDashboardConfig(trashWorkspace(config, config.workspaces[1]!.id));
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('tab', { name: 'Пространства' }));
    const remove = screen.getByRole('button', {
      name: 'Удалить навсегда пространство «Работа»',
    });
    await user.click(remove);
    const confirmation = screen.getByRole('dialog', {
      name: 'Удалить пространство навсегда?',
    });
    expect(confirmation).toHaveTextContent(
      'Восстановить их без резервной копии не получится',
    );
    await user.keyboard('{Escape}');
    expect(remove).toHaveFocus();
    expect((await loadDashboardConfig()).trashedWorkspaces).toHaveLength(1);
    await user.click(remove);
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Удалить пространство навсегда?' }),
      ).getByRole('button', { name: 'Удалить навсегда' }),
    );
    await waitFor(() =>
      expect(screen.getByText('Корзина пуста')).toBeVisible(),
    );
    const stored = await loadDashboardConfig();
    expect(stored.trashedWorkspaces).toEqual([]);
    expect(stored.workspaces).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Удалить пространство' }),
    ).toBeDisabled();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Добавить пространство' }),
      ).toHaveFocus(),
    );
  });

  it.each(['menu', 'settings'] as const)(
    'confirms even an empty workspace from %s and cancels with focus restored',
    async (source) => {
      const user = userEvent.setup();
      render(<App />);
      const trigger = await screen.findByRole('button', {
        name: 'Пространство: Основной',
      });
      let remove: HTMLElement;
      if (source === 'menu') {
        await user.click(trigger);
        const row = screen.getByRole('menuitem', {
          name: 'Основной',
        }).parentElement!;
        remove = within(row).getByRole('button', {
          name: 'Удалить',
        });
      } else {
        await user.click(screen.getByRole('button', { name: 'Настройки' }));
        await user.click(screen.getByRole('tab', { name: 'Пространства' }));
        remove = screen.getAllByRole('button', {
          name: 'Удалить пространство',
        })[0]!;
      }
      await user.click(remove);
      const confirmation = screen.getByRole('dialog', {
        name: 'Переместить пространство в корзину?',
      });
      expect(within(confirmation).getByText(/«Основной»/)).toBeVisible();
      expect(confirmation).toHaveTextContent('Виджетов: 0');
      expect(
        within(confirmation).getByRole('button', { name: 'Отмена' }),
      ).toHaveFocus();
      expect(confirmation).not.toHaveTextContent('Действие можно отменить');
      await user.keyboard('{Escape}');
      await waitFor(() => expect(remove).toHaveFocus());
      expect((await loadDashboardConfig()).workspaces).toHaveLength(2);
    },
  );

  it('persists the trash across a new App mount and restores the complete workspace', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Пространство: Основной' }),
    );
    const original = (await loadDashboardConfig()).workspaces[1]!;
    const row = screen.getByRole('menuitem', { name: 'Работа' }).parentElement!;
    await user.click(within(row).getByRole('button', { name: 'Удалить' }));
    const confirmation = screen.getByRole('dialog', {
      name: 'Переместить пространство в корзину?',
    });
    expect(confirmation).toHaveTextContent('Виджетов: 3');
    await user.click(
      within(confirmation).getByRole('button', { name: 'В корзину' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', {
          name: 'Переместить пространство в корзину?',
        }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Пространство: Основной' }),
      ).toHaveFocus(),
    );
    expect(
      (await loadDashboardConfig()).trashedWorkspaces?.[0]?.workspace,
    ).toEqual(original);
    first.unmount();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('tab', { name: 'Пространства' }));
    await user.click(
      screen.getByRole('button', {
        name: 'Восстановить пространство «Работа»',
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByText('Пространство восстановлено и открыто'),
      ).toBeVisible(),
    );
    const restored = await loadDashboardConfig();
    expect(restored.workspaces[1]).toEqual(original);
    expect(restored.activeWorkspaceId).toBe(original.id);
    expect(restored.trashedWorkspaces).toEqual([]);
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', {
          name: 'Переименовать пространство',
        })[1],
      ).toHaveFocus(),
    );
  });

  it('keeps the confirmation open and data unchanged on storage failure', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('tab', { name: 'Пространства' }));
    const before = await loadDashboardConfig();
    await user.click(
      screen.getAllByRole('button', {
        name: 'Удалить пространство',
      })[1]!,
    );
    const write = vi
      .spyOn(fakeBrowser.storage.local, 'set')
      .mockRejectedValueOnce(new Error('Недостаточно места'));
    try {
      await user.click(screen.getByRole('button', { name: 'В корзину' }));
      const confirmation = screen.getByRole('dialog', {
        name: 'Переместить пространство в корзину?',
      });
      await waitFor(() =>
        expect(within(confirmation).getByRole('alert')).toHaveTextContent(
          'Недостаточно места',
        ),
      );
      expect(within(confirmation).getByRole('alert')).toHaveFocus();
      expect(await loadDashboardConfig()).toEqual(before);
      expect(
        within(confirmation).getByRole('button', { name: 'В корзину' }),
      ).toBeEnabled();
    } finally {
      write.mockRestore();
    }
  });
});
