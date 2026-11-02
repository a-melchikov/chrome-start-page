import { useRef, useState } from 'react';
import type { TrashedWorkspace, WorkspaceConfig } from '../../storage/schema';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  DuplicateIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '../icons';
import { Button, IconButton } from '../ui';
import { classNames } from '../ui/class-names';
import { SettingsBlock } from './SettingsBlock';

function formatWidgetCountRu(count: number): string {
  if (count === 0) return 'Пустой дашборд';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} виджетов`;
  if (mod10 === 1) return `${count} виджет`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} виджета`;
  return `${count} виджетов`;
}

interface WorkspaceSettingsProps {
  workspaces: readonly WorkspaceConfig[];
  activeWorkspaceId: string | null;
  onSwitchWorkspace: (id: string) => void;
  onAddWorkspace: (name?: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDuplicateWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onReorderWorkspaces: (orderedIds: readonly string[]) => void;
  trashedWorkspaces?: readonly TrashedWorkspace[];
  onRestoreWorkspace: (id: string) => void;
  onPurgeWorkspace: (id: string) => void;
  isProcessing: boolean;
  notice: string | null;
  error: string | null;
}

export function WorkspaceSettings({
  workspaces,
  activeWorkspaceId,
  onSwitchWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onReorderWorkspaces,
  trashedWorkspaces = [],
  onRestoreWorkspace,
  onPurgeWorkspace,
  isProcessing,
  notice,
  error,
}: WorkspaceSettingsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const ids = workspaces.map((w) => w.id);
    const temp = ids[index - 1]!;
    ids[index - 1] = ids[index]!;
    ids[index] = temp;
    onReorderWorkspaces(ids);
  };

  const handleMoveDown = (index: number) => {
    if (index >= workspaces.length - 1) return;
    const ids = workspaces.map((w) => w.id);
    const temp = ids[index + 1]!;
    ids[index + 1] = ids[index]!;
    ids[index] = temp;
    onReorderWorkspaces(ids);
  };

  const startInlineEdit = (workspace: WorkspaceConfig) => {
    setEditingId(workspace.id);
    setEditingName(workspace.name);
  };

