import { type FormEvent, useId, useState } from 'react';
import { browser, type PublicPath } from 'wxt/browser';

import { SearchIcon } from '../../components/icons';
import { IconButton, Input } from '../../components/ui';
import { getSearchEngineDefinition } from './engines';
import type { SearchWidgetConfig } from './types';

interface SearchWidgetProps {
  config: SearchWidgetConfig;
}

interface SearchEngineIconProps {
  engineId: SearchWidgetConfig['engine'];
  iconPath: PublicPath;
}

function SearchEngineIcon({ engineId, iconPath }: SearchEngineIconProps) {
  const source = browser.runtime.getURL(iconPath);

  return (
    <SearchEngineIconImage key={source} engineId={engineId} src={source} />
  );
}

interface SearchEngineIconImageProps {
  engineId: SearchWidgetConfig['engine'];
  src: string;
}

function SearchEngineIconImage({ engineId, src }: SearchEngineIconImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <SearchIcon
        className="size-6"
        data-testid="search-engine-icon-fallback"
      />
    );
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className="size-6 shrink-0"
      data-testid={`search-engine-icon-${engineId}`}
      draggable={false}
      height="24"
      src={src}
      width="24"
      onError={() => setHasError(true)}
    />
  );
}

export function SearchWidget({ config }: SearchWidgetProps) {
  const inputId = useId();
  const engine = getSearchEngineDefinition(config.engine);
  const label = `Поиск в ${engine.name}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const input = event.currentTarget.elements.namedItem(engine.queryParameter);

    if (!(input instanceof HTMLInputElement)) {
      event.preventDefault();
      return;
    }

    const query = input.value.trim();

    if (!query) {
      event.preventDefault();
      return;
    }

    input.value = query;
  };

  return (
    <div className="flex h-full min-h-0 items-center">
      <form
        aria-label={label}
        action={engine.action}
        className="widget-search-surface liquid-glass-surface flex w-full items-center gap-2"
        method="get"
        role="search"
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor={inputId}>
          {label}
        </label>
        <Input
          autoComplete="off"
          className="widget-search-field"
          id={inputId}
          name={engine.queryParameter}
          placeholder={label}
          spellCheck={false}
          type="search"
        />
        <IconButton
          aria-label={`Искать в ${engine.name}`}
          size="small"
          title={`Искать в ${engine.name}`}
          type="submit"
          variant="brand"
        >
          <SearchEngineIcon engineId={engine.id} iconPath={engine.iconPath} />
        </IconButton>
      </form>
    </div>
  );
}
