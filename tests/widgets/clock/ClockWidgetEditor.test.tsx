import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultClockWidget } from '../../../widgets/clock/defaults';
import { ClockWidgetEditor } from '../../../widgets/clock/ClockWidgetEditor';
import type { ClockWidgetConfig } from '../../../widgets/clock/types';

describe('ClockWidgetEditor', () => {
  let config: ClockWidgetConfig;
  const onChange = vi.fn();
  const onRequestFinish = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    config = createDefaultClockWidget('test-clock-editor', 0);
  });

  it('renders with initial values and live preview', () => {
    render(
      <ClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    expect(screen.getByText('Предпросмотр')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Часовой пояс' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Формат времени' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Формат даты' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Показывать время' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Показывать секунды' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Показывать дату' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Показывать день недели' }),
    ).toBeChecked();
  });

  it('toggles time format between 24h and 12h', async () => {
    const user = userEvent.setup();
    render(
      <ClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const timeFormatSelect = screen.getByRole('combobox', {
      name: 'Формат времени',
    });
    await user.click(timeFormatSelect);
    await user.click(screen.getByRole('option', { name: /12-часовой/ }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ timeFormat: '12h' }),
    );
  });

  it('toggles showSeconds checkbox', async () => {
    const user = userEvent.setup();
    render(
      <ClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const secondsCheckbox = screen.getByRole('checkbox', {
      name: 'Показывать секунды',
    });
    await user.click(secondsCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ showSeconds: true }),
    );
  });

  it('changes date format preset', async () => {
    const user = userEvent.setup();
    render(
      <ClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const dateFormatSelect = screen.getByRole('combobox', {
      name: 'Формат даты',
    });
    await user.click(dateFormatSelect);
    await user.click(screen.getByRole('option', { name: /22.09.2026/ }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateFormat: 'numeric' }),
    );
  });

  it('filters timezone list using search input inside dropdown', async () => {
    const user = userEvent.setup();
    render(
      <ClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const tzButton = screen.getByRole('combobox', { name: 'Часовой пояс' });
    await user.click(tzButton);

    const searchInput = screen.getByRole('textbox', {
      name: 'Поиск города или пояса',
    });
    await user.type(searchInput, 'tokyo');

    expect(screen.getByRole('option', { name: /Токио/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /Москва/ }),
    ).not.toBeInTheDocument();
  });

  it('changes timezone selection', async () => {
    const user = userEvent.setup();
    render(
      <ClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const tzButton = screen.getByRole('combobox', { name: 'Часовой пояс' });
    await user.click(tzButton);

    const utcOption = screen.getByRole('option', { name: /UTC/ });
    await user.click(utcOption);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: 'UTC' }),
    );
  });

  it('does not render custom title input', () => {
    render(
      <ClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    expect(screen.queryByLabelText(/Название виджета/)).not.toBeInTheDocument();
  });

  it('calls onRequestFinish when clicking finish button', async () => {
    const user = userEvent.setup();
    render(
      <ClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const finishButton = screen.getByRole('button', { name: 'Готово' });
    await user.click(finishButton);

    expect(onRequestFinish).toHaveBeenCalledTimes(1);
  });
});
