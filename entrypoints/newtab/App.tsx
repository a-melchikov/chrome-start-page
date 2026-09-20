import { useEffect, useState, type CSSProperties } from 'react';

import { Dashboard } from '../../components/dashboard/Dashboard';
import { WallpaperLayer } from '../../components/dashboard/WallpaperLayer';
import { classNames } from '../../components/ui/class-names';
import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import { useSystemDarkMode } from '../../hooks/use-system-dark-mode';
import { useWallpaperImage } from '../../hooks/use-wallpaper-image';
import { DEFAULT_APPEARANCE } from '../../storage/defaults';

import { resolveTheme } from '../../themes/registry';

type DashboardStyle = CSSProperties & {
  '--liquid-glass-opacity': number;
  '--liquid-glass-blur': string;
  '--liquid-glass-shadow': number;
};

export function App() {
  const {
    config,
    backupError,
    error,
    isBackupProcessing,
    isLoading,
    isWallpaperUpdating,
    wallpaperError,
    addWidget,
    clearBackupError,
    clearWallpaperError,
    exportDashboardBackup,
    flushAppearancePreview,
    flushWidgetUpdates,
    importDashboardBackup,
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
  const { definition: resolvedThemeDef, mode: resolvedThemeMode } =
    resolveTheme(appearance.theme, systemDarkMode);
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
  const liquidGlass = appearance.liquidGlass;
  const dashboardStyle: DashboardStyle = {
    backgroundColor: appearance.backgroundColor,
    '--liquid-glass-opacity': 1 - liquidGlass.transparency / 100,
    '--liquid-glass-blur': `${liquidGlass.blur}px`,
    '--liquid-glass-shadow': liquidGlass.shadow / 100,
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedThemeMode === 'dark');
    root.dataset.theme = resolvedThemeDef.id;
    root.style.colorScheme = resolvedThemeMode;

    return () => {
      root.classList.remove('dark');
      delete root.dataset.theme;
      root.style.removeProperty('color-scheme');
    };
  }, [resolvedThemeDef.id, resolvedThemeMode]);

  return (
    <main
      aria-busy={isLoading}
      className={classNames(
        'relative isolate min-h-screen text-theme-text-primary transition-colors',
        liquidGlass.enabled && 'liquid-glass-enabled',
      )}
      style={dashboardStyle}
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
          backupError={backupError}
          config={config}
          isBackupProcessing={isBackupProcessing}
          isLoading={isLoading}
          isWallpaperUpdating={isWallpaperUpdating}
          wallpaperError={dialogWallpaperError}
          wallpaperPreviewSrc={wallpaperImage.src}
          onAddWidget={addWidget}
          onAppearanceChange={updateAppearance}
          onAppearancePreview={previewAppearance}
          onClearBackupError={clearBackupError}
          onClearWallpaperError={() => {
            clearWallpaperError();
            setFailedRemoteWallpaperSrc(null);
          }}
          onFlushWidgetUpdates={flushWidgetUpdates}
          onFlushAppearancePreview={flushAppearancePreview}
          onExportDashboard={exportDashboardBackup}
          onImportDashboard={async (file, signal) => {
            const result = await importDashboardBackup(file, signal);
            setFailedRemoteWallpaperSrc(null);
            return result;
          }}
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
