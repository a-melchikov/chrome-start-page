import { useSyncExternalStore } from 'react';

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

function getSnapshot(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(DARK_MODE_QUERY).matches;
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);

  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

export function useSystemDarkMode(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
