import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CommandPalette } from '../../components/dashboard/CommandPalette';
import { createDefaultDashboardConfig } from '../../storage/defaults';

describe('CommandPalette', () => {
  it('keeps search hidden until opened and places it at the top without a visible heading', () => {
    const props = {
      config: createDefaultDashboardConfig(),
      isEditing: false,
      onOpenChange: vi.fn(),
      onSelect: vi.fn(),
    };
    const { rerender } = render(<CommandPalette {...props} open={false} />);
    expect(
      screen.queryByRole('combobox', { name: 'Поиск команд' }),
    ).not.toBeInTheDocument();

    rerender(<CommandPalette {...props} open />);
    const dialog = screen.getByRole('dialog', { name: 'Поиск команд' });
    expect(dialog).toHaveClass(
      'fixed',
      'top-[4.5rem]',
      'min-[36rem]:top-4',
      'min-[36rem]:w-[min(30rem,calc(100vw-22.25rem))]',
    );
    expect(
      screen.getByRole('heading', { name: 'Поиск команд' }).parentElement,
    ).toHaveClass('sr-only');
    const input = screen.getByRole('combobox', { name: 'Поиск команд' });
    expect(input).toHaveFocus();
    expect(input).toHaveClass(
      'h-[50px]',
      'rounded-xl',
      'border-theme-border',
      'bg-theme-surface',
      'outline-none',
    );
    expect(input.className).not.toContain('focus-visible:ring');
    expect(screen.getByRole('listbox')).toHaveClass(
      'command-palette-results',
      'overflow-y-auto',
    );
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);

    fireEvent.click(dialog);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('filters, navigates and executes a command', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CommandPalette
        config={createDefaultDashboardConfig()}
        isEditing={false}
        open
        onOpenChange={vi.fn()}
        onSelect={onSelect}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Поиск команд' });
    expect(input).toHaveFocus();
    await user.type(input, 'Помодоро');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Enter}');
    await vi.waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'add', widgetType: 'pomodoro' }),
      ),
    );
  });

  it('opens the theme list and shows empty search state', async () => {
    const user = userEvent.setup();
    render(
      <CommandPalette
        config={createDefaultDashboardConfig()}
        isEditing={false}
        open
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('option', { name: /Переключить тему/ }));
    expect(screen.getAllByRole('option')).toHaveLength(11);
    await user.type(screen.getByRole('combobox'), 'несуществующая тема');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  it('moves the active result with arrow keys', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CommandPalette
        config={createDefaultDashboardConfig()}
        isEditing={false}
        open
        onOpenChange={vi.fn()}
        onSelect={onSelect}
      />,
    );
    await user.type(screen.getByRole('combobox'), 'Настройки:');
    const options = screen.getAllByRole('option');
    const firstOption = options[0];
    const nextOption = options[1];
    if (!firstOption || !nextOption) throw new Error('Expected two commands');
    const scrollIntoView = vi.fn();
    nextOption.scrollIntoView = scrollIntoView;
    expect(firstOption).toHaveClass(
      'border-theme-accent/50',
      'bg-theme-accent/10',
    );
    await user.keyboard('{ArrowDown}');
    expect(nextOption).toHaveAttribute('aria-selected', 'true');
    expect(nextOption).toHaveClass(
      'border-theme-accent/50',
      'bg-theme-accent/10',
    );
    expect(firstOption).toHaveClass('border-transparent');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    await user.keyboard('{Enter}');
    await vi.waitFor(() =>
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'section', section: 'background' }),
      ),
    );
  });
});
