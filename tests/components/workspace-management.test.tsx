import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { App } from '../../entrypoints/newtab/App';

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
    expect(
      screen.getByRole('heading', { name: 'Рабочие пространства' }),
    ).toBeVisible();

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
    expect(
      await screen.findByRole('heading', { name: 'Рабочие пространства' }),
    ).toBeVisible();

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
      name: 'Управление рабочими пространствами',
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
});
