import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomThemeEditorDialog } from '../../components/dashboard/CustomThemeEditorDialog';
import { createCustomThemeSnapshot } from '../../themes/color-derivation';

vi.mock('../../components/dashboard/ThemePreview', () => ({
  ThemePreview: () => <div>Предпросмотр палитры</div>,
}));

function editorProps() {
  return {
    open: true,
    initialTheme: createCustomThemeSnapshot(
      'dark',
      'dark',
      'Моя тема',
      'test-theme',
    ),
    isNew: true,
    existingThemes: [],
    widgets: [],
    onOpenChange: vi.fn(),
    onSave: vi.fn(),
    onPreviewFullScreen: vi.fn(),
  };
}

describe('CustomThemeEditorDialog', () => {
  it('focuses the theme name and lets Escape dismiss the nested confirmation first', async () => {
    const user = userEvent.setup();
    const props = editorProps();
    render(<CustomThemeEditorDialog {...props} />);
    expect(
      screen.getByRole('dialog', { name: 'Создание темы' }),
    ).toHaveAttribute('open');
    const name = screen.getByRole('textbox', { name: 'Название темы *' });
    expect(name).toHaveFocus();
    await user.type(name, ' новая');
    await user.keyboard('{Escape}');
    const confirm = screen.getByRole('dialog', {
      name: 'Несохранённые изменения',
    });
    expect(
      within(confirm).getByRole('button', {
        name: 'Продолжить редактирование',
      }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', { name: 'Несохранённые изменения' }),
    ).not.toBeInTheDocument();
    expect(props.onOpenChange).not.toHaveBeenCalled();
    expect(name).toHaveFocus();
  });

  it('associates invalid HEX values with the color label and error and prevents saving', async () => {
    const user = userEvent.setup();
    render(<CustomThemeEditorDialog {...editorProps()} />);
    const field = screen.getByRole('textbox', { name: 'Фон страницы' });
    await user.clear(field);
    await user.type(field, '#badhex');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Формат #RRGGBB');
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    expect(
      screen.getByLabelText('Выбрать цвет для «Фон страницы»'),
    ).toBeInTheDocument();
  });

  it('retains its draft while the full screen preview temporarily closes the editor', async () => {
    const user = userEvent.setup();
    const props = editorProps();
    const { rerender } = render(<CustomThemeEditorDialog {...props} />);
    const name = screen.getByRole('textbox', { name: 'Название темы *' });
    await user.clear(name);
    await user.type(name, 'Морской бриз');
    await user.click(
      screen.getByRole('button', { name: 'Показать всю страницу' }),
    );
    expect(props.onPreviewFullScreen).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Морской бриз' }),
    );
    rerender(<CustomThemeEditorDialog {...props} open={false} />);
    expect(name.closest('dialog')).toHaveAttribute('inert');
    expect(
      screen.queryByRole('dialog', { name: 'Создание темы' }),
    ).not.toBeInTheDocument();
    rerender(<CustomThemeEditorDialog {...props} />);
    expect(name.closest('dialog')).not.toHaveAttribute('inert');
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Название темы *' }),
      ).toHaveValue('Морской бриз'),
    );
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Морской бриз' }),
    );
  });
});
