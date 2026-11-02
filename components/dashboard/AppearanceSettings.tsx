import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Button, Dialog, Input } from '../ui';
import { classNames } from '../ui/class-names';
import { CopyIcon, PencilIcon, TrashIcon } from '../icons';
import {
  isWallpaperEnabled,
  type AppearanceConfig,
} from '../../storage/schema';
import {
  DEFAULT_WIDGET_BORDER_RADIUS,
  MAX_WIDGET_BORDER_RADIUS,
} from '../../storage/defaults';
import { THEMES } from '../../themes/registry';
import type { CustomTheme, ThemeRef } from '../../themes/types';
import { SettingsBlock } from './SettingsBlock';
import { useSettingsPanelState } from './settings-panel-state';
import { RangeField } from '../ui/RangeField';
import {
  DEFAULT_GRID_GAP,
  DEFAULT_GRID_PADDING,
  MAX_GRID_GAP,
  MAX_GRID_PADDING,
} from '../../storage/defaults';
import { LiquidGlassSettings } from './LiquidGlassSettings';
import type { AppearanceSection } from './command-catalog';

interface AppearanceSettingsProps {
  appearance: AppearanceConfig;
  requestedThemeEditor?: string;
  customThemes?: readonly CustomTheme[];
  requestedSection?: { section: AppearanceSection; token: number } | null;
  isWallpaperUpdating: boolean;
  wallpaperError: string | null;
  wallpaperPreviewSrc: string | null;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
  onAppearancePreview: (changes: Partial<AppearanceConfig>) => void;
  onClearWallpaperError: () => void;
  onFlushAppearancePreview: () => void;
  onRemoveWallpaper: () => Promise<void>;
  onSetWallpaperEnabled: (enabled: boolean) => Promise<void>;
  onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
  onSelectTheme?: (themeRef: ThemeRef) => void;
  onOpenThemeEditor?: (themeToEdit?: CustomTheme) => void;
  onDuplicateCustomTheme?: (id: string) => void;
  onDeleteCustomTheme?: (id: string) => void;
}

const ACCEPTED_WALLPAPER_FILES =
  'image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,.svg';

