import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';

import { Dashboard } from '../../components/dashboard/Dashboard';
import { WallpaperLayer } from '../../components/dashboard/WallpaperLayer';
import { classNames } from '../../components/ui/class-names';
import { Button } from '../../components/ui';
import { MotionNotice } from '../../components/ui/MotionNotice';
import { useDashboardConfig } from '../../hooks/use-dashboard-config';
import { useSystemDarkMode } from '../../hooks/use-system-dark-mode';
import { useWallpaperImage } from '../../hooks/use-wallpaper-image';
import { DEFAULT_APPEARANCE } from '../../storage/defaults';

import {
  applyThemeVariables,
  customThemeToDefinition,
  resolveTheme,
} from '../../themes/registry';
import { createCustomThemeSnapshot } from '../../themes/color-derivation';
import type { CustomTheme } from '../../themes/types';
import { CustomThemeEditorDialog } from '../../components/dashboard/CustomThemeEditorDialog';

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
    canUndo,
    canRedo,
    conflict,
    historyEpoch,
    isWidgetActionProcessing,
    addWidget,
    copyWidgets,
    duplicateWidgets,
    pasteWidgets,
    moveWidgets,
    finishNudge,
    removeWidgets,
    undo,
    redo,
    resolveConflict,
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
    saveCustomTheme,
    deleteCustomTheme,
    duplicateCustomTheme,
    selectTheme,
  } = useDashboardConfig();

  const systemDarkMode = useSystemDarkMode();
  const [themeMotionReady, setThemeMotionReady] = useState(false);
  const [failedRemoteWallpaperSrc, setFailedRemoteWallpaperSrc] = useState<
    string | null
  >(null);

  // Custom theme editor state
  const [isThemeEditorOpen, setIsThemeEditorOpen] = useState(false);
  const [themeBeingEdited, setThemeBeingEdited] = useState<CustomTheme | null>(
    null,
  );
  const [isNewTheme, setIsNewTheme] = useState(false);
  const [fullScreenPreviewDraft, setFullScreenPreviewDraft] =
    useState<CustomTheme | null>(null);
  const [appearanceReopenToken, setAppearanceReopenToken] = useState(0);

  const appearance = config?.appearance ?? DEFAULT_APPEARANCE;

  const resolved = useMemo(() => {
    if (fullScreenPreviewDraft) {
      return {
        definition: customThemeToDefinition(fullScreenPreviewDraft),
        mode: fullScreenPreviewDraft.mode,
        isCustom: true,
      };
    }
    return resolveTheme(appearance.theme, systemDarkMode, config?.customThemes);
  }, [
    fullScreenPreviewDraft,
    appearance.theme,
    systemDarkMode,
    config?.customThemes,
  ]);

  const {
    definition: resolvedThemeDef,
    mode: resolvedThemeMode,
    isCustom,
  } = resolved;

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

  const effectiveBgColor = useMemo(() => {
    if (appearance.backgroundColor.type === 'custom') {
      return appearance.backgroundColor.color;
    }
    if (fullScreenPreviewDraft) {
      return fullScreenPreviewDraft.colors.canvasBg;
    }
    return (
      resolvedThemeDef.tokens.canvasBg ||
      resolvedThemeDef.defaultBackgroundColor
    );
  }, [appearance.backgroundColor, fullScreenPreviewDraft, resolvedThemeDef]);

  const dashboardStyle: DashboardStyle = {
    backgroundColor: effectiveBgColor,
    '--liquid-glass-opacity': 1 - liquidGlass.transparency / 100,
    '--liquid-glass-blur': `${liquidGlass.blur}px`,
    '--liquid-glass-shadow': liquidGlass.shadow / 100,
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedThemeMode === 'dark');
    root.dataset.theme = resolvedThemeDef.id;
    root.style.colorScheme = resolvedThemeMode;
    applyThemeVariables(root, isCustom ? resolvedThemeDef.tokens : null);

    const hasGlow =
      resolvedThemeDef.id === 'synthwave-84' ||
      Boolean(
        resolvedThemeDef.tokens.glow && resolvedThemeDef.tokens.glow !== 'none',
      );
    if (hasGlow) {
      root.dataset.themeGlow = 'true';
    } else {
      delete root.dataset.themeGlow;
    }

    return () => {
      root.classList.remove('dark');
      delete root.dataset.theme;
      delete root.dataset.themeGlow;
      root.style.removeProperty('color-scheme');
      applyThemeVariables(root, null);
    };
  }, [resolvedThemeDef, resolvedThemeMode, isCustom]);

  useEffect(() => {
    if (isLoading) return;
    const frame = window.requestAnimationFrame(() => setThemeMotionReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isLoading]);

  const handleOpenThemeEditor = useCallback(
    (themeToEdit?: CustomTheme) => {
      if (themeToEdit) {
        setIsNewTheme(false);
        setThemeBeingEdited(themeToEdit);
      } else {
        const snapshot = createCustomThemeSnapshot(
          'system',
          systemDarkMode ? 'dark' : 'light',
          'Моя тема',
        );
        setIsNewTheme(true);
        setThemeBeingEdited(snapshot);
      }
      setIsThemeEditorOpen(true);
    },
    [systemDarkMode],
  );

  const handleSaveCustomTheme = useCallback(
    (theme: CustomTheme) => {
      const isCurrentActive =
        appearance.theme.type === 'custom' && appearance.theme.id === theme.id;
      saveCustomTheme(theme, { makeActive: isNewTheme || isCurrentActive });
      setIsThemeEditorOpen(false);
      setThemeBeingEdited(null);
      setFullScreenPreviewDraft(null);
      setAppearanceReopenToken((t) => t + 1);
    },
    [appearance.theme, isNewTheme, saveCustomTheme],
  );

  const handlePreviewFullScreen = useCallback((draft: CustomTheme) => {
    setFullScreenPreviewDraft(draft);
    setIsThemeEditorOpen(false);
  }, []);

  const handleReturnFromFullScreenPreview = useCallback(() => {
    setFullScreenPreviewDraft(null);
    setIsThemeEditorOpen(true);
  }, []);

  useEffect(() => {
    if (!fullScreenPreviewDraft) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleReturnFromFullScreenPreview();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [fullScreenPreviewDraft, handleReturnFromFullScreenPreview]);

  return (
    <main
      aria-busy={isLoading}
      data-theme-motion={themeMotionReady}
      className={classNames(
        'dashboard-root relative isolate min-h-screen text-theme-text-primary',
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

      <MotionNotice
        className="fixed bottom-4 left-1/2 z-20 w-max max-w-[calc(100vw-2rem)] rounded-md bg-red-600 px-3 py-2 text-center text-sm text-white shadow-lg"
        message={visibleError}
        role="alert"
      />

      {/* Floating Bar for Fullscreen Theme Preview */}
      {fullScreenPreviewDraft && (
        <div className="dashboard-toolbar liquid-glass-surface fixed top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-theme-border bg-theme-surface/80 p-1 pl-4 text-sm text-theme-text-primary shadow-lg backdrop-blur-md">
          <span className="text-sm font-medium text-theme-text-secondary">
            Режим просмотра темы:{' '}
            <strong className="font-semibold text-theme-text-primary">
              {fullScreenPreviewDraft.name || 'Моя тема'}
            </strong>
          </span>
          <Button
            variant="primary"
            size="small"
            onClick={handleReturnFromFullScreenPreview}
          >
            Вернуться к редактированию
          </Button>
        </div>
      )}

      <div
        className={classNames(
          'dashboard-workspace relative z-10',
          !isLoading && 'dashboard-workspace--ready',
        )}
      >
        <Dashboard
          appearance={appearance}
          backupError={backupError}
          config={config}
          canUndo={canUndo}
          canRedo={canRedo}
          conflict={conflict}
          historyEpoch={historyEpoch}
          isWidgetActionProcessing={isWidgetActionProcessing}
          isBackupProcessing={isBackupProcessing}
          isLoading={isLoading}
          isWallpaperUpdating={isWallpaperUpdating}
          wallpaperError={dialogWallpaperError}
          wallpaperPreviewSrc={wallpaperImage.src}
          onAddWidget={addWidget}
          onCopyWidgets={copyWidgets}
          onDuplicateWidgets={duplicateWidgets}
          onPasteWidgets={pasteWidgets}
          onMoveWidgets={moveWidgets}
          onFinishNudge={finishNudge}
          onRemoveWidgets={removeWidgets}
          onUndo={undo}
          onRedo={redo}
          onResolveConflict={resolveConflict}
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
          onOpenThemeEditor={handleOpenThemeEditor}
          onSelectTheme={selectTheme}
          onDuplicateCustomTheme={duplicateCustomTheme}
          onDeleteCustomTheme={deleteCustomTheme}
          reopenAppearanceToken={appearanceReopenToken}
        />
      </div>

      {themeBeingEdited && (
        <CustomThemeEditorDialog
          key={themeBeingEdited.id}
          open={isThemeEditorOpen}
          initialTheme={themeBeingEdited}
          isNew={isNewTheme}
          existingThemes={config?.customThemes ?? []}
          widgets={config?.widgets ?? []}
          onOpenChange={(open) => {
            setIsThemeEditorOpen(open);
            if (!open) {
              setThemeBeingEdited(null);
              setAppearanceReopenToken((t) => t + 1);
            }
          }}
          onSave={handleSaveCustomTheme}
          onPreviewFullScreen={handlePreviewFullScreen}
        />
      )}
    </main>
  );
}
