import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { Button, Input, Textarea } from '../../components/ui';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { MarkdownWidgetConfig } from './types';

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
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [splitPercent, setSplitPercent] = useState(50);

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-end gap-3 px-5 py-3">
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
          <label
            className="shrink-0 border-b border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
            htmlFor={contentId}
          >
            Markdown
          </label>
          <Textarea
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
          className="group relative z-10 w-3 shrink-0 cursor-col-resize bg-zinc-100 outline-none hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          role="separator"
          type="button"
          onKeyDown={resizeWithKeyboard}
          onPointerDown={startDragging}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-zinc-300 group-hover:bg-zinc-500 dark:bg-zinc-600" />
        </button>

        <section
          aria-label="Предпросмотр Markdown"
          className="flex min-w-0 flex-1 flex-col"
        >
          <h3 className="shrink-0 border-b border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            Предпросмотр
          </h3>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain p-5">
            <h2 className="mb-4 text-xl font-semibold">
              {config.title?.trim() || 'Markdown'}
            </h2>
            <MarkdownRenderer
              content={config.content}
              onContentChange={updateContent}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
