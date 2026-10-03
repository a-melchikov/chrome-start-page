import { useMemo } from 'react';

import { CheckSquareIcon } from '../../components/icons';
import { classNames } from '../../components/ui/class-names';
import { MarkdownQuickAdd } from './MarkdownQuickAdd';
import { MarkdownRenderer } from './MarkdownRenderer';
import { appendQuickAddEntry } from './quick-add';
import { analyzeTaskContent } from './task-filter';
import type { MarkdownWidgetConfig } from './types';

interface MarkdownWidgetProps {
  config: MarkdownWidgetConfig;
  onChange?: (config: MarkdownWidgetConfig) => void;
}

export function MarkdownWidget({ config, onChange }: MarkdownWidgetProps) {
  const hasTasks = useMemo(() => {
    if (config.template === 'tasks' || config.template === 'daily-plan') {
      return true;
    }
    return analyzeTaskContent(config.content).totalTasks > 0;
  }, [config.template, config.content]);

  const handleAddQuickEntry = (entry: string) => {
    if (!onChange) return;
    const nextContent = appendQuickAddEntry(config.content, entry);
    onChange({ ...config, content: nextContent });
  };

  const toggleHideCompleted = () => {
    if (!onChange) return;
    onChange({
      ...config,
      hideCompletedTasks: !config.hideCompletedTasks,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {hasTasks || config.hideCompletedTasks ? (
        <div className="mb-1.5 flex shrink-0 items-center justify-end">
          <button
            aria-label="Показать только незавершённые задачи"
            aria-pressed={config.hideCompletedTasks}
            className={classNames(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors',
              config.hideCompletedTasks
                ? 'bg-theme-accent/15 font-medium text-theme-accent'
                : 'text-theme-text-secondary hover:bg-theme-surface-muted hover:text-theme-text-primary',
            )}
            title={
              config.hideCompletedTasks
                ? 'Показаны только незавершённые задачи (нажмите, чтобы показать все)'
                : 'Скрыть выполненные задачи'
            }
            type="button"
            onClick={toggleHideCompleted}
          >
            <CheckSquareIcon className="size-3.5" />
            <span>Только открытые</span>
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain pr-1">
        <MarkdownRenderer
          content={config.content}
          hideCompletedTasks={config.hideCompletedTasks}
          onContentChange={
            onChange
              ? (content) => {
                  onChange({ ...config, content });
                }
              : undefined
          }
        />
      </div>

      {config.quickAddEnabled ? (
        <MarkdownQuickAdd
          template={config.template}
          onAdd={handleAddQuickEntry}
        />
      ) : null}
    </div>
  );
}
