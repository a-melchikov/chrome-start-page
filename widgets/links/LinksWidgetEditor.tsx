import { useId, type KeyboardEvent } from 'react';

import { Button, Input, Textarea } from '../../components/ui';
import { parseLinksContent } from './parser';
import type { LinksWidgetConfig } from './types';

interface LinksWidgetEditorProps {
  config: LinksWidgetConfig;
  onChange: (config: LinksWidgetConfig) => void;
  onRequestFinish: () => void;
}

export function LinksWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: LinksWidgetEditorProps) {
  const contentId = useId();
  const errorId = useId();
  const titleId = useId();
  const { validation } = parseLinksContent(config.content);
  const firstIssue = validation.issues[0];

  const finishEditing = () => {
    if (validation.isValid) {
      onRequestFinish();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      finishEditing();
    }
  };

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      <div className="space-y-1.5">
        <label className="block text-xs font-medium" htmlFor={titleId}>
          Заголовок
        </label>
        <Input
          autoFocus
          id={titleId}
          placeholder="Список ссылок"
          value={config.title ?? ''}
          onChange={(event) =>
            onChange({ ...config, title: event.currentTarget.value })
          }
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium" htmlFor={contentId}>
          Markdown-содержимое
        </label>
        <Textarea
          aria-describedby={firstIssue ? errorId : undefined}
          aria-invalid={firstIssue ? true : undefined}
          id={contentId}
          className="max-h-[min(40dvh,20rem)]"
          placeholder="[GitHub](https://github.com/)"
          value={config.content}
          onChange={(event) =>
            onChange({ ...config, content: event.currentTarget.value })
          }
        />
        {firstIssue ? (
          <p
            className="text-xs text-red-600 dark:text-red-400"
            id={errorId}
            role="alert"
          >
            Строка {firstIssue.line}, столбец {firstIssue.column}:{' '}
            {firstIssue.message}
          </p>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Изменения сохраняются автоматически.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button size="small" variant="secondary" onClick={finishEditing}>
          Готово
        </Button>
      </div>
    </div>
  );
}
