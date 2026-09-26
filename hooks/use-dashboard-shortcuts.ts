import { useEffect } from 'react';

export interface DashboardShortcutsOptions {
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

      const hasOpenDialog = Boolean(document.querySelector('dialog[open]'));
      if (
        event.code === 'KeyK' &&
        event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
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
        if (!event.shiftKey && event.code === 'KeyD' && selectedCount > 0) {
          event.preventDefault();
          onDuplicateSelection?.();
          return;
        }
      }

      // Modifiers check: standard single-key shortcuts shouldn't fire with Ctrl, Alt, Meta
      const hasModifiers = event.ctrlKey || event.metaKey || event.altKey;

      // Handle Help toggle: '?' (with Shift) or 'F1'
      const isHelpKey =
        !hasModifiers &&
        (event.key === '?' ||
          event.code === 'F1' ||
          (event.code === 'Slash' && event.shiftKey));

      if (isHelpKey) {
        if (isHelpOpen) {
          event.preventDefault();
          onCloseHelp();
          return;
        }

        if (!hasOpenDialog && canManageWidgets) {
          event.preventDefault();
          onOpenHelp();
          return;
        }
      }

      // For all other shortcuts, block if any dialog is currently open
      if (hasOpenDialog) {
        return;
      }

      if (hasModifiers) {
        return;
      }

      // Open command palette: '/' (without Shift/Ctrl/Alt/Meta)
      if ((event.code === 'Slash' || event.key === '/') && !event.shiftKey) {
        if (canManageWidgets) {
          event.preventDefault();
          onOpenPalette();
        }
        return;
      }

      if (!canManageWidgets) {
        return;
      }

      // Toggle edit mode: 'E'
      if (event.code === 'KeyE') {
        event.preventDefault();
        onToggleEditing();
        return;
      }

      // Edit-mode only shortcuts
      if (isEditing) {
        if (selectedCount > 0 && event.code === 'KeyD' && !event.shiftKey) {
          event.preventDefault();
          onDuplicateSelection?.();
          return;
        }

        if (
          selectedCount > 0 &&
          (event.code === 'Delete' || event.code === 'Backspace')
        ) {
          event.preventDefault();
          onRequestDeleteSelection?.();
          return;
        }

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

        if (event.code === 'KeyA') {
          event.preventDefault();
          onOpenAddWidget();
          return;
        }

        if (event.code === 'KeyP' || event.code === 'KeyO') {
          event.preventDefault();
          onOpenAppearance();
          return;
        }

        if (event.code === 'KeyB') {
          event.preventDefault();
          onOpenBackup();
          return;
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