  const focusRenameButton = (id: string) => {
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
        '[data-rename-workspace]',
      );
      [...(buttons ?? [])]
        .find((button) => button.dataset.renameWorkspace === id)
        ?.focus();
    });
  };

  const finishInlineEdit = () => {
    if (editingId && editingName.trim()) {
      onRenameWorkspace(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      <SettingsBlock blockId="workspaces.active" title="Список пространств">
        <fieldset disabled={isProcessing} className="min-w-0 space-y-4">
          <Button
            data-workspace-manager-focus
            variant="secondary"
            size="small"
            onClick={() => onAddWorkspace()}
          >
            <PlusIcon className="size-4" />
            Добавить пространство
          </Button>
          <div ref={listRef} className="space-y-3">
            {workspaces.map((workspace, index) => {
              const isActive = workspace.id === activeWorkspaceId;
              const isEditingThis = editingId === workspace.id;

              return (
                <div
                  key={workspace.id}
                  className={classNames(
                    'space-y-2 rounded-xl border border-theme-border/70 p-2.5 transition-colors',
                    isActive
                      ? 'bg-theme-surface-muted/60 border-theme-accent/50'
                      : 'bg-theme-surface/40 hover:bg-theme-surface-hover/50',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <IconButton
                        aria-label="Переместить вверх"
                        disabled={index === 0}
                        size="xs"
                        title="Переместить вверх"
                        variant="ghost"
                        onClick={() => handleMoveUp(index)}
                      >
                        <ArrowUpIcon className="size-4" />
                      </IconButton>
                      <IconButton
                        aria-label="Переместить вниз"
                        disabled={index === workspaces.length - 1}
                        size="xs"
                        title="Переместить вниз"
                        variant="ghost"
                        onClick={() => handleMoveDown(index)}
                      >
                        <ArrowDownIcon className="size-4" />
                      </IconButton>
                    </div>

                    <div className="min-w-24 flex-1">
                      {isEditingThis ? (
                        <input
                          autoFocus
                          aria-label="Название пространства"
                          type="text"
                          maxLength={64}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={finishInlineEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              finishInlineEdit();
                              focusRenameButton(workspace.id);
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingId(null);
                              focusRenameButton(workspace.id);
                            }
                          }}
                          className="w-full rounded-lg border border-theme-accent bg-theme-surface-muted px-2.5 py-1 text-sm font-medium text-theme-text-primary focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startInlineEdit(workspace)}
                            title="Нажмите, чтобы переименовать"
                            className="truncate text-left text-sm font-medium text-theme-text-primary hover:underline cursor-pointer"
                          >
                            {workspace.name}
                          </button>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-theme-accent/15 px-2 py-0.5 text-[11px] font-semibold text-theme-accent">
                              <CheckIcon className="size-3" />
                              Текущее
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-theme-text-secondary mt-0.5">
                        {formatWidgetCountRu(workspace.widgets.length)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      data-rename-workspace={workspace.id}
                      aria-label="Переименовать пространство"
                      size="small"
                      title="Переименовать"
                      variant="ghost"
                      onClick={() => startInlineEdit(workspace)}
                    >
                      <PencilIcon className="size-4" />
                    </IconButton>
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => onSwitchWorkspace(workspace.id)}
                      >
                        Переключить
                      </Button>
                    )}
                    <IconButton
                      aria-label="Дублировать пространство"
                      size="small"
                      title="Дублировать"
                      variant="ghost"
                      onClick={() => onDuplicateWorkspace(workspace.id)}
                    >
                      <DuplicateIcon className="size-4" />
                    </IconButton>
                    <IconButton
                      aria-label="Удалить пространство"
                      disabled={workspaces.length <= 1}
                      size="small"
                      title={
                        workspaces.length <= 1
                          ? 'Нельзя удалить единственное пространство'
                          : 'Удалить'
                      }
                      variant="danger-ghost"
                      onClick={() => onDeleteWorkspace(workspace.id)}
                    >
                      <TrashIcon className="size-4" />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      </SettingsBlock>

      {notice ? (
        <p role="status" className="mt-3 text-sm text-theme-text-secondary">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-theme-danger">
          {error}
        </p>
      ) : null}
      <SettingsBlock
        blockId="workspaces.trash"
        title={`Корзина (${trashedWorkspaces.length})`}
        className="mt-6"
      >
        <p className="text-xs text-theme-text-secondary">
          Пространства хранятся до явного удаления из корзины. Виджеты,
          изображения и оформление можно восстановить.
        </p>
        {trashedWorkspaces.length === 0 ? (
          <p className="text-sm text-theme-text-secondary">Корзина пуста</p>
        ) : (
          <ul className="space-y-3">
            {trashedWorkspaces.map(({ workspace, deletedAt }) => (
              <li
                key={workspace.id}
                className="space-y-2 rounded-lg border border-theme-border p-3"
              >
                <p className="break-words text-sm font-medium">
                  {workspace.name}
                </p>
                <p className="text-xs text-theme-text-secondary">
                  {formatWidgetCountRu(workspace.widgets.length)} · Удалено{' '}
                  {new Intl.DateTimeFormat('ru-RU', {
                    dateStyle: 'medium',
                  }).format(deletedAt)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={isProcessing}
                    aria-label={`Восстановить пространство «${workspace.name}»`}
                    onClick={() => onRestoreWorkspace(workspace.id)}
                  >
                    Восстановить
                  </Button>
                  <Button
                    size="small"
                    variant="danger-ghost"
                    disabled={isProcessing}
                    aria-label={`Удалить навсегда пространство «${workspace.name}»`}
                    onClick={() => onPurgeWorkspace(workspace.id)}
                  >
                    Удалить навсегда
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsBlock>
    </>
  );
}
