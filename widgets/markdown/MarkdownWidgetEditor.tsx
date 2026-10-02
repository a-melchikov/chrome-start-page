import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { ChevronDownIcon } from '../../components/icons';
import { Button, Input, Textarea } from '../../components/ui';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MARKDOWN_TEMPLATES, getMarkdownTemplateDefinition } from './templates';
import {
  applyTextSize,
  canApplyTextSize,
  type TextSizeOption,
} from './text-size';
import type { MarkdownTemplateId, MarkdownWidgetConfig } from './types';

interface MarkdownWidgetEditorProps {
  config: MarkdownWidgetConfig;
  onChange: (config: MarkdownWidgetConfig) => void;
  onRequestFinish: () => void;
}

const MIN_PANEL_PERCENT = 30;
const MAX_PANEL_PERCENT = 70;
const KEYBOARD_STEP_PERCENT = 5;

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
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDraggingRef = useRef(false);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const [sizeNotice, setSizeNotice] = useState<string | null>(null);
  const sizeNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-theme-border-subtle px-5 py-3">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-xs font-medium" htmlFor={titleId}>
            Заголовок
          </label>
          <Input
            data-dialog-initial-focus
            id={titleId}
            placeholder="Markdown"
            value={config.title ?? ''}
            onChange={(event) =>
              onChange({ ...config, title: event.currentTarget.value })
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-theme-border-subtle bg-theme-surface-muted/40 px-3 py-2 text-xs">
          <div className="flex items-center gap-1.5">
            <label
              className="font-medium text-theme-text-secondary"
              htmlFor={templateSelectId}
            >
              Шаблон:
            </label>
            <select
              aria-label="Шаблон виджета"
              className="rounded border border-theme-border bg-theme-surface px-2 py-1 text-xs text-theme-text-primary focus-visible:ring-1 focus-visible:ring-theme-ring"
              id={templateSelectId}
              title={getMarkdownTemplateDefinition(config.template).description}
              value={config.template}
              onChange={(event) =>
                onChange({
                  ...config,
                  template: event.currentTarget.value as MarkdownTemplateId,
                })
              }
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
            </select>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-1.5 text-theme-text-primary">
            <input
              checked={config.quickAddEnabled}
              className="size-3.5 cursor-pointer rounded accent-theme-accent"
              type="checkbox"
              onChange={(event) =>
                onChange({ ...config, quickAddEnabled: event.target.checked })
              }
            />
            <span>Быстрое добавление</span>
          </label>

          <label className="flex cursor-pointer select-none items-center gap-1.5 text-theme-text-primary">
            <input
              checked={config.hideCompletedTasks}
              className="size-3.5 cursor-pointer rounded accent-theme-accent"
              type="checkbox"
              onChange={(event) =>
                onChange({
                  ...config,
                  hideCompletedTasks: event.target.checked,
                })
              }
            />
            <span>Только незавершённые</span>
          </label>
        </div>

        <Button size="small" variant="primary" onClick={onRequestFinish}>
          Готово
        </Button>
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
          <div className="flex shrink-0 items-center justify-between border-b border-theme-border-subtle px-4 py-1.5">
            <label
              className="text-xs font-semibold text-theme-text-secondary"
              htmlFor={contentId}
            >
              Markdown
            </label>

            <div className="flex items-center gap-2">
              {sizeNotice ? (
                <span
                  className="rounded bg-red-900/80 px-2 py-0.5 text-[11px] text-red-200"
                  role="status"
                >
                  {sizeNotice}
                </span>
              ) : null}

              <div className="relative">
                <button
                  aria-expanded={isSizeMenuOpen}
                  aria-haspopup="true"
                  className="inline-flex items-center gap-1 rounded border border-theme-border bg-theme-surface px-2 py-1 text-xs text-theme-text-primary transition-colors hover:bg-theme-surface-elevated focus-visible:ring-1 focus-visible:ring-theme-ring"
                  type="button"
                  onClick={() => setIsSizeMenuOpen(!isSizeMenuOpen)}
                >
                  <span>Размер текста</span>
                  <ChevronDownIcon className="size-3 text-theme-text-muted" />
                </button>

                {isSizeMenuOpen ? (
                  <div
                    className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-theme-border bg-theme-surface py-1 shadow-lg"
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
          </div>

          <Textarea
            ref={textareaRef}
            id={contentId}
            aria-label="Markdown-содержимое"
            className="h-full min-h-0 resize-none rounded-none border-0 px-4 py-3 font-mono leading-6 focus-visible:ring-2 focus-visible:ring-inset"
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
          <h3 className="shrink-0 border-b border-theme-border-subtle px-4 py-2 text-xs font-semibold text-theme-text-secondary">
            Предпросмотр
          </h3>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-5">
            <h2 className="mb-4 text-xl font-semibold">
              {config.title?.trim() || 'Markdown'}
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
