import { useEffect } from 'react';

import { DashboardControls } from '../../components/dashboard/DashboardControls';
import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import { useSystemDarkMode } from '../../hooks/use-system-dark-mode';
import { DEFAULT_APPEARANCE } from '../../storage/defaults';

export function App() {
  const { config, error, isLoading, updateAppearance } = useDashboardConfig();
  const systemDarkMode = useSystemDarkMode();
  const appearance = config?.appearance ?? DEFAULT_APPEARANCE;
  const resolvedTheme =
    appearance.theme === 'system'
      ? systemDarkMode
        ? 'dark'
        : 'light'
      : appearance.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;

    return () => {
      root.classList.remove('dark');
      delete root.dataset.theme;
      root.style.removeProperty('color-scheme');
    };
  }, [resolvedTheme]);

  return (
    <main
      aria-busy={isLoading}
      className="relative min-h-screen text-zinc-950 transition-colors dark:text-zinc-50"
      style={{ backgroundColor: appearance.backgroundColor }}
    >
      {error ? (
        <p
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-600 px-3 py-2 text-sm text-white shadow-lg"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <DashboardControls
        appearance={appearance}
        onAppearanceChange={updateAppearance}
      />
    </main>
  );
}
