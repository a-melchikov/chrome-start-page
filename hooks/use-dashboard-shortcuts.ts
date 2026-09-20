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
}: DashboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      // Allow Escape to close help dialog or exit editing
      if (event.key === 'Escape') {
        if (!document.querySelector('dialog[open]') && isEditing) {
          event.preventDefault();
          onToggleEditing();
        }
        return;
      }

      // Ignore all other shortcuts when typing in editable elements
      if (isEditableElement(event.target)) {
        return;
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
        const hasOpenDialog = Boolean(document.querySelector('dialog[open]'));

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
      if (document.querySelector('dialog[open]')) {
        return;
      }

      if (hasModifiers) {
        return;
      }

      // Focus search widget: '/' (without Shift/Ctrl/Alt/Meta)
      if ((event.code === 'Slash' || event.key === '/') && !event.shiftKey) {
        const searchInput = document.querySelector<HTMLInputElement>(
          'form[role="search"] input[type="search"], .widget-search-field',
        );

        if (searchInput) {
          event.preventDefault();
          searchInput.focus();
          searchInput.select();
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
  ]);
}
