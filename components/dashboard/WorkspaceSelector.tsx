import {
  useCallback,
  useEffect,
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

interface WorkspaceSelectorProps {
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
  const triggerRef = useRef<HTMLButtonElement>(null);
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
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
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

  const startRename = (workspace: WorkspaceConfig) => {
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

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        id="workspace-selector-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Пространство: ${activeWorkspace?.name ?? 'Пространство'}`}
        disabled={!canManage}
        title="Рабочие пространства (W)"
        onClick={() => {
          if (isOpen) {
            closeMenu();
          } else {
            onOpenChange(true);
          }
        }}
        className={classNames(
          'flex items-center gap-1.5 rounded-lg border border-theme-border/60 bg-theme-surface/50 px-2.5 py-1 text-sm font-medium text-theme-text-primary shadow-xs transition-colors hover:bg-theme-surface-hover hover:border-theme-border focus-visible:outline-2 focus-visible:outline-theme-accent disabled:opacity-50 disabled:pointer-events-none',
          isOpen && 'bg-theme-surface-muted/80 border-theme-border',
        )}
      >
        <LayersIcon className="size-4 shrink-0 text-theme-text-secondary" />
        <span className="max-w-[120px] truncate text-left">
          {activeWorkspace?.name ?? 'Пространство'}
        </span>
        <ChevronDownIcon
          className={classNames(
            'size-3.5 shrink-0 text-theme-text-muted transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="workspace-selector-trigger"
          className="dashboard-popover-surface liquid-glass-surface absolute top-full right-0 mt-1.5 z-50 min-w-[240px] max-w-[280px] rounded-xl p-1.5"
        >
          <div
            role="heading"
            aria-level={2}
            className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-theme-text-muted"
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
                    onClick={() => {
                      onSwitchWorkspace(workspace.id);
                      closeMenu();
                    }}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer py-0.5"
                  >
                    {isActive ? (
                      <CheckIcon className="size-3.5 shrink-0 text-theme-accent" />
                    ) : (
                      <span className="size-3.5 shrink-0" />
                    )}
                    <span className="truncate">{workspace.name}</span>
                  </button>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
              onOpenManager();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-theme-text-secondary transition-colors hover:bg-theme-surface-hover/60 hover:text-theme-text-primary cursor-pointer"
          >
            <LayersIcon className="size-3.5 shrink-0" />
            <span>Управление пространствами...</span>
          </button>
        </div>
      )}
    </div>
  );
}
