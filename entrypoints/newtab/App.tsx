import { useEffect, useState } from 'react';

import { Dashboard } from '../../components/dashboard/Dashboard';
import { WallpaperLayer } from '../../components/dashboard/WallpaperLayer';
import { classNames } from '../../components/ui/class-names';
import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import { useSystemDarkMode } from '../../hooks/use-system-dark-mode';
import { useWallpaperImage } from '../../hooks/use-wallpaper-image';
import { DEFAULT_APPEARANCE } from '../../storage/defaults';

export function App() {
  const {
    config,
    error,
    isLoading,
    isWallpaperUpdating,
    wallpaperError,
    addWidget,
    clearWallpaperError,
    flushAppearancePreview,
    flushWidgetUpdates,
    previewAppearance,
    removeWallpaper,
    removeWidget,
    setLocalWallpaper,
    setUrlWallpaper,
    updateAppearance,
    updateWidget,
    updateWidgetLayouts,
  } = useDashboardConfig();
  const systemDarkMode = useSystemDarkMode();
  const [failedRemoteWallpaperSrc, setFailedRemoteWallpaperSrc] = useState<
    string | null
  >(null);
  const appearance = config?.appearance ?? DEFAULT_APPEARANCE;
  const resolvedTheme =
    appearance.theme === 'system'
      ? systemDarkMode
        ? 'dark'
        : 'light'
      : appearance.theme;
  const wallpaperImage = useWallpaperImage(appearance.wallpaper);
  const visibleError =
    error ??
    (wallpaperImage.sourceType === 'local' ? wallpaperImage.error : null);
  const remoteWallpaperError =
    wallpaperImage.sourceType === 'url' &&
    failedRemoteWallpaperSrc === wallpaperImage.src
      ? 'Не удалось загрузить обои по ссылке'
      : null;
  const dialogWallpaperError =
    wallpaperError ?? wallpaperImage.error ?? remoteWallpaperError;

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
      className={classNames(
        'relative isolate min-h-screen text-zinc-950 transition-colors dark:text-zinc-50',
        appearance.liquidGlass.enabled && 'liquid-glass-enabled',
      )}
      style={{ backgroundColor: appearance.backgroundColor }}
    >
      <WallpaperLayer
        src={wallpaperImage.src}
        onLoad={() => setFailedRemoteWallpaperSrc(null)}
        onLoadError={() => {
          if (wallpaperImage.sourceType === 'url') {
            setFailedRemoteWallpaperSrc(wallpaperImage.src);
          }
        }}
      />

      {visibleError ? (
        <p
          className="fixed bottom-4 left-1/2 z-20 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md bg-red-600 px-3 py-2 text-center text-sm text-white shadow-lg"
          role="alert"
        >
          {visibleError}
        </p>
      ) : null}

      <div className="relative z-10">
        <Dashboard
          appearance={appearance}
          config={config}
          isLoading={isLoading}
          isWallpaperUpdating={isWallpaperUpdating}
          wallpaperError={dialogWallpaperError}
          wallpaperPreviewSrc={wallpaperImage.src}
          onAddWidget={addWidget}
          onAppearanceChange={updateAppearance}
          onAppearancePreview={previewAppearance}
          onClearWallpaperError={() => {
            clearWallpaperError();
            setFailedRemoteWallpaperSrc(null);
          }}
          onFlushWidgetUpdates={flushWidgetUpdates}
          onFlushAppearancePreview={flushAppearancePreview}
          onRemoveWallpaper={removeWallpaper}
          onRemoveWidget={removeWidget}
          onSetLocalWallpaper={setLocalWallpaper}
          onSetUrlWallpaper={setUrlWallpaper}
          onUpdateWidget={updateWidget}
          onUpdateWidgetLayouts={updateWidgetLayouts}
        />
      </div>
    </main>
  );
}
