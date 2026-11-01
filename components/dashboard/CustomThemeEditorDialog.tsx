import { useCallback, useId, useMemo, useState, type ChangeEvent } from 'react';
import {
  ALL_CUSTOM_THEME_COLOR_KEYS,
  DERIVED_COLOR_KEYS,
  type BuiltinThemeId,
  type CustomTheme,
  type DerivedColorKey,
  type PrimaryColorKey,
  type ThemeMode,
} from '../../themes/types';
import {
  calculateContrastIssues,
  createCustomThemeSnapshot,
  deriveDependentColors,
  deriveSingleColor,
} from '../../themes/color-derivation';
import { isValidHex, normalizeHex } from '../../themes/color-utils';
import { THEMES } from '../../themes/registry';
import type { WidgetConfig } from '../../storage/schema';
import { EyeIcon } from '../icons';
import { Button, Dialog, Input } from '../ui';
import { classNames } from '../ui/class-names';
import { Disclosure } from '../ui/Disclosure';
import { ThemePreview } from './ThemePreview';

interface CustomThemeEditorDialogProps {
  open: boolean;
  initialTheme: CustomTheme;
  isNew: boolean;
  existingThemes: readonly CustomTheme[];
  widgets: readonly WidgetConfig[];
  onOpenChange: (open: boolean) => void;
  onExited?: () => void;
  onSave: (theme: CustomTheme) => void;
  onPreviewFullScreen: (draft: CustomTheme) => void;
}

const PRIMARY_COLOR_LABELS: Record<PrimaryColorKey, string> = {
  canvasBg: 'Фон страницы',
  surfaceBg: 'Карточка',
  textPrimary: 'Основной текст',
  textSecondary: 'Дополнительный текст',
  accent: 'Акцент',
  accentText: 'Текст кнопки',
};

const DERIVED_COLOR_LABELS: Record<DerivedColorKey, string> = {
  surfaceElevated: 'Приподнятая поверхность',
  surfaceMuted: 'Приглушённая поверхность',
  border: 'Основная граница',
  borderSubtle: 'Тонкая граница',
  textMuted: 'Приглушённый текст',
  accentHover: 'Акцент при наведении',
  ring: 'Кольцо фокуса',
  danger: 'Опасное действие',
  dangerBg: 'Фон ошибки',
  dangerHoverBg: 'Фон ошибки при наведении',
  dangerBorder: 'Граница ошибки',
  dangerText: 'Текст ошибки',
  codeBg: 'Фон блока кода',
  codeBorder: 'Граница блока кода',
  quoteBorder: 'Граница цитаты',
  link: 'Ссылка',
  linkHover: 'Ссылка при наведении',
  pomodoroTrack: 'Шкала таймера',
  pomodoroProgress: 'Прогресс таймера',
  glassBorder: 'Граница стекла',
  glassRim: 'Световая кромка стекла',
  glassShadowColor: 'Цвет тени стекла',
};

const DERIVED_GROUPS: {
  title: string;
  keys: readonly DerivedColorKey[];
}[] = [
  {
    title: 'Поверхности',
    keys: ['surfaceElevated', 'surfaceMuted'],
  },
  {
    title: 'Границы и кольцо фокуса',
    keys: ['border', 'borderSubtle', 'ring'],
  },
  {
    title: 'Приглушённый текст',
    keys: ['textMuted'],
  },
  {
    title: 'Состояния',
    keys: ['accentHover'],
  },
  {
    title: 'Опасные действия',
    keys: ['danger', 'dangerBg', 'dangerHoverBg', 'dangerBorder', 'dangerText'],
  },
  {
    title: 'Ссылки и код',
    keys: ['link', 'linkHover', 'codeBg', 'codeBorder', 'quoteBorder'],
  },
  {
    title: 'Таймер Pomodoro',
    keys: ['pomodoroTrack', 'pomodoroProgress'],
  },
  {
    title: 'Liquid Glass (Стекло)',
    keys: ['glassBorder', 'glassRim', 'glassShadowColor'],
  },
];

