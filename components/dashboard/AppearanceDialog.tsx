import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Dialog, Input } from '../ui';
import { classNames } from '../ui/class-names';
import { CopyIcon, PencilIcon, TrashIcon } from '../icons';
import type { AppearanceConfig } from '../../storage/schema';
import { THEMES } from '../../themes/registry';
import type { CustomTheme, ThemeRef } from '../../themes/types';
import { LiquidGlassSettings } from './LiquidGlassSettings';
import type { AppearanceSection } from './command-catalog';

interface AppearanceDialogProps {
  appearance: AppearanceConfig;
  customThemes?: readonly CustomTheme[];
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
  onSelectTheme?: (themeRef: ThemeRef) => void;
  onOpenThemeEditor?: (themeToEdit?: CustomTheme) => void;
  onDuplicateCustomTheme?: (id: string) => void;
  onDeleteCustomTheme?: (id: string) => void;
}

const ACCEPTED_WALLPAPER_FILES =
  'image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,.svg';

export function AppearanceDialog({
  appearance,
  customThemes = [],
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
  onSelectTheme,
  onOpenThemeEditor,
  onDuplicateCustomTheme,
  onDeleteCustomTheme,
}: AppearanceDialogProps) {
  const [urlDraft, setUrlDraft] = useState('');
  const [themeToDelete, setThemeToDelete] = useState<CustomTheme | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const operationControllerRef = useRef<AbortController | null>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  const normalizedThemeRef: ThemeRef =
    typeof appearance.theme === 'string'
      ? { type: 'builtin', id: appearance.theme }
      : appearance.theme;

  const effectiveBgColor =
    typeof appearance.backgroundColor === 'string'
      ? appearance.backgroundColor
      : appearance.backgroundColor.type === 'custom'
        ? appearance.backgroundColor.color
        : (THEMES.find((t) =>
            normalizedThemeRef.type === 'builtin'
              ? t.id === normalizedThemeRef.id
              : false,
          )?.defaultBackgroundColor ?? '#18181b');

  const selectTheme = (ref: ThemeRef) => {
    if (onSelectTheme) {
      onSelectTheme(ref);
    } else {
      onAppearanceChange({
        theme: ref,
        backgroundColor: { type: 'theme' },
      });
    }
  };

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
    setThemeToDelete(null);
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
    <>
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
            <fieldset aria-label="Тема" className="space-y-4 px-4 pb-4 pt-1">
              {/* Custom Themes Sub-section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-text-secondary">
                    Собственные темы
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenThemeEditor?.()}
                    className="flex items-center gap-1 rounded-md border border-theme-border bg-theme-surface-elevated px-2.5 py-1 text-xs font-medium text-theme-accent transition-colors hover:border-theme-accent hover:bg-theme-surface"
                  >
                    <span>+</span> Добавить собственную
                  </button>
                </div>

                {customThemes.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {customThemes.map((cTheme) => {
                      const isSelected =
                        normalizedThemeRef.type === 'custom' &&
                        normalizedThemeRef.id === cTheme.id;

                      return (
                        <div
                          key={cTheme.id}
                          className={classNames(
                            'group flex flex-col justify-between gap-2 rounded-lg border p-3 text-left transition-[background-color,border-color] duration-150',
                            isSelected
                              ? 'border-theme-accent bg-theme-surface-elevated ring-1 ring-theme-accent shadow-xs'
                              : 'border-theme-border bg-theme-surface hover:border-theme-accent/50 hover:bg-theme-surface-elevated/60',
                          )}
                        >
                          <button
                            type="button"
                            aria-label={cTheme.name}
                            aria-pressed={isSelected}
                            onClick={() =>
                              selectTheme({ type: 'custom', id: cTheme.id })
                            }
                            className="flex flex-col gap-1.5 text-left outline-none"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-theme-text-primary">
                                {cTheme.name}
                              </span>
                              <span className="flex items-center rounded-full border border-theme-border px-1.5 py-0.5 text-[10px] font-medium text-theme-text-secondary">
                                {cTheme.mode === 'light' ? 'Светлая' : 'Тёмная'}
                              </span>
                            </div>
                            {cTheme.description && (
                              <p className="line-clamp-2 text-xs text-theme-text-muted">
                                {cTheme.description}
                              </p>
                            )}
                          </button>

                          <div className="mt-2 flex items-center justify-between border-t border-theme-border/60 pt-2">
                            {/* Color swatches on the left */}
                            <div className="flex items-center gap-1.5">
                              <span
                                aria-hidden="true"
                                className="size-3.5 rounded-full border border-black/20 shadow-xs"
                                style={{
                                  backgroundColor: cTheme.colors.canvasBg,
                                }}
                                title="Фон страницы"
                              />
                              <span
                                aria-hidden="true"
                                className="size-3.5 rounded-full border border-black/20 shadow-xs"
                                style={{
                                  backgroundColor: cTheme.colors.surfaceBg,
                                }}
                                title="Карточка"
                              />
                              <span
                                aria-hidden="true"
                                className="size-3.5 rounded-full border border-black/20 shadow-xs"
                                style={{
                                  backgroundColor: cTheme.colors.accent,
                                }}
                                title="Акцент"
                              />
                            </div>

                            {/* Action icons on the right */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenThemeEditor?.(cTheme);
                                }}
                                className="flex size-7 items-center justify-center rounded-md text-theme-text-secondary transition-colors hover:bg-theme-surface-elevated hover:text-theme-text-primary"
                                title="Редактировать тему"
                                aria-label={`Редактировать тему «${cTheme.name}»`}
                              >
                                <PencilIcon className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateCustomTheme?.(cTheme.id);
                                }}
                                className="flex size-7 items-center justify-center rounded-md text-theme-text-secondary transition-colors hover:bg-theme-surface-elevated hover:text-theme-text-primary"
                                title="Дублировать тему"
                                aria-label={`Дублировать тему «${cTheme.name}»`}
                              >
                                <CopyIcon className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setThemeToDelete(cTheme);
                                }}
                                className="flex size-7 items-center justify-center rounded-md text-theme-danger transition-colors hover:bg-theme-danger-bg hover:text-theme-danger"
                                title="Удалить тему"
                                aria-label={`Удалить тему «${cTheme.name}»`}
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-theme-text-muted">
                    У вас пока нет собственных тем. Нажмите «Добавить
                    собственную», чтобы создать новую.
                  </p>
                )}
              </div>

              {/* Built-in Themes Sub-section */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-theme-text-secondary">
                  Встроенные темы
                </span>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {THEMES.map((theme) => {
                    const isSelected =
                      normalizedThemeRef.type === 'builtin' &&
                      normalizedThemeRef.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        aria-label={theme.name}
                        aria-pressed={isSelected}
                        className={classNames(
                          'group flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 text-left transition-[background-color,border-color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-theme-ring',
                          isSelected
                            ? 'border-theme-accent bg-theme-surface-elevated ring-1 ring-theme-accent shadow-xs'
                            : 'border-theme-border bg-theme-surface hover:border-theme-accent/50 hover:bg-theme-surface-elevated/60',
                        )}
                        type="button"
                        onClick={() =>
                          selectTheme({ type: 'builtin', id: theme.id })
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
                            style={{
                              backgroundColor: theme.previewColors.surface,
                            }}
                            title="Карточка"
                          />
                          <span
                            aria-hidden="true"
                            className="size-4 rounded-full border border-black/20 shadow-xs"
                            style={{
                              backgroundColor: theme.previewColors.accent,
                            }}
                            title="Акцент"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
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
            <div className="flex flex-wrap items-center gap-3 px-4 pb-4 pt-1">
              <label className="sr-only" htmlFor="background-color">
                Цвет фона
              </label>
              <Input
                id="background-color"
                className="h-10 w-16 cursor-pointer p-1"
                type="color"
                value={effectiveBgColor}
                onChange={(event) =>
                  onAppearanceChange({
                    backgroundColor: {
                      type: 'custom',
                      color: event.target.value,
                    },
                  })
                }
              />
              <code className="text-sm text-theme-text-secondary">
                {effectiveBgColor}
              </code>
              {typeof appearance.backgroundColor !== 'string' &&
                appearance.backgroundColor.type === 'custom' && (
                  <button
                    type="button"
                    onClick={() =>
                      onAppearanceChange({
                        backgroundColor: { type: 'theme' },
                      })
                    }
                    className="ml-auto rounded-md border border-theme-border px-2.5 py-1 text-xs text-theme-text-secondary transition-colors hover:bg-theme-surface-elevated hover:text-theme-text-primary"
                  >
                    Сбросить на цвет темы
                  </button>
                )}
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
                onClick={() =>
                  void runWallpaperAction(() => onRemoveWallpaper())
                }
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

      {themeToDelete && (
        <Dialog
          open={Boolean(themeToDelete)}
          onOpenChange={(next) => !next && setThemeToDelete(null)}
          title="Удалить тему?"
          description={
            normalizedThemeRef.type === 'custom' &&
            normalizedThemeRef.id === themeToDelete.id
              ? `Тема «${themeToDelete.name}» сейчас активна. После удаления будет включена Системная тема.`
              : `Вы уверены, что хотите удалить тему «${themeToDelete.name}»? Это действие нельзя отменить.`
          }
        >
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setThemeToDelete(null)}>
              Отмена
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const id = themeToDelete.id;
                setThemeToDelete(null);
                onDeleteCustomTheme?.(id);
              }}
            >
              Удалить
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
