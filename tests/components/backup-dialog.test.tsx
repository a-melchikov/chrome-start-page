import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BackupSettings } from '../../components/dashboard/BackupSettings';
import { SettingsPanel } from '../../components/dashboard/SettingsPanel';

function BackupDialog({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof BackupSettings> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SettingsPanel
      open={open}
      section="backup"
      onSectionChange={() => {}}
      onOpenChange={onOpenChange}
    >
      {open && <BackupSettings {...props} />}
    </SettingsPanel>
  );
}
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
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Выбрать файл' }),
      ).toHaveFocus(),
    );
  });

  it('shows import errors in the dialog', () => {
    render(<BackupDialog {...createProps({ error: 'Файл повреждён' })} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Файл повреждён');
  });

  it('aborts an in-flight import when navigating to another section', async () => {
    const user = userEvent.setup();
    let receivedSignal: AbortSignal | undefined;
    const onImport = vi.fn((_file: File, signal?: AbortSignal) => {
      receivedSignal = signal;
      return new Promise<DashboardImportResult>(() => {});
    });
    function Harness() {
      const [section, setSection] = useState<'backup' | 'shortcuts'>('backup');
      return (
        <SettingsPanel
          open
          section={section}
          onOpenChange={() => {}}
          onSectionChange={(next) => {
            if (next === 'shortcuts') setSection(next);
          }}
        >
          {section === 'backup' && (
            <BackupSettings {...createProps({ onImport })} />
          )}
        </SettingsPanel>
      );
    }
    render(<Harness />);
    await user.upload(
      screen.getByLabelText('Файл резервной копии'),
      new File(['{}'], 'test.json', { type: 'application/json' }),
    );
    await user.click(screen.getByRole('button', { name: 'Импортировать' }));
    expect(receivedSignal?.aborted).toBe(false);
    await user.click(screen.getByRole('tab', { name: 'Горячие клавиши' }));
    expect(receivedSignal?.aborted).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toHaveAttribute(
      'open',
    );
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

    const dialog = screen.getByRole('dialog', { name: 'Настройки' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('tab', { name: 'Резервные копии' })).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
    expect(trigger).toHaveFocus();
  });
});
