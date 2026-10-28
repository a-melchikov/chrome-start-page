import type { ReactNode, RefObject } from 'react';
import type { ToolbarMode } from '../../storage/schema';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';
import { IconButton } from '../ui';
import { classNames } from '../ui/class-names';

interface DashboardToolbarProps {
  mode: ToolbarMode;
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
            title="Раскрыть панель управления (M)"
            className="dashboard-toolbar-reveal-button dashboard-popover-surface liquid-glass-surface h-16 w-6 rounded-l-none rounded-r-lg !p-0"
            size="small"
            variant="ghost"
            disabled={!canManage || isInteracting}
            tabIndex={isOpen ? -1 : 0}
            onClick={onExpand}
          >
            <ChevronRightIcon className="size-5" />
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
            title="Свернуть панель управления (M)"
            size="small"
            variant="ghost"
            className="mx-auto mb-2"
            onClick={onCollapse}
          >
            <ChevronLeftIcon className="size-6" />
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
