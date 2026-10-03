import { useState, type KeyboardEvent } from 'react';

import { classNames } from '../../components/ui/class-names';
import { formatQuickAddEntry } from './quick-add';
import type { MarkdownTemplateId } from './types';

interface MarkdownQuickAddProps {
  template: MarkdownTemplateId;
  onAdd: (entry: string) => void;
  className?: string;
}

export function MarkdownQuickAdd({
  template,
  onAdd,
  className,
}: MarkdownQuickAddProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const placeholder =
    template === 'tasks' || template === 'daily-plan'
      ? 'Новая задача…'
      : template === 'links'
        ? 'https://… [подпись]'
        : 'Быстрая заметка…';

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!value.trim()) return;

      const result = formatQuickAddEntry(template, value);
      if (!result.success || !result.entry) {
        setError(result.error ?? 'Ошибка добавления');
        return;
      }

      setError(null);
      onAdd(result.entry);
      setValue('');
    } else if (error) {
      setError(null);
    }
  };

  return (
    <div className={classNames('shrink-0 pt-2', className)}>
      <div className="relative">
        <input
          aria-label={`Быстрое добавление (${placeholder})`}
          className={classNames(
            'w-full rounded-md border bg-theme-surface-muted/60 px-2.5 py-1 text-xs text-theme-text-primary placeholder:text-theme-text-secondary focus:bg-theme-surface focus:outline-none focus-visible:ring-1',
            error
              ? 'border-red-400 focus-visible:ring-red-400'
              : 'border-theme-border-subtle focus-visible:ring-theme-ring',
          )}
          placeholder={placeholder}
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.currentTarget.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
        />
        {error ? (
          <p
            className="absolute left-0 top-full z-10 mt-1 max-w-full truncate rounded bg-red-900/90 px-1.5 py-0.5 text-[10px] text-red-200 shadow-sm"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
