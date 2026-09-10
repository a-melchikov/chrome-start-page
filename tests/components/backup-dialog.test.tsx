import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BackupDialog } from '../../components/dashboard/BackupDialog';
import type {
  DashboardBackupDownload,
  DashboardImportResult,
} from '../../storage/dashboard-backup';
import { createDefaultDashboardConfig } from '../../storage/defaults';

function createProps(
  overrides: Partial<React.ComponentProps<typeof BackupDialog>> = {},
): React.ComponentProps<typeof BackupDialog> {
  return {
    error: null,
    isProcessing: false,
    open: true,
    onClearError: vi.fn(),
    onExport: vi
      .fn<() => Promise<DashboardBackupDownload>>()
      .mockResolvedValue({
        fileName: 'chrome-start-page-backup.json',
        contents: '{"backup":true}',
      }),
    onImport: vi.fn<() => Promise<DashboardImportResult>>().mockResolvedValue({
      config: createDefaultDashboardConfig(),
      warning: null,
    }),
    onOpenChange: vi.fn(),
    ...overrides,
  };
}

describe('BackupDialog', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the exported JSON through a temporary object URL', async () => {
    const user = userEvent.setup();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:backup'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:backup');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const props = createProps();
    render(<BackupDialog {...props} />);

    await user.click(
      screen.getByRole('button', { name: 'Скачать резервную копию' }),
    );

    expect(props.onExport).toHaveBeenCalledOnce();
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:backup');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Резервная копия скачана',
    );
  });

  it('requires file selection and an explicit import confirmation', async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<BackupDialog {...props} />);

    const importButton = screen.getByRole('button', { name: 'Импортировать' });
    expect(importButton).toBeDisabled();

    const file = new File(['{}'], 'my-backup.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByLabelText('Файл резервной копии'), file);

    expect(props.onImport).not.toHaveBeenCalled();
    expect(screen.getByText(/my-backup\.json/)).toBeVisible();
    expect(importButton).toBeEnabled();

    await user.click(importButton);

    expect(props.onImport).toHaveBeenCalledWith(file, expect.any(AbortSignal));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Дашборд восстановлен',
    );
    expect(screen.queryByText(/my-backup\.json/)).not.toBeInTheDocument();
  });

  it('shows import errors in the dialog', () => {
    render(<BackupDialog {...createProps({ error: 'Файл повреждён' })} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Файл повреждён');
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Открыть резервные копии
          </button>
          <BackupDialog {...createProps({ open, onOpenChange: setOpen })} />
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', {
      name: 'Открыть резервные копии',
    });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Импорт и экспорт' });
    expect(dialog).toHaveAttribute('open');
    expect(
      screen.getByRole('button', { name: 'Скачать резервную копию' }),
    ).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(trigger).toHaveFocus();
  });
});
