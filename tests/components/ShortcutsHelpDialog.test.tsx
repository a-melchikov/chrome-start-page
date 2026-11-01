import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShortcutsHelp } from '../../components/dashboard/ShortcutsHelp';
import { SettingsPanel } from '../../components/dashboard/SettingsPanel';

function ShortcutsHelpDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SettingsPanel {...props} section="shortcuts" onSectionChange={() => {}}>
      <ShortcutsHelp />
    </SettingsPanel>
  );
}

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
      screen.getByRole('tabpanel', { name: 'Горячие клавиши' }),
    ).toBeInTheDocument();

    expect(screen.getByText('Общие')).toBeInTheDocument();
    expect(screen.getByText('В режиме редактирования')).toBeInTheDocument();

    expect(screen.getByText('Режим редактирования')).toBeInTheDocument();
    expect(screen.getByText('Поиск команд')).toBeInTheDocument();
    expect(screen.getByText('Справка')).toBeInTheDocument();
    expect(
      screen.getByText('Закрыть окно или выйти из редактирования'),
    ).toBeInTheDocument();

    expect(screen.getByText('Добавить виджет')).toBeInTheDocument();
    expect(
      screen.getByText('Настройки', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('tabpanel', { name: 'Горячие клавиши' }),
      ).getByText('Резервные копии'),
    ).toBeInTheDocument();

    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
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

    const closeButton = screen.getByRole('button', { name: 'Закрыть' });
    await user.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
