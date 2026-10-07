import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultAnalogClockWidget } from '../../../widgets/analog-clock/defaults';
import { AnalogClockWidgetEditor } from '../../../widgets/analog-clock/AnalogClockWidgetEditor';
import type { AnalogClockWidgetConfig } from '../../../widgets/analog-clock/types';

describe('AnalogClockWidgetEditor', () => {
  let config: AnalogClockWidgetConfig;
  const onChange = vi.fn();
  const onRequestFinish = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    config = createDefaultAnalogClockWidget('test-analog-clock-editor', 0);
  });

  it('renders with initial values and live preview', () => {
    render(
      <AnalogClockWidgetEditor
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
      screen.getByRole('combobox', { name: 'Стиль циферблата' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Показывать секундную стрелку' }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Показывать дату' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Показывать часовой пояс' }),
    ).not.toBeChecked();
  });

  it('changes dial style to numbers', async () => {
    const user = userEvent.setup();
    render(
      <AnalogClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const styleSelect = screen.getByRole('combobox', {
      name: 'Стиль циферблата',
    });
    await user.click(styleSelect);
    await user.click(screen.getByRole('option', { name: /С цифрами/ }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dialStyle: 'numbers' }),
    );
  });

  it('changes dial style to bauhaus', async () => {
    const user = userEvent.setup();
    render(
      <AnalogClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const styleSelect = screen.getByRole('combobox', {
      name: 'Стиль циферблата',
    });
    await user.click(styleSelect);
    await user.click(screen.getByRole('option', { name: /Баухаус/ }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ dialStyle: 'bauhaus' }),
    );
  });

  it('toggles showSeconds checkbox', async () => {
    const user = userEvent.setup();
    render(
      <AnalogClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const secondsCheckbox = screen.getByRole('checkbox', {
      name: 'Показывать секундную стрелку',
    });
    await user.click(secondsCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ showSeconds: false }),
    );
  });

  it('toggles showDate checkbox', async () => {
    const user = userEvent.setup();
    render(
      <AnalogClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const dateCheckbox = screen.getByRole('checkbox', {
      name: 'Показывать дату',
    });
    await user.click(dateCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ showDate: true }),
    );
  });

  it('toggles showTimezone checkbox', async () => {
    const user = userEvent.setup();
    render(
      <AnalogClockWidgetEditor
        config={config}
        onChange={onChange}
        onRequestFinish={onRequestFinish}
      />,
    );

    const timezoneCheckbox = screen.getByRole('checkbox', {
      name: 'Показывать часовой пояс',
    });
    await user.click(timezoneCheckbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ showTimezone: true }),
    );
  });
});