export function CustomThemeEditorDialog({
  open,
  initialTheme,
  isNew,
  existingThemes,
  widgets,
  onOpenChange,
  onExited,
  onSave,
  onPreviewFullScreen,
}: CustomThemeEditorDialogProps) {
  const [draft, setDraft] = useState<CustomTheme>(initialTheme);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState<BuiltinThemeId>(
    initialTheme.baseThemeId || 'system',
  );

  const hasChanges = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(initialTheme);
  }, [draft, initialTheme]);

  const contrastIssues = useMemo(() => {
    return calculateContrastIssues(draft.colors);
  }, [draft.colors]);

  const nameTrimmed = draft.name.trim();
  const nameError = useMemo(() => {
    if (!nameTrimmed) {
      return 'Название темы обязательно';
    }
    if (nameTrimmed.length > 64) {
      return 'Название не должно превышать 64 символа';
    }
    const isDuplicate = existingThemes.some(
      (t) =>
        t.id !== draft.id &&
        t.name.trim().toLowerCase() === nameTrimmed.toLowerCase(),
    );
    if (isDuplicate) {
      return 'Тема с таким названием уже существует';
    }
    return null;
  }, [nameTrimmed, draft.id, existingThemes]);

  const descriptionError = useMemo(() => {
    if (draft.description && draft.description.length > 200) {
      return 'Описание не должно превышать 200 символов';
    }
    return null;
  }, [draft.description]);

  const hasInvalidHex = useMemo(() => {
    return ALL_CUSTOM_THEME_COLOR_KEYS.some(
      (key) => !isValidHex(draft.colors[key]),
    );
  }, [draft.colors]);

  const canSave = !nameError && !descriptionError && !hasInvalidHex;

  const handleRequestClose = useCallback(() => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [hasChanges, onOpenChange]);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...draft,
      name: nameTrimmed,
      description: draft.description?.trim() || undefined,
    });
    onOpenChange(false);
  };

  const handlePrimaryColorChange = (key: PrimaryColorKey, rawHex: string) => {
    const nextColors = { ...draft.colors, [key]: rawHex };

    // If valid hex, auto-recalculate dependent colors that are not manually overridden
    if (isValidHex(rawHex)) {
      const derived = deriveDependentColors(
        {
          canvasBg: nextColors.canvasBg,
          surfaceBg: nextColors.surfaceBg,
          textPrimary: nextColors.textPrimary,
          textSecondary: nextColors.textSecondary,
          accent: nextColors.accent,
          accentText: nextColors.accentText,
        },
        draft.mode,
      );

      for (const dKey of DERIVED_COLOR_KEYS) {
        if (!draft.manualOverrides.includes(dKey)) {
          nextColors[dKey] = derived[dKey];
        }
      }
    }

    setDraft({ ...draft, colors: nextColors });
  };

  const handleDerivedColorChange = (key: DerivedColorKey, rawHex: string) => {
    const nextOverrides = draft.manualOverrides.includes(key)
      ? draft.manualOverrides
      : [...draft.manualOverrides, key];

    setDraft({
      ...draft,
      colors: { ...draft.colors, [key]: rawHex },
      manualOverrides: nextOverrides,
    });
  };

  const handleResetToAuto = (key: DerivedColorKey) => {
    const recalculated = deriveSingleColor(
      key,
      {
        canvasBg: draft.colors.canvasBg,
        surfaceBg: draft.colors.surfaceBg,
        textPrimary: draft.colors.textPrimary,
        textSecondary: draft.colors.textSecondary,
        accent: draft.colors.accent,
        accentText: draft.colors.accentText,
      },
      draft.mode,
    );

    setDraft({
      ...draft,
      colors: { ...draft.colors, [key]: recalculated },
      manualOverrides: draft.manualOverrides.filter((k) => k !== key),
    });
  };

  const handleModeChange = (nextMode: ThemeMode) => {
    setDraft({ ...draft, mode: nextMode });
  };

  const handleBasePresetChange = (baseId: BuiltinThemeId) => {
    setSelectedBaseId(baseId);
    const snapshot = createCustomThemeSnapshot(
      baseId,
      draft.mode,
      draft.name || 'Моя тема',
      draft.id,
    );
    setDraft({
      ...snapshot,
      description: draft.description,
    });
  };

  return (
    <>
      <Dialog
        open={open}
        onExited={onExited}
        size="fullscreen"
        title={isNew ? 'Создание темы' : 'Редактирование темы'}
        onOpenChange={(next) => {
          if (!next) handleRequestClose();
        }}
        returnFocusFallback={() =>
          document.querySelector<HTMLButtonElement>(
            '.dashboard-toolbar[data-open="true"] button[aria-label="Настройки"], button[aria-label="Раскрыть панель управления"]',
          )
        }
      >
        <div className="flex h-full flex-col bg-theme-surface text-theme-text-primary">
          {/* Top Header Bar */}
          <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 py-2 border-b border-theme-border bg-theme-surface px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRequestClose}
                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-theme-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-theme-ring hover:bg-theme-surface-elevated hover:text-theme-text-primary"
              >
                ‹ Назад
              </button>
              <h1 className="text-base font-semibold text-theme-text-primary">
                {isNew ? 'Создание темы' : 'Редактирование темы'}
              </h1>
              <span className="rounded-full bg-theme-surface-elevated px-2 py-0.5 text-xs text-theme-text-secondary">
                {draft.mode === 'light' ? 'Светлая' : 'Тёмная'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => onPreviewFullScreen(draft)}
                title="Показать всю страницу в реальном масштабе"
              >
                <EyeIcon className="size-4" />
                Показать всю страницу
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={handleRequestClose}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                size="small"
                disabled={!canSave}
                onClick={handleSave}
              >
                Сохранить
              </Button>
            </div>
          </header>

          {/* Editor Main Content: Left Form, Right Preview */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Column: Form */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:max-w-3xl">
              <div className="space-y-6">
                {/* Basic Info Section */}
                <section className="space-y-4 rounded-xl border border-theme-border bg-theme-surface p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-theme-text-secondary">
                    Основная информация
                  </h2>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-theme-text-secondary">
                      <label
                        htmlFor="theme-name"
                        className="font-medium text-theme-text-secondary"
                      >
                        Название темы *
                      </label>
                      <span>{draft.name.length} / 64</span>
                    </div>
                    <Input
                      id="theme-name"
                      data-dialog-initial-focus
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={
                        nameError ? 'theme-name-error' : undefined
                      }
                      value={draft.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                      placeholder="Например: Морской бриз"
                      className="w-full bg-theme-surface-elevated text-theme-text-primary"
                    />
                    {nameError && (
                      <p
                        id="theme-name-error"
                        className="text-xs text-theme-danger"
                      >
                        {nameError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-theme-text-secondary">
                      <label
                        htmlFor="theme-desc"
                        className="font-medium text-theme-text-secondary"
                      >
                        Описание (необязательно)
                      </label>
                      <span>{(draft.description ?? '').length} / 200</span>
                    </div>
                    <textarea
                      id="theme-desc"
                      aria-invalid={Boolean(descriptionError)}
                      aria-describedby={
                        descriptionError ? 'theme-description-error' : undefined
                      }
                      value={draft.description ?? ''}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                      rows={2}
                      placeholder="Краткое описание настроения или назначения темы"
                      className="w-full rounded-md border border-theme-border bg-theme-surface-elevated p-2 text-xs text-theme-text-primary outline-none focus:ring-2 focus:ring-theme-ring"
                    />
                    {descriptionError && (
                      <p
                        id="theme-description-error"
                        className="text-xs text-theme-danger"
                      >
                        {descriptionError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-theme-text-secondary">
                        Цветовой режим
                      </span>
                      <div className="inline-flex rounded-lg border border-theme-border bg-theme-surface-elevated p-0.5">
                        <button
                          type="button"
                          aria-pressed={draft.mode === 'light'}
                          onClick={() => handleModeChange('light')}
                          className={classNames(
                            'rounded-md px-3 py-1 text-xs font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-theme-ring',
                            draft.mode === 'light'
                              ? 'bg-theme-accent text-theme-accent-text shadow-xs'
                              : 'text-theme-text-secondary hover:text-theme-text-primary',
                          )}
                        >
                          Светлая
                        </button>
                        <button
                          type="button"
                          aria-pressed={draft.mode === 'dark'}
                          onClick={() => handleModeChange('dark')}
                          className={classNames(
                            'rounded-md px-3 py-1 text-xs font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-theme-ring',
                            draft.mode === 'dark'
                              ? 'bg-theme-accent text-theme-accent-text shadow-xs'
                              : 'text-theme-text-secondary hover:text-theme-text-primary',
                          )}
                        >
                          Тёмная
                        </button>
                      </div>
                    </div>

                    {isNew && (
                      <div>
                        <label
                          htmlFor="base-preset"
                          className="mb-1.5 block text-xs font-medium text-theme-text-secondary"
                        >
                          Основа для палитры
                        </label>
                        <select
                          id="base-preset"
                          value={selectedBaseId}
                          onChange={(e) =>
                            handleBasePresetChange(
                              e.target.value as BuiltinThemeId,
                            )
                          }
                          className="rounded-md border border-theme-border bg-theme-surface-elevated px-3 py-1.5 text-xs text-theme-text-primary outline-none focus:ring-2 focus:ring-theme-ring"
                        >
                          {THEMES.map((theme) => (
                            <option key={theme.id} value={theme.id}>
                              {theme.name} (
                              {theme.mode === 'system' ? 'Авто' : theme.mode})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="flex cursor-pointer items-center gap-2 pt-4 text-xs font-medium text-theme-text-secondary">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.glow)}
                          onChange={(e) =>
                            setDraft({ ...draft, glow: e.target.checked })
                          }
                          className="size-4 rounded border-theme-border bg-theme-surface-elevated accent-theme-accent focus:ring-theme-ring"
                        />
                        Неоновое свечение (SynthWave)
                      </label>
                    </div>
                  </div>
                </section>

                {/* Primary 6 Colors Section */}
                <section className="space-y-4 rounded-xl border border-theme-border bg-theme-surface p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-theme-text-secondary">
                      Основные цвета
                    </h2>
                    <span className="text-xs text-theme-text-secondary">
                      Изменение основных цветов пересчитывает зависимые оттенки
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {(
                      Object.keys(PRIMARY_COLOR_LABELS) as PrimaryColorKey[]
                    ).map((key) => (
                      <ColorField
                        key={key}
                        label={PRIMARY_COLOR_LABELS[key]}
                        value={draft.colors[key]}
                        onChange={(hex) => handlePrimaryColorChange(key, hex)}
                      />
                    ))}
                  </div>
                </section>

                {/* Collapsible Derived Colors */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-theme-text-secondary">
                    Дополнительные цвета
                  </h2>

                  {DERIVED_GROUPS.map((group) => (
                    <Disclosure key={group.title} title={group.title}>
                      <div className="grid grid-cols-1 gap-3 border-t border-theme-border p-4 sm:grid-cols-2 md:grid-cols-3">
                        {group.keys.map((key) => {
                          const isManual = draft.manualOverrides.includes(key);

                          return (
                            <div key={key} className="space-y-1">
                              <ColorField
                                label={DERIVED_COLOR_LABELS[key]}
                                value={draft.colors[key]}
                                onChange={(hex) =>
                                  handleDerivedColorChange(key, hex)
                                }
                                badge={
                                  isManual ? (
                                    <button
                                      type="button"
                                      onClick={() => handleResetToAuto(key)}
                                      className="rounded bg-theme-accent/15 px-1.5 py-0.5 text-xs font-medium text-theme-text-primary hover:bg-theme-accent/25"
                                      title="Нажмите, чтобы вернуться к автоматическому вычислению"
                                    >
                                      Вернуть авто ↺
                                    </button>
                                  ) : (
                                    <span className="rounded bg-theme-surface-elevated px-1.5 py-0.5 text-xs text-theme-text-secondary">
                                      Авто
                                    </span>
                                  )
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </Disclosure>
                  ))}
                </section>

                {/* Contrast Issues Warning Section */}
                {contrastIssues.length > 0 && (
                  <div className="rounded-xl border border-theme-border bg-theme-surface-elevated p-4 text-xs text-theme-text-secondary">
                    <div className="mb-2 font-semibold text-theme-text-primary">
                      ⚠️ Предупреждение о контрасте
                    </div>
                    <ul className="space-y-1 pl-4 list-disc">
                      {contrastIssues.map((issue) => (
                        <li key={issue.pairName}>
                          {issue.message || issue.pairName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Miniature Dashboard Preview */}
            <div className="hidden flex-1 border-l border-theme-border bg-theme-canvas p-6 lg:flex lg:flex-col">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-theme-text-secondary">
                Миниатюра дашборда
              </h2>
              <div className="flex-1 overflow-hidden">
                <ThemePreview customTheme={draft} widgets={widgets} />
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <Dialog
          open={showExitConfirm}
          onOpenChange={(next) => !next && setShowExitConfirm(false)}
          title="Несохранённые изменения"
          description="В теме есть несохранённые изменения. Сохранить их перед выходом?"
        >
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              data-dialog-initial-focus
              variant="secondary"
              onClick={() => setShowExitConfirm(false)}
            >
              Продолжить редактирование
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowExitConfirm(false);
                onOpenChange(false);
              }}
            >
              Не сохранять
            </Button>
            <Button
              variant="primary"
              disabled={!canSave}
              onClick={() => {
                setShowExitConfirm(false);
                handleSave();
              }}
            >
              Сохранить
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

function ColorField({
  label,
  value,
  onChange,
  badge,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  badge?: React.ReactNode;
}) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const isHexValid = isValidHex(value);
  const normalized = isHexValid ? normalizeHex(value) : '#000000';

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-theme-border bg-theme-surface-elevated p-2.5">
      <div className="flex items-center justify-between text-xs">
        <label
          htmlFor={fieldId}
          className="font-medium text-theme-text-secondary"
        >
          {label}
        </label>
        {badge}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Выбрать цвет для «${label}»`}
          value={normalized}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 cursor-pointer rounded border border-theme-border bg-transparent p-0.5"
          title={`Выбрать цвет для «${label}»`}
        />
        <input
          type="text"
          id={fieldId}
          aria-invalid={!isHexValid}
          aria-describedby={!isHexValid ? errorId : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={classNames(
            'flex-1 rounded border px-2 py-1 font-mono text-xs text-theme-text-primary outline-none focus:ring-1 focus:ring-theme-ring',
            isHexValid
              ? 'border-theme-border bg-theme-surface'
              : 'border-theme-danger-border bg-theme-danger-bg text-theme-danger-text',
          )}
          placeholder="#RRGGBB"
        />
      </div>
      {!isHexValid && (
        <span id={errorId} className="text-xs text-theme-danger">
          Формат #RRGGBB
        </span>
      )}
    </div>
  );
}
