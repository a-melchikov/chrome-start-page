import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Dialog, Input } from '../ui';
import type { AppearanceConfig, Theme } from '../../storage/schema';

interface AppearanceDialogProps {
  appearance: AppearanceConfig;
  isWallpaperUpdating: boolean;
  open: boolean;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onClearWallpaperError: () => void;
  onRemoveWallpaper: () => Promise<void>;
  onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
}

const ACCEPTED_WALLPAPER_FILES =
  'image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,.svg';

const themeOptions: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: 'Системная' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export function AppearanceDialog({
  appearance,
  isWallpaperUpdating,
  open,
  wallpaperError,
  wallpaperPreviewSrc,
  onOpenChange,
  onAppearanceChange,
  onClearWallpaperError,
  onRemoveWallpaper,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
}: AppearanceDialogProps) {
  const [urlDraft, setUrlDraft] = useState('');
  const operationControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      operationControllerRef.current?.abort();
      operationControllerRef.current = null;
    }

    return () => operationControllerRef.current?.abort();
  }, [open]);

  const closeDialog = () => {
    operationControllerRef.current?.abort();
    operationControllerRef.current = null;
    onOpenChange(false);
  };

  const runWallpaperAction = async (
    action: (signal: AbortSignal) => Promise<void>,
  ) => {
    operationControllerRef.current?.abort();
    const controller = new AbortController();
    operationControllerRef.current = controller;
    onClearWallpaperError();

    try {
      await action(controller.signal);
    } catch {
      // The state hook exposes validation and storage errors in the dialog.
    } finally {
      if (operationControllerRef.current === controller) {
        operationControllerRef.current = null;
      }
    }
  };

  const submitUrl = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = urlDraft.trim();

    if (!url) {
      return;
    }

    void runWallpaperAction((signal) => onSetUrlWallpaper(url, signal));
  };

  return (
    <Dialog
      description="Настройте тему, цвет фона и обои новой вкладки."
      open={open}
      title="Оформление"
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : closeDialog()
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Тема</legend>
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((option) => (
              <Button
                key={option.value}
                aria-pressed={appearance.theme === option.value}
                data-dialog-initial-focus={
                  appearance.theme === option.value ? true : undefined
                }
                size="small"
                variant={
                  appearance.theme === option.value ? 'primary' : 'secondary'
                }
                onClick={() => onAppearanceChange({ theme: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="background-color"
          >
            Цвет фона
          </label>
          <div className="flex items-center gap-3">
            <Input
              id="background-color"
              className="h-10 w-16 cursor-pointer p-1"
              type="color"
              value={appearance.backgroundColor}
              onChange={(event) =>
                onAppearanceChange({ backgroundColor: event.target.value })
              }
            />
            <code className="text-sm text-zinc-600 dark:text-zinc-400">
              {appearance.backgroundColor}
            </code>
          </div>
        </div>

        <section aria-labelledby="wallpaper-heading" className="space-y-4">
          <div>
            <h3 id="wallpaper-heading" className="text-sm font-medium">
              Обои
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Изображение заполнит весь экран; края могут быть обрезаны.
            </p>
          </div>

          {wallpaperPreviewSrc ? (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
              <img
                aria-hidden="true"
                alt=""
                className="aspect-video w-full object-cover object-center"
                data-testid="wallpaper-preview"
                draggable={false}
                referrerPolicy="no-referrer"
                src={wallpaperPreviewSrc}
              />
            </div>
          ) : null}

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="wallpaper-file"
            >
              Локальное изображение
            </label>
            <Input
              accept={ACCEPTED_WALLPAPER_FILES}
              disabled={isWallpaperUpdating}
              id="wallpaper-file"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';

                if (file) {
                  void runWallpaperAction((signal) =>
                    onSetLocalWallpaper(file, signal),
                  );
                }
              }}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              PNG, JPEG, WebP, GIF, AVIF или SVG. Файлы больше 6 МБ будут сжаты
              без потери качества, если это возможно.
            </p>
          </div>

          <form className="space-y-2" onSubmit={submitUrl}>
            <label
              className="block text-sm font-medium"
              htmlFor="wallpaper-url"
            >
              Ссылка на изображение
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                disabled={isWallpaperUpdating}
                id="wallpaper-url"
                inputMode="url"
                placeholder="https://example.com/wallpaper.jpg"
                type="url"
                value={urlDraft}
                onChange={(event) => setUrlDraft(event.target.value)}
              />
              <Button
                className="shrink-0"
                disabled={isWallpaperUpdating || !urlDraft.trim()}
                size="small"
                type="submit"
                variant="secondary"
              >
                Установить по ссылке
              </Button>
            </div>
          </form>

          {isWallpaperUpdating ? (
            <p
              aria-live="polite"
              className="text-sm text-zinc-600 dark:text-zinc-400"
            >
              Проверяем изображение…
            </p>
          ) : null}

          {wallpaperError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {wallpaperError}
            </p>
          ) : null}

          <Button
            disabled={
              isWallpaperUpdating || appearance.wallpaper.type === 'none'
            }
            size="small"
            variant="danger-ghost"
            onClick={() => void runWallpaperAction(() => onRemoveWallpaper())}
          >
            Удалить обои
          </Button>
        </section>
      </div>
    </Dialog>
  );
}
