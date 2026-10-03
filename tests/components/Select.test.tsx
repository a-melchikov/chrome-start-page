import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Select } from '../../components/ui/Select';

describe('Select', () => {
  it('renders with initial selected label', () => {
    render(
      <Select defaultValue="option-1">
        <option value="option-1">Первый вариант</option>
        <option value="option-2">Второй вариант</option>
      </Select>,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('Первый вариант');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens on click and selects an option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onValueChange = vi.fn();

    render(
      <Select
        id="test-select"
        value="option-1"
        onChange={onChange}
        onValueChange={onValueChange}
      >
        <option value="option-1">Первый вариант</option>
        <option value="option-2">Второй вариант</option>
      </Select>,
    );

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    const secondOption = options[1];
    expect(secondOption).toBeDefined();
    if (secondOption) {
      await user.click(secondOption);
    }

    expect(onValueChange).toHaveBeenCalledWith('option-2');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ value: 'option-2' }),
      }),
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates with keyboard and selects with Enter', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select defaultValue="option-1" onValueChange={onValueChange}>
        <option value="option-1">Первый</option>
        <option value="option-2">Второй</option>
      </Select>,
    );

    const combobox = screen.getByRole('combobox');
    combobox.focus();

    // Open via ArrowDown
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Navigate to second option
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(onValueChange).toHaveBeenCalledWith('option-2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape without selecting', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select defaultValue="option-1" onValueChange={onValueChange}>
        <option value="option-1">Первый</option>
        <option value="option-2">Второй</option>
      </Select>,
    );

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();

    render(
      <Select disabled defaultValue="option-1">
        <option value="option-1">Первый</option>
        <option value="option-2">Второй</option>
      </Select>,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeDisabled();

    await user.click(combobox);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports options prop directly', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select
        defaultValue="opt-b"
        options={[
          { value: 'opt-a', label: 'Пункт А' },
          { value: 'opt-b', label: 'Пункт Б' },
        ]}
        onValueChange={onValueChange}
      />,
    );

    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('Пункт Б');

    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: 'Пункт А' }));

    expect(onValueChange).toHaveBeenCalledWith('opt-a');
  });

  it('renders in static flow when dropdownPosition is static', async () => {
    const user = userEvent.setup();

    render(
      <Select defaultValue="opt-1" dropdownPosition="static">
        <option value="opt-1">Пункт 1</option>
        <option value="opt-2">Пункт 2</option>
      </Select>,
    );

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveClass('w-full', 'mt-1.5');
    expect(listbox).not.toHaveClass('absolute');
  });
  it('announces the active enabled option, skips disabled entries, and keeps options out of Tab order', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <>
        <Select
          aria-label="Вариант"
          onValueChange={onValueChange}
          options={[
            {
              value: 'disabled-first',
              label: 'Недоступный первый',
              disabled: true,
            },
            { value: 'a', label: 'Первый' },
            {
              value: 'disabled-middle',
              label: 'Недоступный средний',
              disabled: true,
            },
            { value: 'b', label: 'Последний' },
          ]}
        />
        <button>Далее</button>
      </>,
    );
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    const active = () =>
      document.getElementById(
        trigger.getAttribute('aria-activedescendant') ?? '',
      );
    expect(active()).toHaveTextContent('Первый');
    await user.keyboard('{ArrowDown}');
    expect(active()).toHaveTextContent('Последний');
    await user.keyboard('{Home}');
    expect(active()).toHaveTextContent('Первый');
    await user.keyboard('{End}{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Далее' })).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('handles an empty or entirely disabled list without selecting a value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Select options={[]} onValueChange={onValueChange} />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}{End}{Enter}');
    expect(onValueChange).not.toHaveBeenCalled();
    rerender(
      <Select
        options={[{ value: 'x', label: 'Недоступно', disabled: true }]}
        onValueChange={onValueChange}
      />,
    );
    await user.keyboard('{Home}{ArrowUp}{Enter}');
    expect(screen.getByRole('combobox')).not.toHaveAttribute(
      'aria-activedescendant',
    );
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
