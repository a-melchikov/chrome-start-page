import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { createDefaultPomodoroWidget } from '../../../widgets/pomodoro/defaults';
import { PomodoroWidgetEditor } from '../../../widgets/pomodoro/PomodoroWidgetEditor';
import type { PomodoroWidgetConfig } from '../../../widgets/pomodoro/types';

const baseConfig: PomodoroWidgetConfig = createDefaultPomodoroWidget(
  'editor-test-widget',
  0,
);

function PomodoroEditorHarness({
  initialConfig = baseConfig,
  onFinish,
}: {
  initialConfig?: PomodoroWidgetConfig;
  onFinish?: () => void;
}) {
  const [config, setConfig] = useState(initialConfig);

  return (
    <>
      <PomodoroWidgetEditor
        config={config}
        onChange={setConfig}
        onRequestFinish={onFinish ?? vi.fn()}
      />
      <output data-testid="config-output">{JSON.stringify(config)}</output>
    </>
  );
}

describe('PomodoroWidgetEditor', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('renders input fields with default config values', () => {
    render(
      <PomodoroWidgetEditor
        config={baseConfig}
        onChange={vi.fn()}
        onRequestFinish={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Фокус (мин)')).toHaveValue(25);
    expect(screen.getByLabelText('Короткий перерыв (мин)')).toHaveValue(5);
    expect(screen.getByLabelText('Длинный перерыв (мин)')).toHaveValue(15);
    expect(screen.getByLabelText('Интервал длинного перерыва')).toHaveValue(4);
    expect(
      screen.getByLabelText('Звуковой сигнал при завершении фазы'),
    ).toBeChecked();
  });

  it('calls onChange when inputs change', async () => {
    const user = userEvent.setup();
    render(<PomodoroEditorHarness />);

    const workInput = screen.getByLabelText('Фокус (мин)');
    await user.clear(workInput);
    await user.type(workInput, '30');

    expect(screen.getByTestId('config-output')).toHaveTextContent(
      '"workDuration":30',
    );

    const soundCheckbox = screen.getByLabelText(
      'Звуковой сигнал при завершении фазы',
    );
    await user.click(soundCheckbox);

    expect(screen.getByTestId('config-output')).toHaveTextContent(
      '"soundEnabled":false',
    );
  });

  it('calls onRequestFinish when clicking Готово', async () => {
    const user = userEvent.setup();
    const onRequestFinish = vi.fn();

    render(
      <PomodoroWidgetEditor
        config={baseConfig}
        onChange={vi.fn()}
        onRequestFinish={onRequestFinish}
      />,
    );

    const finishButton = screen.getByRole('button', { name: 'Готово' });
    await user.click(finishButton);

    expect(onRequestFinish).toHaveBeenCalledTimes(1);
  });
});
