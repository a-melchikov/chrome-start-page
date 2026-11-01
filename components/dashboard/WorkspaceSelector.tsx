import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { WorkspaceConfig } from '../../storage/schema';
import {
  CheckIcon,
  ChevronDownIcon,
  DuplicateIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '../icons';
import { classNames } from '../ui/class-names';
import { IconButton } from '../ui';
import { Popover } from '../ui/Popover';

interface WorkspaceSelectorProps {
  compact?: boolean;
  toggleShortcut?: string;
  placement?: 'below-end' | 'right';
  toolbarOwner?: string;
  workspaces: readonly WorkspaceConfig[];
  activeWorkspaceId: string | null;
  canManage: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchWorkspace: (id: string) => void;
  onAddWorkspace: (name?: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDuplicateWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onOpenManager: () => void;
}

export function WorkspaceSelector({
  compact = false,
  toggleShortcut = 'W',
  placement = 'below-end',
  toolbarOwner,
  workspaces,
  activeWorkspaceId,
  canManage,
  isOpen,
  onOpenChange,
  onSwitchWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onOpenManager,
}: WorkspaceSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const bindContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (node)
      setPortalRoot(
        node.closest<HTMLElement>('.dashboard-root') ?? document.body,
      );
  }, []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const renameFocusId = useRef<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  const closeMenu = useCallback(() => {
    setRenamingId(null);
    setRenameText('');
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node) &&
        !document.querySelector('dialog[open]')
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement &&
        menuRef.current?.contains(event.target)
      )
        return;
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, closeMenu]);

  useLayoutEffect(() => {
    if (!isOpen || placement !== 'right' || !portalRoot) return;
    const positionMenu = () => {
      const menu = menuRef.current;
      const anchor = triggerRef.current;
      if (!menu || !anchor) return;
      const bounds = anchor.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 32);
      menu.style.width = `${width}px`;
      menu.style.maxHeight = `${Math.max(0, window.innerHeight - 32)}px`;
      menu.style.left = `${Math.max(16, Math.min(bounds.right + 8, window.innerWidth - width - 16))}px`;
      menu.style.top = `${Math.max(16, Math.min(bounds.top, window.innerHeight - menu.getBoundingClientRect().height - 16))}px`;
    };
    positionMenu();
    window.addEventListener('resize', positionMenu);
    document.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      document.removeEventListener('scroll', positionMenu, true);
    };
  }, [isOpen, placement, portalRoot, workspaces, renamingId]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const menu = menuRef.current;
      (
        menu?.querySelector<HTMLElement>('[data-active-workspace]') ??
        menu?.querySelector<HTMLElement>('[role="menuitem"]')
      )?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || renamingId || !renameFocusId.current) return;
    const item = [
      ...(menuRef.current?.querySelectorAll<HTMLElement>(
        '[data-workspace-id]',
      ) ?? []),
    ].find((element) => element.dataset.workspaceId === renameFocusId.current);
    item?.focus({ preventScroll: true });
    renameFocusId.current = null;
  }, [isOpen, renamingId]);

  const startRename = (workspace: WorkspaceConfig) => {
    renameFocusId.current = workspace.id;
    setRenamingId(workspace.id);
    setRenameText(workspace.name);
  };

  const finishRename = () => {
    if (renamingId && renameText.trim()) {
      onRenameWorkspace(renamingId, renameText.trim());
    }
    setRenamingId(null);
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setRenamingId(null);
    }
  };

  const menu = (
    <Popover
      open={isOpen}
      ref={menuRef}
      data-toolbar-owner={toolbarOwner}
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="workspace-selector-trigger"
      onKeyDown={(event) => {
        if (event.target instanceof HTMLInputElement) return;
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
          return;
        event.preventDefault();
        const items = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            '[role="menuitem"]',
          ),
        ];
        const current = items.indexOf(document.activeElement as HTMLElement);
        const index =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : (current +
                  (event.key === 'ArrowDown' ? 1 : -1) +
                  items.length) %
                items.length;
        items[index]?.focus();
      }}
      className={classNames(
        'dashboard-popover-surface liquid-glass-surface z-50 rounded-xl p-1.5',
        placement === 'right'
          ? 'fixed overflow-y-auto'
          : 'absolute top-full right-0 mt-1.5 min-w-[240px] max-w-[280px]',
      )}
    >
      <div
        role="heading"
        aria-level={2}
        className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-theme-text-secondary"
      >
        Рабочие пространства
      </div>

      <div className="max-h-[260px] overflow-y-auto space-y-0.5 py-1">
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeWorkspace?.id;
          const isRenaming = renamingId === workspace.id;

          if (isRenaming) {
            return (
              <div
                key={workspace.id}
                className="flex items-center gap-1.5 px-2 py-1"
              >
                <input
                  autoFocus
                  aria-label="Название пространства"
                  type="text"
                  maxLength={64}
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={handleRenameKeyDown}
                  className="w-full rounded border border-theme-accent bg-theme-surface-muted/80 px-2 py-0.5 text-xs text-theme-text-primary focus:outline-none"
                />
              </div>
            );
          }

          return (
            <div
              key={workspace.id}
              className={classNames(
                'group flex items-center justify-between rounded-lg px-2 py-1 text-xs transition-colors',
                isActive
                  ? 'bg-theme-surface-muted/60 font-medium text-theme-text-primary'
                  : 'text-theme-text-secondary hover:bg-theme-surface-hover/60 hover:text-theme-text-primary',
              )}
            >
              <button
                type="button"
                role="menuitem"
                data-active-workspace={isActive || undefined}
                data-workspace-id={workspace.id}
                onClick={() => {
                  onSwitchWorkspace(workspace.id);
                  closeMenu();
                  triggerRef.current?.focus();
                }}
                className="flex items-center gap-2 flex-1 min-w-0 rounded text-left cursor-pointer py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
              >
                {isActive ? (
                  <CheckIcon className="size-3.5 shrink-0 text-theme-accent" />
                ) : (
                  <span className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{workspace.name}</span>
              </button>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                <IconButton
                  aria-label="Переименовать"
                  size="xs"
                  title="Переименовать"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(workspace);
                  }}
                >
                  <PencilIcon className="size-3.5" />
                </IconButton>
                <IconButton
                  aria-label="Дублировать"
                  size="xs"
                  title="Дублировать"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateWorkspace(workspace.id);
                  }}
                >
                  <DuplicateIcon className="size-3.5" />
                </IconButton>
                {workspaces.length > 1 && (
                  <IconButton
                    aria-label="Удалить"
                    size="xs"
                    title="Удалить"
                    variant="danger-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWorkspace(workspace.id);
                    }}
                  >
                    <TrashIcon className="size-3.5" />
                  </IconButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="my-1 border-t border-theme-border/40" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onAddWorkspace();
          closeMenu();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-theme-text-secondary transition-colors hover:bg-theme-surface-hover/60 hover:text-theme-text-primary cursor-pointer"
      >
        <PlusIcon className="size-3.5 shrink-0" />
        <span>Создать пространство</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          closeMenu();
          triggerRef.current?.focus();
          onOpenManager();
        }}
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-theme-text-secondary transition-colors hover:bg-theme-surface-hover/60 hover:text-theme-text-primary cursor-pointer"
      >
        <LayersIcon className="size-3.5 shrink-0" />
        <span>Управление пространствами...</span>
      </button>
    </Popover>
  );

  return (
    <div ref={bindContainer} className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        id="workspace-selector-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Пространство: ${activeWorkspace?.name ?? 'Пространство'}`}
        disabled={!canManage}
        title={`${compact ? `Пространство: ${activeWorkspace?.name ?? 'Пространство'}` : 'Рабочие пространства'}${toggleShortcut ? ` (${toggleShortcut})` : ''}`}
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            onOpenChange(true);
          }
        }}
        className={classNames(
          compact
            ? 'flex size-10 shrink-0 items-center justify-center rounded-md text-theme-text-primary hover:bg-theme-surface-elevated focus-visible:outline-2 focus-visible:outline-theme-ring disabled:opacity-50 disabled:pointer-events-none'
            : 'flex items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/50 px-2.5 py-1 text-sm font-medium text-theme-text-primary shadow-xs transition-colors hover:bg-theme-surface-hover hover:border-theme-border focus-visible:outline-2 focus-visible:outline-theme-accent disabled:opacity-50 disabled:pointer-events-none',
          isOpen && 'bg-theme-surface-muted/80 border-theme-border',
        )}
      >
        <LayersIcon
          className={
            compact
              ? 'size-6 shrink-0'
              : 'size-4 shrink-0 text-theme-text-secondary'
          }
        />
        {!compact && (
          <>
            <span className="max-w-[120px] truncate text-left">
              {activeWorkspace?.name ?? 'Пространство'}
            </span>
            <ChevronDownIcon
              className={classNames(
                'size-3.5 shrink-0 text-theme-text-secondary transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </>
        )}
      </button>

      {placement === 'right'
        ? portalRoot && menu
          ? createPortal(menu, portalRoot)
          : null
        : menu}
    </div>
  );
}
