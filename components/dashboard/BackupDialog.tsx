import { useEffect, useRef, useState } from 'react';

import type {
  DashboardBackupDownload,
  DashboardImportResult,
} from '../../storage/dashboard-backup';
import { Button, Dialog } from '../ui';

interface BackupDialogProps {
  error: string | null;
  isProcessing: boolean;
  open: boolean;
  onClearError: () => void;
  onExport: () => Promise<DashboardBackupDownload>;
  onImport: (
    file: File,
    signal?: AbortSignal,
  ) => Promise<DashboardImportResult>;
  onOpenChange: (open: boolean) => void;
}

type ActiveAction = 'export' | 'import' | null;

interface Feedback {
  kind: 'success' | 'warning';
  message: string;
}

function downloadBackup({ fileName, contents }: DashboardBackupDownload) {
  const objectUrl = URL.createObjectURL(
    new Blob([contents], { type: 'application/json' }),
  );
  const link = document.createElement('a');

  link.download = fileName;
  link.href = objectUrl;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function BackupDialog({
  error,
  isProcessing,
  open,
  onClearError,
  onExport,
  onImport,
  onOpenChange,
}: BackupDialogProps) {
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importControllerRef = useRef<AbortController | null>(null);
  const operationTokenRef = useRef(0);

  useEffect(() => {
    if (!open) {
      importControllerRef.current?.abort();
      importControllerRef.current = null;
    }

    return () => importControllerRef.current?.abort();
  }, [open]);

  const closeDialog = () => {
    operationTokenRef.current += 1;
    importControllerRef.current?.abort();
    importControllerRef.current = null;
    setActiveAction(null);
    setFeedback(null);
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    onOpenChange(false);
  };

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
    <Dialog
      description="Скачайте полную копию или восстановите дашборд из ранее сохранённого файла."
      open={open}
      title="Импорт и экспорт"
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : closeDialog()
      }
    >
      <div className="space-y-6">
        <section aria-labelledby="backup-export-title" className="space-y-3">
          <div>
            <h3 id="backup-export-title" className="text-sm font-semibold">
              Экспорт
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              В JSON-файл попадут виджеты, оформление и локальные обои. Обои по
              HTTPS сохраняются как ссылка.
            </p>
          </div>
          <Button
            data-dialog-initial-focus
            disabled={isProcessing}
            variant="secondary"
            onClick={() => void exportBackup()}
          >
            {activeAction === 'export'
              ? 'Создаём копию…'
              : 'Скачать резервную копию'}
          </Button>
        </section>

        <section
          aria-labelledby="backup-import-title"
          className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-700"
        >
          <div>
            <h3 id="backup-import-title" className="text-sm font-semibold">
              Импорт
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Выберите JSON-файл, созданный Chrome Start Page.
            </p>
          </div>

          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Текущие виджеты и оформление будут полностью заменены. Отменить
            импорт после сохранения нельзя.
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
            <p className="break-all text-sm text-zinc-600 dark:text-zinc-400">
              Выбран файл: {selectedFile.name}
            </p>
          ) : null}
        </section>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
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
    </Dialog>
  );
}
