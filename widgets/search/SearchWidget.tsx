import { type FormEvent, useId, useRef, useState } from 'react';
import { browser, type PublicPath } from 'wxt/browser';

import { CloseIcon, SearchIcon } from '../../components/icons';
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
  const iconSize = engineId === 'google' ? 24 : 28;

  return (
    <span
      aria-hidden="true"
      className="widget-search-engine-icon"
      data-engine={engineId}
    >
      {hasError ? (
        <SearchIcon
          className="size-5"
          data-testid="search-engine-icon-fallback"
        />
      ) : (
        <img
          alt=""
          className={iconSize === 28 ? 'size-7 shrink-0' : 'size-6 shrink-0'}
          data-testid={`search-engine-icon-${engineId}`}
          draggable={false}
          height={iconSize}
          src={src}
          width={iconSize}
          onError={() => setHasError(true)}
        />
      )}
    </span>
  );
}

export function SearchWidget({ config }: SearchWidgetProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasQuery, setHasQuery] = useState(false);
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
        className="widget-search-surface liquid-glass-surface flex w-full items-center"
        method="get"
        role="search"
        onSubmit={handleSubmit}
      >
        <SearchEngineIcon engineId={engine.id} iconPath={engine.iconPath} />
        <label className="sr-only" htmlFor={inputId}>
          {label}
        </label>
        <Input
          autoComplete="off"
          className="widget-search-field"
          id={inputId}
          name={engine.queryParameter}
          placeholder={`Найти в ${engine.name}…`}
          ref={inputRef}
          spellCheck={false}
          type="search"
          onChange={(event) =>
            setHasQuery(event.currentTarget.value.length > 0)
          }
        />
        {hasQuery && (
          <IconButton
            aria-label="Очистить поиск"
            className="widget-search-clear"
            size="small"
            title="Очистить поиск"
            type="button"
            variant="ghost"
            onClick={() => {
              const input = inputRef.current;
              if (!input) return;
              input.value = '';
              setHasQuery(false);
              input.focus();
            }}
          >
            <CloseIcon className="size-[22px]" />
          </IconButton>
        )}
        <IconButton
          aria-label={`Искать в ${engine.name}`}
          className="widget-search-submit"
          size="small"
          title={`Искать в ${engine.name}`}
          type="submit"
          variant="ghost"
        >
          <SearchIcon className="size-[22px]" />
        </IconButton>
      </form>
    </div>
  );
}
