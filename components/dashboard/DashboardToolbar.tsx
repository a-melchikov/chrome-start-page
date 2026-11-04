import { useLayoutEffect, type ReactNode, type RefObject } from 'react';
import type { ToolbarMode } from '../../storage/schema';
import { ChevronLeftIcon } from '../icons';
import { IconButton } from '../ui';
import { classNames } from '../ui/class-names';

interface DashboardToolbarProps {
  mode: ToolbarMode;
  toggleShortcut?: string;
  isOpen: boolean;
  isInteracting: boolean;
  canManage: boolean;
  toolbarId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  revealRef: RefObject<HTMLButtonElement | null>;
  onExpand: () => void;
  onCollapse: () => void;
  children: ReactNode;
}

export function DashboardToolbar({
  mode,
  toggleShortcut = 'M',
  isOpen,
  isInteracting,
  canManage,
  toolbarId,
  panelRef,
  revealRef,
  onExpand,
  onCollapse,
  children,
}: DashboardToolbarProps) {
  const isLeft = mode !== 'top-right';
  const isCollapsible = mode === 'left-collapsible';
  useLayoutEffect(() => {
    if (isLeft) return;
    const panel = panelRef.current;
    const root = panel?.closest<HTMLElement>('.dashboard-root');
    if (!panel || !root) return;
    const measure = () =>
      root.style.setProperty(
        '--toolbar-top-clearance',
        `${Math.ceil(panel.getBoundingClientRect().bottom + 16)}px`,
      );
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(panel);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      root.style.removeProperty('--toolbar-top-clearance');
    };
  }, [isLeft, panelRef]);
  return (
    <>
      {isCollapsible && (
        <div
          className="dashboard-toolbar-reveal"
          aria-hidden={isOpen}
          data-visible={!isOpen}
          data-interacting={isInteracting}
        >
          <IconButton
            ref={revealRef}
            aria-label="Раскрыть панель управления"
            aria-expanded={isOpen}
            aria-controls={toolbarId}
            title={
              toggleShortcut
                ? `Раскрыть панель управления (${toggleShortcut})`
                : 'Раскрыть панель управления'
            }
            className="dashboard-toolbar-reveal-button h-28 w-6 !bg-transparent !p-0"
            size="small"
            variant="ghost"
            disabled={!canManage || isInteracting}
            tabIndex={isOpen ? -1 : 0}
            onClick={onExpand}
          >
            <span
              aria-hidden="true"
              className="dashboard-toolbar-reveal-handle"
            />
          </IconButton>
        </div>
      )}
      <div
        ref={panelRef}
        id={toolbarId}
        role="group"
        aria-label="Панель управления"
        aria-hidden={!isOpen}
        inert={!isOpen}
        data-mode={mode}
        data-open={isOpen}
        className={classNames(
          'dashboard-toolbar liquid-glass-surface fixed z-30 rounded-xl',
          isLeft
            ? 'dashboard-toolbar-left'
            : 'top-4 right-4 max-w-[calc(100vw-2rem)] p-1',
        )}
      >
        {isCollapsible && (
          <IconButton
            aria-label="Свернуть панель управления"
            title={
              toggleShortcut
                ? `Свернуть панель управления (${toggleShortcut})`
                : 'Свернуть панель управления'
            }
            size="small"
            variant="ghost"
            className="mx-auto mb-2 !p-0"
            onClick={onCollapse}
          >
            <ChevronLeftIcon className="size-6 shrink-0" />
          </IconButton>
        )}
        <div
          data-toolbar-actions
          className={classNames(
            'flex items-center gap-2',
            isLeft
              ? 'min-h-0 flex-col overflow-y-auto overscroll-contain'
              : 'flex-wrap justify-end',
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
