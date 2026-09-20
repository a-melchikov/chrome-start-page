import { useId } from 'react';

import { Button, Select } from '../../components/ui';
import { isSearchEngine, SEARCH_ENGINES } from './engines';
import type { SearchWidgetConfig } from './types';

interface SearchWidgetEditorProps {
  config: SearchWidgetConfig;
  onChange: (config: SearchWidgetConfig) => void;
  onRequestFinish: () => void;
}

export function SearchWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: SearchWidgetEditorProps) {
  const engineId = useId();

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium" htmlFor={engineId}>
          Поисковик
        </label>
        <Select
          data-dialog-initial-focus
          id={engineId}
          value={config.engine}
          onChange={(event) => {
            const engine = event.currentTarget.value;

            if (isSearchEngine(engine)) {
              onChange({ ...config, engine });
            }
          }}
        >
          {SEARCH_ENGINES.map((engine) => (
            <option key={engine.id} value={engine.id}>
              {engine.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Запрос отправляется поисковику только после запуска поиска.
        </p>
      </div>

      <div className="flex justify-end pt-1">
        <Button size="small" variant="primary" onClick={onRequestFinish}>
          Готово
        </Button>
      </div>
    </div>
  );
}
