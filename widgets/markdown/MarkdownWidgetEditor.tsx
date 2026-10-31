import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import {
  ChevronDownIcon,
  SlidersIcon,
  TextSizeIcon,
} from '../../components/icons';
import { Button, Input, Select, Textarea } from '../../components/ui';
import { Popover } from '../../components/ui/Popover';
import { classNames } from '../../components/ui/class-names';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MARKDOWN_TEMPLATES, isMarkdownTemplateId } from './templates';
import {
  applyTextSize,
  canApplyTextSize,
  type TextSizeOption,
} from './text-size';
import type { MarkdownWidgetConfig } from './types';

interface MarkdownWidgetEditorProps {
  config: MarkdownWidgetConfig;
  onChange: (config: MarkdownWidgetConfig) => void;
  onRequestFinish: () => void;
}

const MIN_PANEL_PERCENT = 30;
const MAX_PANEL_PERCENT = 70;
const KEYBOARD_STEP_PERCENT = 5;

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

function SettingToggle({
  label,
  description,
  checked,
  onToggle,
}: SettingToggleProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <Button
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      className="!h-auto w-full !justify-between gap-4 rounded-lg !px-2 !py-3 text-left"
      role="switch"
      size="small"
      variant="ghost"
      onClick={onToggle}
    >
      <span className="min-w-0">
        <span id={labelId} className="block font-medium">
          {label}
        </span>
        <span
          id={descriptionId}
          className="mt-0.5 block text-xs leading-4 font-normal text-theme-text-secondary"
        >
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={classNames(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          checked
            ? 'border-theme-accent bg-theme-accent'
            : 'border-theme-border bg-theme-surface-muted',
        )}
      >
        <span
          className={classNames(
            'absolute left-0.5 top-0.5 size-3.5 rounded-full transition-transform',
            checked
              ? 'translate-x-4 bg-theme-accent-text'
              : 'translate-x-0 bg-theme-text-primary',
          )}
        />
      </span>
    </Button>
  );
}

function clampSplit(value: number): number {
  return Math.min(MAX_PANEL_PERCENT, Math.max(MIN_PANEL_PERCENT, value));
}

