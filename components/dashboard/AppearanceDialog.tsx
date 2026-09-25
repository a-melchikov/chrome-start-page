import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Dialog, Input } from '../ui';
import { classNames } from '../ui/class-names';
import type { AppearanceConfig } from '../../storage/schema';
import { THEMES } from '../../themes/registry';
import { LiquidGlassSettings } from './LiquidGlassSettings';
import type { AppearanceSection } from './command-catalog';

interface AppearanceDialogProps {
  appearance: AppearanceConfig;
  requestedSection?: { section: AppearanceSection; token: number } | null;
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

export function AppearanceDialog({
  appearance,
  requestedSection,
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
    if (!open || !requestedSection) return;
    const section = sectionsRef.current?.querySelector<HTMLDetailsElement>(
      `details[data-appearance-section="${requestedSection.section}"]`,
    );
    if (!section) return;
    section.open = true;
    section.querySelector('summary')?.focus();
  }, [open, requestedSection]);

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
        <details
          data-appearance-section="theme"
          className="group rounded-lg border border-theme-border bg-theme-surface"
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring"
            data-dialog-initial-focus
          >
            Тема
            <span
              aria-hidden="true"
              className="text-lg leading-none text-theme-text-secondary transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <fieldset aria-label="Тема" className="px-4 pb-4 pt-1">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {THEMES.map((theme) => {
                const isSelected = appearance.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    aria-label={theme.name}
                    aria-pressed={isSelected}
                    className={classNames(
                      'group flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-theme-ring',
                      isSelected
                        ? 'border-theme-accent bg-theme-surface-elevated ring-1 ring-theme-accent shadow-xs'
                        : 'border-theme-border bg-theme-surface hover:border-theme-accent/50 hover:bg-theme-surface-elevated/60',
                    )}
                    type="button"
                    onClick={() =>
                      onAppearanceChange({
                        theme: theme.id,
                        backgroundColor: theme.defaultBackgroundColor,
                      })
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-theme-text-primary">
                        {theme.name}
                      </span>
                      <span className="flex items-center rounded-full border border-theme-border px-1.5 py-0.5 text-[10px] font-medium text-theme-text-secondary">
                        {theme.mode === 'system'
                          ? 'Авто'
                          : theme.mode === 'light'
                            ? 'Светлая'
                            : 'Тёмная'}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-theme-text-muted">
                      {theme.description}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="size-4 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: theme.previewColors.bg }}
                        title="Фон"
                      />
                      <span
                        aria-hidden="true"
                        className="size-4 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: theme.previewColors.surface }}
                        title="Карточка"
                      />
                      <span
                        aria-hidden="true"
                        className="size-4 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: theme.previewColors.accent }}
                        title="Акцент"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </details>

        <details
          data-appearance-section="background"
          className="group rounded-lg border border-theme-border bg-theme-surface"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring">
            Цвет фона
            <span
              aria-hidden="true"
              className="text-lg leading-none text-theme-text-secondary transition-transform group-open:rotate-90"
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
            <code className="text-sm text-theme-text-secondary">
              {appearance.backgroundColor}
            </code>
          </div>
        </details>

        <details
          data-appearance-section="wallpaper"
          className="group rounded-lg border border-theme-border bg-theme-surface"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring">
            Обои
            <span
              aria-hidden="true"
              className="text-lg leading-none text-theme-text-secondary transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <div className="space-y-4 px-4 pb-4 pt-1">
            <p className="text-sm text-theme-text-secondary">
              Изображение заполнит весь экран; края могут быть обрезаны.
            </p>

            {wallpaperPreviewSrc ? (
              <div className="overflow-hidden rounded-lg border border-theme-border bg-theme-surface-muted">
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

            <details className="group/local rounded-md border border-theme-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring">
                Локальное изображение
                <span
                  aria-hidden="true"
                  className="text-lg leading-none text-theme-text-secondary transition-transform group-open/local:rotate-90"
                >
                  ›
                </span>
              </summary>
              <div className="space-y-3 px-3 pb-3 pt-1">
                {appearance.wallpaper.type === 'local' ? (
                  <p className="text-sm text-theme-text-secondary">
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
                <p className="text-xs text-theme-text-muted">
                  PNG, JPEG, WebP, GIF, AVIF или SVG. Файлы больше 6 МБ будут
                  сжаты без потери качества, если это возможно.
                </p>
              </div>
            </details>

            <details className="group/url rounded-md border border-theme-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring">
                По ссылке
                <span
                  aria-hidden="true"
                  className="text-lg leading-none text-theme-text-secondary transition-transform group-open/url:rotate-90"
                >
                  ›
                </span>
              </summary>
              <form className="space-y-2 px-3 pb-3 pt-1" onSubmit={submitUrl}>
                {appearance.wallpaper.type === 'url' ? (
                  <p className="text-sm text-theme-text-secondary">
                    Обои установлены по ссылке
                  </p>
                ) : null}
                <label
                  className="block text-sm font-medium text-theme-text-primary"
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
                className="text-sm text-theme-text-secondary"
              >
                Проверяем изображение…
              </p>
            ) : null}

            {wallpaperError ? (
              <p className="text-sm text-theme-danger" role="alert">
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

        <details
          data-appearance-section="widgets"
          className="group rounded-lg border border-theme-border bg-theme-surface"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-theme-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring">
            Виджеты
            <span
              aria-hidden="true"
              className="text-lg leading-none text-theme-text-secondary transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <div className="space-y-5 px-4 pb-4 pt-1">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span className="text-sm font-medium text-theme-text-primary">
                Эффект Liquid Glass
              </span>
              <input
                aria-label="Эффект Liquid Glass"
                checked={appearance.liquidGlass.enabled}
                className="size-5 accent-theme-accent"
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
