import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ToolbarMode } from '../storage/schema';

interface DashboardToolbarOptions {
  mode: ToolbarMode;
  isEditing: boolean;
  resetEpoch: number;
  onCollapse: () => void;
}

export function useDashboardToolbar({
  mode,
  isEditing,
  resetEpoch,
  onCollapse,
}: DashboardToolbarOptions) {
  const toolbarId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLButtonElement>(null);
  const focusOnOpenRef = useRef(false);
  const focusOnCloseRef = useRef(false);
  const [state, setState] = useState({
    mode,
    resetEpoch,
    isEditing,
    open: false,
  });
  const reset = state.mode !== mode || state.resetEpoch !== resetEpoch;
  const enteredEditing = !state.isEditing && isEditing;
  const open = !reset && (state.open || enteredEditing);
  if (reset || state.isEditing !== isEditing) {
    setState({ mode, resetEpoch, isEditing, open });
  }
  const isOpen = mode !== 'left-collapsible' || open;

  const expand = useCallback((focus = false) => {
    focusOnOpenRef.current = focus;
    setState((current) => ({ ...current, open: true }));
    if (focus && panelRef.current && !panelRef.current.hasAttribute('inert')) {
      panelRef.current
        .querySelector<HTMLButtonElement>(
          '[data-toolbar-actions] button:not(:disabled):not([inert] button)',
        )
        ?.focus({ preventScroll: true });
      focusOnOpenRef.current = false;
    }
  }, []);

  const collapse = useCallback(
    (restoreFocus = true) => {
      focusOnOpenRef.current = false;
      setState((current) => ({ ...current, open: false }));
      onCollapse();
      focusOnCloseRef.current = restoreFocus;
    },
    [onCollapse],
  );

  const toggle = useCallback(() => {
    if (isOpen) collapse();
    else expand(true);
  }, [isOpen, collapse, expand]);

  useLayoutEffect(() => {
    if (!isOpen && focusOnCloseRef.current) {
      revealRef.current?.focus({ preventScroll: true });
      focusOnCloseRef.current = false;
    }
    if (
      isOpen &&
      (focusOnOpenRef.current ||
        document.activeElement === revealRef.current) &&
      !document.querySelector('dialog[open]')
    ) {
      panelRef.current
        ?.querySelector<HTMLButtonElement>(
          '[data-toolbar-actions] button:not(:disabled):not([inert] button)',
        )
        ?.focus({ preventScroll: true });
      focusOnOpenRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode !== 'left-collapsible' || !isOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (
        document.querySelector('dialog[open]') ||
        !(event.target instanceof Element)
      )
        return;
      const popover = event.target.closest('[data-toolbar-owner]');
      if (
        panelRef.current?.contains(event.target) ||
        revealRef.current?.contains(event.target) ||
        popover?.getAttribute('data-toolbar-owner') === toolbarId
      )
        return;
      collapse(false);
    };
    // Let the target receive the full click before the canvas moves back.
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [mode, isOpen, toolbarId, collapse]);

  useEffect(() => {
    if (mode !== 'left-collapsible' || !isOpen || isEditing) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        document.querySelector('dialog[open]')
      )
        return;
      event.preventDefault();
      collapse();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [mode, isOpen, isEditing, collapse]);

  const getReturnFocus = useCallback(() => {
    if (mode === 'left-collapsible' && !isOpen) return revealRef.current;
    return (
      panelRef.current?.querySelector<HTMLButtonElement>(
        '[aria-label="Настройки"]:not(:disabled)',
      ) ?? revealRef.current
    );
  }, [mode, isOpen]);

  return {
    toolbarId,
    panelRef,
    revealRef,
    isOpen,
    expand,
    collapse,
    toggle,
    getReturnFocus,
  };
}
