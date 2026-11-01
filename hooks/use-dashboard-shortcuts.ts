import { useEffect } from 'react';
import {
  bindingFromEvent,
  getCommandBindings,
  sameBinding,
  SHORTCUT_COMMANDS,
  type ShortcutOverrides,
} from '../keyboard/shortcuts';

export interface DashboardShortcutsOptions {
  shortcuts?: ShortcutOverrides;
  canManageWidgets: boolean;
  isEditing: boolean;
  isHelpOpen: boolean;
  onToggleEditing: () => void;
  onOpenHelp: () => void;
  onCloseHelp: () => void;
  onOpenAddWidget: () => void;
  onOpenAppearance: () => void;
  onOpenBackup: () => void;
  onOpenPalette: () => void;
  onToggleToolbar?: () => void;
  onOpenWorkspaceMenu?: () => void;
  selectedCount?: number;
  onClearSelection?: () => void;
  onCopySelection?: () => void;
  onPasteSelection?: (source: string) => void;
  onDuplicateSelection?: () => void;
  onSelectAll?: () => void;
  onToggleFocusedSelection?: (widgetId: string) => void;
  onRequestDeleteSelection?: () => void;
  onMoveSelection?: (deltaX: number, deltaY: number, toEdge: boolean) => void;
  onFinishNudge?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  return (
    target.isContentEditable ||
    Boolean(target.closest?.('[contenteditable="true"], [contenteditable=""]'))
  );
}

export function useDashboardShortcuts({
  shortcuts,
  canManageWidgets,
  isEditing,
  isHelpOpen,
  onToggleEditing,
  onOpenHelp,
  onCloseHelp,
  onOpenAddWidget,
  onOpenAppearance,
  onOpenBackup,
  onOpenPalette,
  onOpenWorkspaceMenu,
  onToggleToolbar,
  selectedCount = 0,
  onClearSelection,
  onCopySelection,
  onPasteSelection,
  onDuplicateSelection,
  onSelectAll,
  onToggleFocusedSelection,
  onRequestDeleteSelection,
  onMoveSelection,
  onFinishNudge,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: DashboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      // Allow Escape to close help dialog or exit editing
      if (event.key === 'Escape') {
        if (
          !document.querySelector('dialog[open]') &&
          isEditing &&
          selectedCount > 0
        ) {
          event.preventDefault();
          onClearSelection?.();
        } else if (!document.querySelector('dialog[open]') && isEditing) {
          event.preventDefault();
          onToggleEditing();
        }
        return;
      }

      if (event.isComposing) return;
      const hasOpenDialog = Boolean(document.querySelector('dialog[open]'));
      const pressed = bindingFromEvent(event);
      let command = SHORTCUT_COMMANDS.find((item) =>
        getCommandBindings(item.id, shortcuts).some((candidate) =>
          sameBinding(candidate, pressed),
        ),
      )?.id;
      // Preserve character shortcuts when a keyboard sends no physical code.
      if (!event.ctrlKey && !event.altKey && !event.metaKey) {
        if (event.key === '?' && shortcuts?.help === undefined)
          command = 'help';
        else if (
          !command &&
          event.key === '/' &&
          !event.shiftKey &&
          shortcuts?.palette === undefined
        )
          command = 'palette';
      }
      if (command === 'palette' && (event.ctrlKey || event.metaKey)) {
        if (!hasOpenDialog && canManageWidgets) {
          event.preventDefault();
          onOpenPalette();
        }
        return;
      }

      // Ignore single-key shortcuts when typing in editable elements
      if (isEditableElement(event.target)) return;

      if (
        isEditing &&
        canManageWidgets &&
        !hasOpenDialog &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        if (event.code === 'KeyZ') {
          if (event.shiftKey ? canRedo : canUndo) {
            event.preventDefault();
            if (event.shiftKey) onRedo?.();
            else onUndo?.();
          }
          return;
        }
        if (!event.shiftKey && event.code === 'KeyA') {
          event.preventDefault();
          onSelectAll?.();
          return;
        }
        if (!event.shiftKey && event.code === 'KeyC' && selectedCount > 0) {
          event.preventDefault();
          onCopySelection?.();
          return;
        }
      }

      if (command === 'help' && isHelpOpen) {
        event.preventDefault();
        onCloseHelp();
        return;
      }
      if (hasOpenDialog || !canManageWidgets) return;
      if (command) {
        if (event.repeat && ['edit', 'toolbar', 'workspace'].includes(command))
          return;
        const actions = {
          edit: onToggleEditing,
          palette: onOpenPalette,
          help: onOpenHelp,
          toolbar: onToggleToolbar,
          workspace: !isEditing ? onOpenWorkspaceMenu : undefined,
          settings: onOpenAppearance,
          backup: onOpenBackup,
          add: isEditing ? onOpenAddWidget : undefined,
          duplicate:
            isEditing && selectedCount > 0 ? onDuplicateSelection : undefined,
          delete:
            isEditing && selectedCount > 0
              ? onRequestDeleteSelection
              : undefined,
        };
        const action = actions[command];
        if (action) {
          event.preventDefault();
          action();
        }
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditing) {
        const directions: Record<string, readonly [number, number]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        const direction = directions[event.code];
        if (selectedCount > 0 && direction) {
          event.preventDefault();
          onMoveSelection?.(direction[0], direction[1], event.shiftKey);
          return;
        }

        if (event.code === 'Space' && onToggleFocusedSelection) {
          const target = event.target;
          if (
            target instanceof HTMLElement &&
            !target.closest('button, a, [role="button"], [data-no-drag]')
          ) {
            const widgetId =
              target.closest<HTMLElement>('[data-widget-id]')?.dataset.widgetId;
            if (widgetId) {
              event.preventDefault();
              onToggleFocusedSelection(widgetId);
              return;
            }
          }
        }
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (
        !isEditing ||
        !canManageWidgets ||
        document.querySelector('dialog[open]') ||
        isEditableElement(event.target)
      )
        return;
      const source = event.clipboardData?.getData('text/plain') ?? '';
      if (!source.includes('chrome-start-page-widgets')) return;
      event.preventDefault();
      onPasteSelection?.(source);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code.startsWith('Arrow')) onFinishNudge?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);
    if (onFinishNudge) window.addEventListener('blur', onFinishNudge);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
      if (onFinishNudge) window.removeEventListener('blur', onFinishNudge);
    };
  }, [
    shortcuts,
    canManageWidgets,
    isEditing,
    isHelpOpen,
    onToggleEditing,
    onOpenHelp,
    onCloseHelp,
    onOpenAddWidget,
    onOpenAppearance,
    onOpenBackup,
    onOpenPalette,
    onOpenWorkspaceMenu,
    onToggleToolbar,
    selectedCount,
    onClearSelection,
    onCopySelection,
    onPasteSelection,
    onDuplicateSelection,
    onSelectAll,
    onToggleFocusedSelection,
    onRequestDeleteSelection,
    onMoveSelection,
    onFinishNudge,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  ]);
}
