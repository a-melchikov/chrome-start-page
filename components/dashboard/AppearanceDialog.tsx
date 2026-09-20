import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Dialog, Input } from '../ui';
import type { AppearanceConfig, Theme } from '../../storage/schema';
import { LiquidGlassSettings } from './LiquidGlassSettings';

interface AppearanceDialogProps {
  appearance: AppearanceConfig;
  isWallpaperUpdating: boolean;
  open: boolean;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onAppearancePreview: (changes: Partial<AppearanceConfig>) => void;
  onClearWallpaperError: () => void;
  onFlushAppearancePreview: () => void;
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
  onAppearancePreview,
  onClearWallpaperError,
  onFlushAppearancePreview,
  onRemoveWallpaper,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
}: AppearanceDialogProps) {
  const [urlDraft, setUrlDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const operationControllerRef = useRef<AbortController | null>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      operationControllerRef.current?.abort();
      operationControllerRef.current = null;
      sectionsRef.current
        ?.querySelectorAll('details')
        .forEach((section) => (section.open = false));
    }

    return () => operationControllerRef.current?.abort();
  }, [open]);

  const closeDialog = () => {
    operationControllerRef.current?.abort();
    operationControllerRef.current = null;
    sectionsRef.current
      ?.querySelectorAll('details')
      .forEach((section) => (section.open = false));
    onFlushAppearancePreview();
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
      description="Настройте тему, фон, обои и оформление виджетов новой вкладки."
      open={open}
      title="Оформление"
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : closeDialog()
      }
    >
      <div ref={sectionsRef} className="space-y-3">
        <details className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500"
            data-dialog-initial-focus
          >
            Тема
            <span
              aria-hidden="true"
              className="text-lg leading-none text-zinc-500 transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <fieldset aria-label="Тема" className="px-4 pb-4 pt-1">
            <div className="flex flex-wrap gap-2">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  aria-pressed={appearance.theme === option.value}
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
        </details>

        <details className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500">
            Цвет фона
            <span
              aria-hidden="true"
              className="text-lg leading-none text-zinc-500 transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <div className="flex items-center gap-3 px-4 pb-4 pt-1">
            <label className="sr-only" htmlFor="background-color">
              Цвет фона
            </label>
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
        </details>

        <details className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500">
            Обои
            <span
              aria-hidden="true"
              className="text-lg leading-none text-zinc-500 transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <div className="space-y-4 px-4 pb-4 pt-1">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Изображение заполнит весь экран; края могут быть обрезаны.
            </p>

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

            <details className="group/local rounded-md border border-zinc-200 dark:border-zinc-700">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500">
                Локальное изображение
                <span
                  aria-hidden="true"
                  className="text-lg leading-none text-zinc-500 transition-transform group-open/local:rotate-90"
                >
                  ›
                </span>
              </summary>
              <div className="space-y-3 px-3 pb-3 pt-1">
                {appearance.wallpaper.type === 'local' ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Локальные обои установлены
                  </p>
                ) : null}
                <input
                  ref={fileInputRef}
                  accept={ACCEPTED_WALLPAPER_FILES}
                  aria-label="Локальное изображение"
                  className="sr-only"
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
                <Button
                  disabled={isWallpaperUpdating}
                  size="small"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {appearance.wallpaper.type === 'local'
                    ? 'Заменить файл'
                    : 'Выбрать файл'}
                </Button>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  PNG, JPEG, WebP, GIF, AVIF или SVG. Файлы больше 6 МБ будут
                  сжаты без потери качества, если это возможно.
                </p>
              </div>
            </details>

            <details className="group/url rounded-md border border-zinc-200 dark:border-zinc-700">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500">
                По ссылке
                <span
                  aria-hidden="true"
                  className="text-lg leading-none text-zinc-500 transition-transform group-open/url:rotate-90"
                >
                  ›
                </span>
              </summary>
              <form className="space-y-2 px-3 pb-3 pt-1" onSubmit={submitUrl}>
                {appearance.wallpaper.type === 'url' ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Обои установлены по ссылке
                  </p>
                ) : null}
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
            </details>

            {isWallpaperUpdating ? (
              <p
                aria-live="polite"
                className="text-sm text-zinc-600 dark:text-zinc-400"
              >
                Проверяем изображение…
              </p>
            ) : null}

            {wallpaperError ? (
              <p
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {wallpaperError}
              </p>
            ) : null}

            <Button
              disabled={
                isWallpaperUpdating || appearance.wallpaper.type === 'none'
              }
              size="small"
              variant="danger"
              onClick={() => void runWallpaperAction(() => onRemoveWallpaper())}
            >
              Удалить обои
            </Button>
          </div>
        </details>

        <details className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500">
            Виджеты
            <span
              aria-hidden="true"
              className="text-lg leading-none text-zinc-500 transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <div className="space-y-5 px-4 pb-4 pt-1">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span className="text-sm font-medium">Эффект Liquid Glass</span>
              <input
                aria-label="Эффект Liquid Glass"
                checked={appearance.liquidGlass.enabled}
                className="size-5 accent-zinc-900 dark:accent-zinc-100"
                role="switch"
                type="checkbox"
                onChange={(event) =>
                  onAppearanceChange({
                    liquidGlass: {
                      ...appearance.liquidGlass,
                      enabled: event.target.checked,
                    },
                  })
                }
              />
            </label>
            <LiquidGlassSettings
              settings={appearance.liquidGlass}
              onChange={(liquidGlass) => onAppearancePreview({ liquidGlass })}
              onCommit={onFlushAppearancePreview}
              onReset={(liquidGlass) => onAppearanceChange({ liquidGlass })}
            />
          </div>
        </details>
      </div>
    </Dialog>
  );
}
