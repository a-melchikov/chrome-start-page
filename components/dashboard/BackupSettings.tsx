import { useEffect, useRef, useState } from 'react';

import type {
  DashboardBackupDownload,
  DashboardImportResult,
} from '../../storage/dashboard-backup';
import { Button } from '../ui';
import { downloadBackup } from './download-backup';

interface BackupSettingsProps {
  error: string | null;
  isProcessing: boolean;
  onClearError: () => void;
  onExport: () => Promise<DashboardBackupDownload>;
  onImport: (
    file: File,
    signal?: AbortSignal,
  ) => Promise<DashboardImportResult>;
}

type ActiveAction = 'export' | 'import' | null;

interface Feedback {
  kind: 'success' | 'warning';
  message: string;
}

export function BackupSettings({
  error,
  isProcessing,
  onClearError,
  onExport,
  onImport,
}: BackupSettingsProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const selectFileButtonRef = useRef<HTMLButtonElement>(null);
  const focusFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importControllerRef = useRef<AbortController | null>(null);
  const operationTokenRef = useRef(0);

  useEffect(
    () => () => {
      operationTokenRef.current += 1;
      importControllerRef.current?.abort();
      if (focusFrameRef.current !== null)
        cancelAnimationFrame(focusFrameRef.current);
    },
    [],
  );

  const exportBackup = async () => {
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setActiveAction('export');
    setFeedback(null);
    onClearError();

    try {
      const download = await onExport();
      downloadBackup(download);

      if (operationTokenRef.current === token) {
        setFeedback({
          kind: 'success',
          message: 'Резервная копия скачана',
        });
      }
    } catch {
      // The state hook exposes export errors in this dialog.
    } finally {
      if (operationTokenRef.current === token) {
        setActiveAction(null);
      }
    }
  };

  const importBackup = async () => {
    if (!selectedFile) {
      return;
    }

    importControllerRef.current?.abort();
    const controller = new AbortController();
    importControllerRef.current = controller;
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setActiveAction('import');
    setFeedback(null);
    onClearError();

    try {
      const result = await onImport(selectedFile, controller.signal);

      if (operationTokenRef.current === token) {
        setFeedback({
          kind: result.warning ? 'warning' : 'success',
          message: result.warning ?? 'Дашборд восстановлен из резервной копии',
        });
        setSelectedFile(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        focusFrameRef.current = requestAnimationFrame(() =>
          selectFileButtonRef.current?.focus({ preventScroll: true }),
        );
      }
    } catch {
      // The state hook exposes validation and storage errors in this dialog.
    } finally {
      if (importControllerRef.current === controller) {
        importControllerRef.current = null;
      }

      if (operationTokenRef.current === token) {
        setActiveAction(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="backup-export-title" className="space-y-3">
        <div>
          <h3 id="backup-export-title" className="text-sm font-semibold">
            Экспорт
          </h3>
        </div>
        <Button
          disabled={isProcessing}
          size="small"
          variant="secondary"
          onClick={() => void exportBackup()}
        >
          {activeAction === 'export'
            ? 'Создаём копию…'
            : 'Скачать резервную копию'}
        </Button>
      </section>

      <section aria-labelledby="backup-import-title" className="space-y-3">
        <div>
          <h3 id="backup-import-title" className="text-sm font-semibold">
            Импорт
          </h3>
        </div>

        <p className="rounded-md border border-theme-danger-border bg-theme-danger-bg px-3 py-2 text-sm text-theme-danger-text">
          Импорт заменит все пространства, корзину и настройки. Отменить нельзя.
        </p>

        <input
          ref={fileInputRef}
          accept="application/json,.json"
          aria-label="Файл резервной копии"
          className="sr-only"
          disabled={isProcessing}
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedFile(file);
            setFeedback(null);
            onClearError();
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            ref={selectFileButtonRef}
            disabled={isProcessing}
            size="small"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Выбрать файл
          </Button>
          <Button
            disabled={isProcessing || !selectedFile}
            size="small"
            variant="danger"
            onClick={() => void importBackup()}
          >
            {activeAction === 'import' ? 'Импортируем…' : 'Импортировать'}
          </Button>
        </div>

        {selectedFile ? (
          <p className="break-all text-sm text-theme-text-secondary">
            {selectedFile.name}
          </p>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-theme-danger" role="alert">
          {error}
        </p>
      ) : null}

      {feedback ? (
        <p
          className={
            feedback.kind === 'warning'
              ? 'text-sm text-amber-700 dark:text-amber-300'
              : 'text-sm text-green-700 dark:text-green-300'
          }
          role="status"
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
