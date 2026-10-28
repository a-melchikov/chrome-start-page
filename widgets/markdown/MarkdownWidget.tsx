import { useMemo, useState } from 'react';

import { CheckSquareIcon, PlayIcon } from '../../components/icons';
import { Button } from '../../components/ui';
import { classNames } from '../../components/ui/class-names';
import { MarkdownQuickAdd } from './MarkdownQuickAdd';
import { MarkdownRenderer } from './MarkdownRenderer';
import { appendQuickAddEntry } from './quick-add';
import { analyzeTaskContent } from './task-filter';
import type { MarkdownWidgetConfig } from './types';
import {
  getWebsiteSetUrls,
  openWebsiteSet,
  type OpenWebsiteSetResult,
} from './website-set';

interface MarkdownWidgetProps {
  config: MarkdownWidgetConfig;
  onChange?: (config: MarkdownWidgetConfig) => void;
}

export function MarkdownWidget({ config, onChange }: MarkdownWidgetProps) {
  const websiteUrls = useMemo(
    () => getWebsiteSetUrls(config.content),
    [config.content],
  );
  const [isOpeningWebsites, setIsOpeningWebsites] = useState(false);
  const [websiteResult, setWebsiteResult] = useState<
    (OpenWebsiteSetResult & { source: string }) | null
  >(null);
  const currentWebsiteResult =
    websiteResult?.source === config.content ? websiteResult : null;
  const failedUrls = currentWebsiteResult?.failedUrls ?? [];
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

  const startWebsiteSet = async () => {
    if (isOpeningWebsites) return;
    const source = config.content;
    const retrying = failedUrls.length > 0;
    setIsOpeningWebsites(true);
    try {
      const result = await openWebsiteSet(retrying ? failedUrls : websiteUrls);
      setWebsiteResult({
        ...result,
        source,
        opened:
          result.opened + (retrying ? (currentWebsiteResult?.opened ?? 0) : 0),
      });
    } finally {
      setIsOpeningWebsites(false);
    }
  };

  return (
    <div className="@container flex h-full min-h-0 flex-col">
      {websiteUrls.length > 0 || hasTasks || config.hideCompletedTasks ? (
        <div className="mb-1.5 flex shrink-0 flex-wrap items-center justify-between gap-2">
          {websiteUrls.length > 0 ? (
            <Button
              aria-label={
                failedUrls.length
                  ? 'Повторить открытие сайтов (' + failedUrls.length + ')'
                  : 'Начать работу: открыть сайты (' + websiteUrls.length + ')'
              }
              disabled={isOpeningWebsites}
              aria-busy={isOpeningWebsites}
              size="xs"
              variant="secondary"
              title="Открыть сайты из заметки в новых фоновых вкладках"
              onClick={() => void startWebsiteSet()}
            >
              <PlayIcon className="size-3.5" />
              {isOpeningWebsites
                ? 'Открываю…'
                : failedUrls.length
                  ? 'Повторить'
                  : 'Начать работу'}
              <span>{failedUrls.length || websiteUrls.length}</span>
            </Button>
          ) : null}
          {hasTasks || config.hideCompletedTasks ? (
            <button
              aria-label="Показать только незавершённые задачи"
              aria-pressed={config.hideCompletedTasks}
              className={classNames(
                'ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors',
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
              <span
                className={
                  websiteUrls.length > 0
                    ? 'hidden @min-[18rem]:inline'
                    : undefined
                }
              >
                Только открытые
              </span>
            </button>
          ) : null}
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

      {currentWebsiteResult ? (
        <p
          className={classNames(
            'mt-1.5 shrink-0 text-xs',
            failedUrls.length
              ? 'text-theme-text-primary'
              : 'text-theme-text-secondary',
          )}
          role={failedUrls.length ? 'alert' : 'status'}
        >
          {'Открыто сайтов: ' +
            currentWebsiteResult.opened +
            ' из ' +
            websiteUrls.length +
            '.'}
          {failedUrls.length
            ? ' Не удалось открыть: ' +
              failedUrls.length +
              '. Нажмите «Повторить».'
            : ''}
        </p>
      ) : null}

      {config.quickAddEnabled ? (
        <MarkdownQuickAdd
          template={config.template}
          onAdd={handleAddQuickEntry}
        />
      ) : null}
    </div>
  );
}
