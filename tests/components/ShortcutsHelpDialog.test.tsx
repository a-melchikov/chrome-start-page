import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShortcutsHelpDialog } from '../../components/dashboard/ShortcutsHelpDialog';

describe('ShortcutsHelpDialog', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (
      this: HTMLDialogElement,
    ) {
      this.open = false;
    });
  });

  it('renders all shortcut groups and descriptions when open', () => {
    render(<ShortcutsHelpDialog open={true} onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Горячие клавиши' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Общие')).toBeInTheDocument();
    expect(screen.getByText('В режиме редактирования')).toBeInTheDocument();

    expect(
      screen.getByText('Включить или выключить режим редактирования'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Переместить фокус в поле поиска'),
    ).toBeInTheDocument();
    expect(screen.getByText('Справка по горячим клавишам')).toBeInTheDocument();
    expect(
      screen.getByText('Закрыть окно или выйти из редактирования'),
    ).toBeInTheDocument();

    expect(screen.getByText('Добавить виджет')).toBeInTheDocument();
    expect(screen.getByText('Настройки оформления')).toBeInTheDocument();
    expect(
      screen.getByText('Импорт и экспорт (резервная копия)'),
    ).toBeInTheDocument();

    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('F1')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getByText('O')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when clicking close button', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<ShortcutsHelpDialog open={true} onOpenChange={onOpenChange} />);

    const closeButtons = screen.getAllByRole('button', { name: 'Закрыть' });
    const closeButton = closeButtons[0];
    expect(closeButton).toBeDefined();

    if (closeButton) {
      await user.click(closeButton);
    }
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