export function AppearanceSettings({
  appearance,
  requestedThemeEditor,
  customThemes = [],
  requestedSection,
  isWallpaperUpdating,
  wallpaperError,
  wallpaperPreviewSrc,
  onAppearanceChange,
  onAppearancePreview,
  onClearWallpaperError,
  onFlushAppearancePreview,
  onRemoveWallpaper,
  onSetWallpaperEnabled,
  onSetLocalWallpaper,
  onSetUrlWallpaper,
  onSelectTheme,
  onOpenThemeEditor,
  onDuplicateCustomTheme,
  onDeleteCustomTheme,
}: AppearanceSettingsProps) {
  const setBlocksOpen = useSettingsPanelState()?.setBlocksOpen;
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
    if (!requestedSection) return;
    const requested = requestedSection.section;
    if (requested === 'theme')
      setBlocksOpen?.(['appearance.theme', 'appearance.themeGallery'], true);
    else if (requested === 'background' || requested === 'wallpaper')
      setBlocksOpen?.(
        ['appearance.background', 'appearance.wallpaperUrl'],
        true,
      );
    else if (requested === 'widgets')
      setBlocksOpen?.(['appearance.widgets', 'appearance.glass'], true);
    const section = sectionsRef.current?.querySelector<HTMLElement>(
      `[data-appearance-section="${requestedSection.section}"]`,
    );
    if (!section) return;
    const frame = requestAnimationFrame(() => {
      const target =
        [...section.querySelectorAll<HTMLElement>('[data-theme-editor]')].find(
          (element) => element.dataset.themeEditor === requestedThemeEditor,
        ) ?? section.querySelector<HTMLElement>('button, input');
      section.scrollIntoView?.({ block: 'nearest' });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedSection, requestedThemeEditor, setBlocksOpen]);

  useEffect(
    () => () => {
      operationControllerRef.current?.abort();
    },
    [],
  );

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
      <div ref={sectionsRef} className="space-y-5">
        <SettingsBlock
          blockId="appearance.theme"
          title="Тема"
          data-appearance-section="theme"
        >
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-theme-border"
              style={{ backgroundColor: effectiveBgColor }}
            >
              <div className="h-8 w-12 rounded border border-theme-border bg-theme-surface p-1.5">
                <div className="h-1 w-6 rounded bg-theme-accent" />
                <div className="mt-1.5 h-1 w-8 rounded bg-theme-text-secondary" />
              </div>
            </div>
            <span className="text-sm font-medium">
              {normalizedThemeRef.type === 'builtin'
                ? THEMES.find((theme) => theme.id === normalizedThemeRef.id)
                    ?.name
                : customThemes.find(
                    (theme) => theme.id === normalizedThemeRef.id,
                  )?.name}
            </span>
          </div>
          <SettingsBlock blockId="appearance.themeGallery" title="Выбрать тему">
            <fieldset aria-label="Тема" className="space-y-4 ">
              {/* Built-in Themes Sub-section */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-theme-text-secondary">
                  Встроенные темы
                </span>
                <div className="grid grid-cols-2 gap-2">
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

                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="size-4 rounded-full border border-black/20 shadow-xs"
                            style={{
                              backgroundColor: theme.previewColors.bg,
                            }}
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
              {/* Custom Themes Sub-section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-theme-text-secondary">
                    Собственные темы
                  </span>
                  <button
                    type="button"
                    data-theme-editor="create"
                    onClick={() => onOpenThemeEditor?.()}
                    className="flex items-center gap-1 rounded-md border border-theme-border bg-theme-surface-elevated px-2.5 py-1 text-xs font-medium text-theme-accent transition-colors hover:border-theme-accent hover:bg-theme-surface"
                  >
                    <span>+</span> Добавить собственную
                  </button>
                </div>

                {customThemes.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
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
                            className="flex flex-col gap-1.5 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
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
                              <p className="line-clamp-2 text-xs text-theme-text-secondary">
                                {cTheme.description}
                              </p>
                            )}
                          </button>

                          <div className="mt-auto flex items-center justify-between pt-1">
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
                                data-theme-editor={cTheme.id}
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
                ) : null}
              </div>
            </fieldset>
          </SettingsBlock>
        </SettingsBlock>
        <SettingsBlock
          blockId="appearance.background"
          title="Фон"
          contentClassName="space-y-4"
          data-appearance-section="background"
        >
          <label
            className="block text-xs text-theme-text-secondary"
            htmlFor="background-color"
          >
            Цвет фона
          </label>
          <div className="flex flex-wrap items-center gap-3 ">
            <Input
              id="background-color"
              style={{ width: 64 }}
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
                  Использовать цвет темы
                </button>
              )}
          </div>
          <div data-appearance-section="wallpaper">
            <div className="space-y-4 ">
              {appearance.wallpaper.type !== 'none' ? (
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span className="text-sm font-medium text-theme-text-primary">
                    Показывать обои
                  </span>
                  <input
                    aria-label="Показывать обои"
                    checked={isWallpaperEnabled(appearance.wallpaper)}
                    className="size-5 accent-theme-accent"
                    disabled={isWallpaperUpdating}
                    role="switch"
                    type="checkbox"
                    onChange={(event) =>
                      void runWallpaperAction(() =>
                        onSetWallpaperEnabled(event.target.checked),
                      )
                    }
                  />
                </label>
              ) : null}

              {wallpaperPreviewSrc ? (
                <div
                  className={classNames(
                    'relative overflow-hidden rounded-lg border border-theme-border bg-theme-surface-muted',
                    !isWallpaperEnabled(appearance.wallpaper) && 'opacity-60',
                  )}
                >
                  <img
                    aria-hidden="true"
                    alt=""
                    className="aspect-video w-full object-cover object-center"
                    data-testid="wallpaper-preview"
                    draggable={false}
                    referrerPolicy="no-referrer"
                    src={wallpaperPreviewSrc}
                  />
                  {!isWallpaperEnabled(appearance.wallpaper) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-theme-surface/40 backdrop-blur-xs">
                      <span className="rounded-md border border-theme-border bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-text-secondary shadow-sm">
                        Отключено
                      </span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <div className="space-y-3">
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
                </div>
              </div>

              <SettingsBlock
                blockId="appearance.wallpaperUrl"
                title="Использовать ссылку"
              >
                <form className="space-y-2 px-3 pb-3 pt-1" onSubmit={submitUrl}>
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
              </SettingsBlock>

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

              {appearance.wallpaper.type !== 'none' && (
                <Button
                  disabled={isWallpaperUpdating}
                  size="small"
                  variant="danger"
                  onClick={() =>
                    void runWallpaperAction(() => onRemoveWallpaper())
                  }
                >
                  Удалить обои
                </Button>
              )}
            </div>
          </div>
        </SettingsBlock>
        <SettingsBlock
          blockId="appearance.grid"
          title="Сетка"
          contentClassName="space-y-4"
          data-appearance-section="grid"
        >
          <div className="space-y-4">
            <RangeField
              label="Расстояние между виджетами"
              value={appearance.gridGap ?? DEFAULT_GRID_GAP}
              min={0}
              max={MAX_GRID_GAP}
              onChange={(gridGap) => onAppearancePreview({ gridGap })}
              onCommit={onFlushAppearancePreview}
            />
            <RangeField
              label="Отступ от краёв страницы"
              value={appearance.gridPadding ?? DEFAULT_GRID_PADDING}
              min={0}
              max={MAX_GRID_PADDING}
              onChange={(gridPadding) => onAppearancePreview({ gridPadding })}
              onCommit={onFlushAppearancePreview}
            />
            <Button
              size="small"
              variant="ghost"
              onClick={() =>
                onAppearanceChange({
                  gridGap: DEFAULT_GRID_GAP,
                  gridPadding: DEFAULT_GRID_PADDING,
                })
              }
            >
              Вернуть стандартные отступы
            </Button>
          </div>
        </SettingsBlock>
        <SettingsBlock
          blockId="appearance.widgets"
          title="Карточки"
          contentClassName="space-y-4"
          data-appearance-section="widgets"
        >
          <div className="space-y-5 ">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="font-medium" htmlFor="widget-border-radius">
                  Скругление углов
                </label>
                <output
                  className="min-w-12 text-right font-mono text-xs tabular-nums text-theme-text-secondary"
                  htmlFor="widget-border-radius"
                >
                  {appearance.widgetBorderRadius ??
                    DEFAULT_WIDGET_BORDER_RADIUS}{' '}
                  px
                </output>
              </div>
              <input
                className="block h-5 w-full cursor-pointer accent-theme-accent"
                id="widget-border-radius"
                max={MAX_WIDGET_BORDER_RADIUS}
                min="0"
                step="1"
                type="range"
                value={
                  appearance.widgetBorderRadius ?? DEFAULT_WIDGET_BORDER_RADIUS
                }
                onBlur={onFlushAppearancePreview}
                onChange={(event) =>
                  onAppearancePreview({
                    widgetBorderRadius: Number(event.target.value),
                  })
                }
                onKeyUp={onFlushAppearancePreview}
                onPointerUp={onFlushAppearancePreview}
              />
              <Button
                disabled={
                  (appearance.widgetBorderRadius ??
                    DEFAULT_WIDGET_BORDER_RADIUS) ===
                  DEFAULT_WIDGET_BORDER_RADIUS
                }
                size="small"
                variant="secondary"
                onClick={() =>
                  onAppearanceChange({
                    widgetBorderRadius: DEFAULT_WIDGET_BORDER_RADIUS,
                  })
                }
              >
                Сбросить скругление
              </Button>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <span className="text-sm font-medium text-theme-text-primary">
                Эффект стекла
              </span>
              <input
                aria-label="Эффект стекла"
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
            {appearance.liquidGlass.enabled && (
              <SettingsBlock
                blockId="appearance.glass"
                title="Настроить эффект"
              >
                <LiquidGlassSettings
                  settings={appearance.liquidGlass}
                  onChange={(liquidGlass) =>
                    onAppearancePreview({ liquidGlass })
                  }
                  onCommit={onFlushAppearancePreview}
                  onReset={(liquidGlass) => onAppearanceChange({ liquidGlass })}
                />
              </SettingsBlock>
            )}
          </div>
        </SettingsBlock>
      </div>

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
