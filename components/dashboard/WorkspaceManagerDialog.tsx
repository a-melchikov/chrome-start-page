import { useState } from 'react';
import type { WorkspaceConfig } from '../../storage/schema';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  DuplicateIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '../icons';
import { Button, Dialog, IconButton } from '../ui';
import { ConfirmWidgetDeleteDialog } from './ConfirmWidgetDeleteDialog';
import { classNames } from '../ui/class-names';

function formatWidgetCountRu(count: number): string {
  if (count === 0) return 'Пустой дашборд';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} виджетов`;
  if (mod10 === 1) return `${count} виджет`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} виджета`;
  return `${count} виджетов`;
}

interface WorkspaceManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: readonly WorkspaceConfig[];
  activeWorkspaceId: string | null;
  onSwitchWorkspace: (id: string) => void;
  onAddWorkspace: (name?: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
  onDuplicateWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
  onReorderWorkspaces: (orderedIds: readonly string[]) => void;
}

export function WorkspaceManagerDialog({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  onSwitchWorkspace,
  onAddWorkspace,
  onRenameWorkspace,
  onDuplicateWorkspace,
  onDeleteWorkspace,
  onReorderWorkspaces,
}: WorkspaceManagerDialogProps) {
  const [workspaceToDelete, setWorkspaceToDelete] =
    useState<WorkspaceConfig | null>(null);
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

  const finishInlineEdit = () => {
    if (editingId && editingName.trim()) {
      onRenameWorkspace(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const handleDeleteClick = (workspace: WorkspaceConfig) => {
    if (workspaces.length <= 1) return;
    if (workspace.widgets.length > 0) {
      setWorkspaceToDelete(workspace);
    } else {
      onDeleteWorkspace(workspace.id);
    }
  };

  const confirmDelete = () => {
    if (workspaceToDelete) {
      onDeleteWorkspace(workspaceToDelete.id);
      setWorkspaceToDelete(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        title="Управление рабочими пространствами"
        description="Создавайте, переименовывайте, сортируйте и удаляйте независимые профили."
        onOpenChange={onOpenChange}
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="secondary"
              size="small"
              onClick={() => onAddWorkspace()}
            >
              <PlusIcon className="size-4" />
              Добавить пространство
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={() => onOpenChange(false)}
            >
              Готово
            </Button>
          </div>
        }
      >
        <div className="space-y-2 py-1 max-h-[380px] overflow-y-auto">
          {workspaces.map((workspace, index) => {
            const isActive = workspace.id === activeWorkspaceId;
            const isEditingThis = editingId === workspace.id;

            return (
              <div
                key={workspace.id}
                className={classNames(
                  'flex items-center justify-between gap-3 rounded-xl border border-theme-border/70 p-2.5 transition-colors',
                  isActive
                    ? 'bg-theme-surface-muted/60 border-theme-accent/50'
                    : 'bg-theme-surface/40 hover:bg-theme-surface-hover/50',
                )}
              >
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

                <div className="flex-1 min-w-0">
                  {isEditingThis ? (
                    <input
                      autoFocus
                      type="text"
                      maxLength={64}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={finishInlineEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishInlineEdit();
                        if (e.key === 'Escape') setEditingId(null);
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

                <div className="flex items-center gap-1 shrink-0">
                  <IconButton
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
                    onClick={() => handleDeleteClick(workspace)}
                  >
                    <TrashIcon className="size-4" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      </Dialog>

      {workspaceToDelete && (
        <ConfirmWidgetDeleteDialog
          open={Boolean(workspaceToDelete)}
          widgetName={workspaceToDelete.name}
          widgetCount={workspaceToDelete.widgets.length}
          onCancel={() => setWorkspaceToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