export function MarkdownWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: MarkdownWidgetEditorProps) {
  const contentId = useId();
  const titleId = useId();
  const templateSelectId = useId();
  const settingsId = useId();
  const sizeMenuId = useId();
  const settingsRootRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const sizeRootRef = useRef<HTMLDivElement>(null);
  const sizeButtonRef = useRef<HTMLButtonElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDraggingRef = useRef(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const [sizeNotice, setSizeNotice] = useState<string | null>(null);
  const sizeNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSettingsOpen && !isSizeMenuOpen) return;

    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      const root = settingsRootRef.current;
      if (isSettingsOpen && !root?.contains(event.target)) {
        if (root?.contains(document.activeElement)) {
          settingsButtonRef.current?.focus({ preventScroll: true });
        }
        setIsSettingsOpen(false);
      }
      const sizeRoot = sizeRootRef.current;
      if (isSizeMenuOpen && !sizeRoot?.contains(event.target)) {
        if (sizeRoot?.contains(document.activeElement)) {
          sizeButtonRef.current?.focus({ preventScroll: true });
        }
        setIsSizeMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', closeOnOutsidePointer);
    return () =>
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isSettingsOpen, isSizeMenuOpen]);

  useEffect(() => {
    const move = (event: globalThis.PointerEvent) => {
      const container = splitContainerRef.current;

      if (!isDraggingRef.current || !container) {
        return;
      }

      const bounds = container.getBoundingClientRect();

      if (bounds.width === 0) {
        return;
      }

      setSplitPercent(
        clampSplit(((event.clientX - bounds.left) / bounds.width) * 100),
      );
    };
    const finishDragging = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finishDragging);
    window.addEventListener('pointercancel', finishDragging);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finishDragging);
      window.removeEventListener('pointercancel', finishDragging);
      if (sizeNoticeTimerRef.current) {
        clearTimeout(sizeNoticeTimerRef.current);
      }
    };
  }, []);

  const startDragging = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    isDraggingRef.current = true;
  };

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextPercent = splitPercent;

    if (event.key === 'ArrowLeft') {
      nextPercent -= KEYBOARD_STEP_PERCENT;
    } else if (event.key === 'ArrowRight') {
      nextPercent += KEYBOARD_STEP_PERCENT;
    } else if (event.key === 'Home') {
      nextPercent = MIN_PANEL_PERCENT;
    } else if (event.key === 'End') {
      nextPercent = MAX_PANEL_PERCENT;
    } else {
      return;
    }

    event.preventDefault();
    setSplitPercent(clampSplit(nextPercent));
  };

  const updateContent = (content: string) => {
    onChange({ ...config, content });
  };

  const handleApplySize = (size: TextSizeOption) => {
    setIsSizeMenuOpen(false);
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const check = canApplyTextSize(config.content, start, end);

    if (!check.allowed) {
      setSizeNotice(check.reason ?? 'Невозможно применить размер');
      if (sizeNoticeTimerRef.current) {
        clearTimeout(sizeNoticeTimerRef.current);
      }
      sizeNoticeTimerRef.current = setTimeout(() => {
        setSizeNotice(null);
      }, 3500);
      return;
    }

    setSizeNotice(null);
    const result = applyTextSize(config.content, start, end, size);
    updateContent(result.newText);

    // Restore selection on next tick
    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(result.newStart, result.newEnd);
      }
    });
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && (isSettingsOpen || isSizeMenuOpen)) {
          event.preventDefault();
          event.stopPropagation();
          if (isSettingsOpen) {
            settingsButtonRef.current?.focus({ preventScroll: true });
          } else {
            sizeButtonRef.current?.focus({ preventScroll: true });
          }
          setIsSettingsOpen(false);
          setIsSizeMenuOpen(false);
        }
      }}
    >
      <div className="relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-theme-border-subtle px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {sizeNotice ? (
            <span
              className="rounded bg-red-900/80 px-2 py-0.5 text-[11px] text-red-200"
              role="status"
            >
              {sizeNotice}
            </span>
          ) : null}

          <div
            ref={sizeRootRef}
            className="relative"
            onBlur={(event) => {
              if (
                event.relatedTarget &&
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                setIsSizeMenuOpen(false);
              }
            }}
          >
            <Button
              ref={sizeButtonRef}
              aria-controls={sizeMenuId}
              aria-expanded={isSizeMenuOpen}
              aria-haspopup="menu"
              size="small"
              variant="ghost"
              onClick={() => {
                setIsSettingsOpen(false);
                setIsSizeMenuOpen((open) => !open);
              }}
            >
              <TextSizeIcon className="size-4 shrink-0" />
              <span>Размер текста</span>
              <ChevronDownIcon className="size-4 shrink-0" />
            </Button>

            {isSizeMenuOpen ? (
              <div
                id={sizeMenuId}
                className="absolute left-0 top-full z-20 mt-2 w-44 rounded-md border border-theme-border bg-theme-surface py-1 shadow-lg"
                role="menu"
              >
                <button
                  className="block w-full px-3 py-1.5 text-left text-xs text-theme-text-primary hover:bg-theme-surface-elevated"
                  role="menuitem"
                  type="button"
                  onClick={() => handleApplySize('normal')}
                >
                  Обычный
                </button>
                <button
                  className="block w-full px-3 py-1.5 text-left text-xs text-theme-text-primary hover:bg-theme-surface-elevated"
                  role="menuitem"
                  type="button"
                  onClick={() => handleApplySize('large')}
                >
                  Крупный — 18 px
                </button>
                <button
                  className="block w-full px-3 py-1.5 text-left text-xs text-theme-text-primary hover:bg-theme-surface-elevated"
                  role="menuitem"
                  type="button"
                  onClick={() => handleApplySize('xlarge')}
                >
                  Очень крупный — 22 px
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div
            ref={settingsRootRef}
            className="relative"
            onBlur={(event) => {
              if (
                event.relatedTarget &&
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                setIsSettingsOpen(false);
              }
            }}
          >
            <Button
              ref={settingsButtonRef}
              aria-controls={settingsId}
              aria-expanded={isSettingsOpen}
              size="small"
              variant="ghost"
              onClick={() => {
                setIsSizeMenuOpen(false);
                setIsSettingsOpen((open) => !open);
              }}
            >
              <SlidersIcon className="size-4 shrink-0" />
              Настройки
              <ChevronDownIcon className="size-4 shrink-0" />
            </Button>
            <Popover
              open={isSettingsOpen}
              id={settingsId}
              role="group"
              aria-label="Настройки виджета Markdown"
              className="absolute right-0 top-full z-30 mt-2 max-h-[calc(100dvh-7rem)] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-theme-border bg-theme-surface-elevated shadow-xl"
            >
              <div className="border-b border-theme-border-subtle px-4 py-3">
                <p className="text-sm font-semibold">Настройки заметки</p>
              </div>
              <div className="flex flex-col gap-3 p-2 text-sm">
                <div className="flex flex-col gap-2 px-2 pt-2">
                  <label
                    className="text-xs font-medium text-theme-text-secondary"
                    htmlFor={templateSelectId}
                  >
                    Шаблон
                  </label>
                  <Select
                    aria-label="Шаблон виджета"
                    dropdownPosition="static"
                    id={templateSelectId}
                    value={config.template}
                    onValueChange={(template) => {
                      if (isMarkdownTemplateId(template)) {
                        onChange({ ...config, template });
                      }
                    }}
                  >
                    {MARKDOWN_TEMPLATES.map((template) => (
                      <option
                        key={template.id}
                        title={template.description}
                        value={template.id}
                      >
                        {template.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="border-t border-theme-border-subtle pt-1">
                  <SettingToggle
                    label="Кнопка «Начать работу»"
                    description="Открывать сайты заметки одной кнопкой"
                    checked={config.showWebsiteSetButton ?? false}
                    onToggle={() =>
                      onChange({
                        ...config,
                        showWebsiteSetButton: !config.showWebsiteSetButton,
                      })
                    }
                  />
                  <SettingToggle
                    label="Быстрое добавление"
                    description="Добавлять записи прямо из карточки"
                    checked={config.quickAddEnabled}
                    onToggle={() =>
                      onChange({
                        ...config,
                        quickAddEnabled: !config.quickAddEnabled,
                      })
                    }
                  />
                  <SettingToggle
                    label="Только незавершённые"
                    description="Скрывать выполненные задачи"
                    checked={config.hideCompletedTasks}
                    onToggle={() =>
                      onChange({
                        ...config,
                        hideCompletedTasks: !config.hideCompletedTasks,
                      })
                    }
                  />
                </div>
              </div>
            </Popover>
          </div>
          <Button size="small" variant="primary" onClick={onRequestFinish}>
            Готово
          </Button>
        </div>
      </div>

      <div
        ref={splitContainerRef}
        className="flex min-h-0 flex-1 overflow-hidden"
      >
        <section
          aria-label="Редактор Markdown"
          className="flex min-w-0 flex-col"
          style={{ width: `${splitPercent}%` }}
        >
          <div className="shrink-0 px-5 pt-5">
            <label className="sr-only" htmlFor={titleId}>
              Заголовок
            </label>
            <Input
              data-dialog-initial-focus
              id={titleId}
              className="mb-4 !h-7 min-w-0 !rounded-none !border-0 !bg-transparent !p-0 !text-xl !leading-7 font-semibold focus-visible:ring-inset"
              placeholder="Заголовок заметки"
              value={config.title ?? ''}
              onChange={(event) =>
                onChange({ ...config, title: event.currentTarget.value })
              }
            />
            <label className="sr-only" htmlFor={contentId}>
              Markdown
            </label>
          </div>

          <Textarea
            ref={textareaRef}
            id={contentId}
            aria-label="Markdown-содержимое"
            className="!min-h-0 flex-1 resize-none rounded-none !border-0 !bg-transparent !px-5 !pb-5 !pt-0 font-mono leading-6 focus-visible:ring-2 focus-visible:ring-inset"
            placeholder="# Заголовок\n\nНачните писать Markdown…"
            spellCheck={false}
            value={config.content}
            onChange={(event) => updateContent(event.currentTarget.value)}
          />
        </section>

        <button
          aria-label="Изменить ширину редактора и предпросмотра"
          aria-orientation="vertical"
          aria-valuemax={MAX_PANEL_PERCENT}
          aria-valuemin={MIN_PANEL_PERCENT}
          aria-valuenow={Math.round(splitPercent)}
          className="group relative z-10 w-3 shrink-0 cursor-col-resize bg-theme-surface-muted outline-none hover:bg-theme-surface-elevated focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring"
          role="separator"
          type="button"
          onKeyDown={resizeWithKeyboard}
          onPointerDown={startDragging}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-theme-border group-hover:bg-theme-accent" />
        </button>

        <section
          aria-label="Предпросмотр Markdown"
          className="flex min-w-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-5">
            <h2
              aria-hidden={!config.title?.trim() || undefined}
              className="mb-4 min-h-7 text-xl font-semibold"
            >
              {config.title?.trim()}
            </h2>
            <MarkdownRenderer
              content={config.content}
              hideCompletedTasks={config.hideCompletedTasks}
              onContentChange={updateContent}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
