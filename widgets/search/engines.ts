import type { SearchEngine } from './types';
import type { PublicPath } from 'wxt/browser';

export interface SearchEngineDefinition {
  id: SearchEngine;
  name: string;
  action: string;
  iconPath: PublicPath;
  queryParameter: 'q' | 'text';
}

const SEARCH_ENGINE_DEFINITIONS: Record<SearchEngine, SearchEngineDefinition> =
  {
    google: {
      id: 'google',
      name: 'Google',
      action: 'https://www.google.com/search',
      iconPath: '/search-engines/google.svg',
      queryParameter: 'q',
    },
    yandex: {
      id: 'yandex',
      name: 'Яндекс',
      action: 'https://yandex.ru/search/',
      iconPath: '/search-engines/yandex.svg',
      queryParameter: 'text',
    },
    bing: {
      id: 'bing',
      name: 'Bing',
      action: 'https://www.bing.com/search',
      iconPath: '/search-engines/bing.svg',
      queryParameter: 'q',
    },
    duckduckgo: {
      id: 'duckduckgo',
      name: 'DuckDuckGo',
      action: 'https://duckduckgo.com/',
      iconPath: '/search-engines/duckduckgo.svg',
      queryParameter: 'q',
    },
  };

export const SEARCH_ENGINES: readonly SearchEngineDefinition[] = Object.values(
  SEARCH_ENGINE_DEFINITIONS,
);

export function isSearchEngine(value: unknown): value is SearchEngine {
  return (
    typeof value === 'string' && Object.hasOwn(SEARCH_ENGINE_DEFINITIONS, value)
  );
}

export function getSearchEngineDefinition(
  engine: SearchEngine,
): SearchEngineDefinition {
  return SEARCH_ENGINE_DEFINITIONS[engine];
}
