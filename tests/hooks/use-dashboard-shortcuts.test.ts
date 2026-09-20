import { renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';

import {
  type DashboardShortcutsOptions,
  useDashboardShortcuts,
} from '../../hooks/use-dashboard-shortcuts';

describe('useDashboardShortcuts', () => {
  let defaultOptions: DashboardShortcutsOptions;
  let onToggleEditing: Mock<() => void>;
  let onOpenHelp: Mock<() => void>;
  let onCloseHelp: Mock<() => void>;
  let onOpenAddWidget: Mock<() => void>;
  let onOpenAppearance: Mock<() => void>;
  let onOpenBackup: Mock<() => void>;

  beforeEach(() => {
    onToggleEditing = vi.fn<() => void>();
    onOpenHelp = vi.fn<() => void>();
    onCloseHelp = vi.fn<() => void>();
    onOpenAddWidget = vi.fn<() => void>();
    onOpenAppearance = vi.fn<() => void>();
    onOpenBackup = vi.fn<() => void>();

    defaultOptions = {
      canManageWidgets: true,
      isEditing: false,
      isHelpOpen: false,
      onToggleEditing: () => onToggleEditing(),
      onOpenHelp: () => onOpenHelp(),
      onCloseHelp: () => onCloseHelp(),
      onOpenAddWidget: () => onOpenAddWidget(),
      onOpenAppearance: () => onOpenAppearance(),
      onOpenBackup: () => onOpenBackup(),
    };
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function fireKey(
    keyOrCode: string,
    options: {
      key?: string;
      code?: string;
      shiftKey?: boolean;
      ctrlKey?: boolean;
      altKey?: boolean;
      metaKey?: boolean;
      target?: EventTarget;
    } = {},
  ) {
    const code = options.code ?? keyOrCode;
    const key = options.key ?? keyOrCode;
    const event = new KeyboardEvent('keydown', {
      key,
      code,
      bubbles: true,
      cancelable: true,
      shiftKey: options.shiftKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      altKey: options.altKey ?? false,
      metaKey: options.metaKey ?? false,
    });

    const target = options.target ?? window;
    target.dispatchEvent(event);
    return event;
  }

  describe('editing toggle (KeyE)', () => {
    it('toggles editing on KeyE when shortcuts are enabled', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      const event = fireKey('KeyE', { key: 'e' });
      expect(event.defaultPrevented).toBe(true);
      expect(onToggleEditing).toHaveBeenCalledTimes(1);
    });

    it('works regardless of keyboard layout when code is KeyE', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      // Russian layout sends key 'у', but code 'KeyE'
      const event = fireKey('KeyE', { key: 'у' });
      expect(event.defaultPrevented).toBe(true);
      expect(onToggleEditing).toHaveBeenCalledTimes(1);
    });

    it('does not toggle editing when canManageWidgets is false', () => {
      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, canManageWidgets: false }),
      );

      fireKey('KeyE');
      expect(onToggleEditing).not.toHaveBeenCalled();
    });

    it('does not toggle editing with modifier keys', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      fireKey('KeyE', { ctrlKey: true });
      fireKey('KeyE', { altKey: true });
      fireKey('KeyE', { metaKey: true });

      expect(onToggleEditing).not.toHaveBeenCalled();
    });

    it('does not toggle editing when focused in input', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      const input = document.createElement('input');
      document.body.appendChild(input);
      fireKey('KeyE', { target: input });

      expect(onToggleEditing).not.toHaveBeenCalled();
    });

    it('does not toggle editing when focused in textarea', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      fireKey('KeyE', { target: textarea });

      expect(onToggleEditing).not.toHaveBeenCalled();
    });

    it('does not toggle editing when focused in contenteditable', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      const editable = document.createElement('div');
      editable.setAttribute('contenteditable', 'true');
      document.body.appendChild(editable);
      fireKey('KeyE', { target: editable });

      expect(onToggleEditing).not.toHaveBeenCalled();
    });

    it('does not toggle editing when a dialog is open', () => {
      const dialog = document.createElement('dialog');
      dialog.open = true;
      document.body.appendChild(dialog);

      renderHook(() => useDashboardShortcuts(defaultOptions));

      fireKey('KeyE');
      expect(onToggleEditing).not.toHaveBeenCalled();
    });
  });

  describe('escape key', () => {
    it('exits editing on Escape when editing is active and no dialog is open', () => {
      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, isEditing: true }),
      );

      const event = fireKey('Escape');
      expect(event.defaultPrevented).toBe(true);
      expect(onToggleEditing).toHaveBeenCalledTimes(1);
    });

    it('does not exit editing on Escape when isEditing is false', () => {
      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, isEditing: false }),
      );

      fireKey('Escape');
      expect(onToggleEditing).not.toHaveBeenCalled();
    });

    it('does not handle Escape when a dialog is open', () => {
      const dialog = document.createElement('dialog');
      dialog.open = true;
      document.body.appendChild(dialog);

      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, isEditing: true }),
      );

      fireKey('Escape');
      expect(onToggleEditing).not.toHaveBeenCalled();
    });
  });

  describe('help shortcuts (? / F1)', () => {
    it('opens help on question mark (?) key', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      const event = fireKey('Slash', { key: '?', shiftKey: true });
      expect(event.defaultPrevented).toBe(true);
      expect(onOpenHelp).toHaveBeenCalledTimes(1);
    });

    it('opens help on F1 key', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      const event = fireKey('F1');
      expect(event.defaultPrevented).toBe(true);
      expect(onOpenHelp).toHaveBeenCalledTimes(1);
    });

    it('closes help if help dialog is already open', () => {
      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, isHelpOpen: true }),
      );

      const event = fireKey('Slash', { key: '?', shiftKey: true });
      expect(event.defaultPrevented).toBe(true);
      expect(onCloseHelp).toHaveBeenCalledTimes(1);
    });

    it('does not open help when another dialog is open', () => {
      const dialog = document.createElement('dialog');
      dialog.open = true;
      document.body.appendChild(dialog);

      renderHook(() => useDashboardShortcuts(defaultOptions));

      fireKey('Slash', { key: '?', shiftKey: true });
      expect(onOpenHelp).not.toHaveBeenCalled();
    });
  });

  describe('search widget focus (/)', () => {
    it('focuses and selects search input on Slash key', () => {
      const form = document.createElement('form');
      form.setAttribute('role', 'search');
      const input = document.createElement('input');
      input.type = 'search';
      input.value = 'query';
      const focusSpy = vi.spyOn(input, 'focus');
      const selectSpy = vi.spyOn(input, 'select');
      form.appendChild(input);
      document.body.appendChild(form);

      renderHook(() => useDashboardShortcuts(defaultOptions));

      const event = fireKey('Slash', { key: '/' });
      expect(event.defaultPrevented).toBe(true);
      expect(focusSpy).toHaveBeenCalled();
      expect(selectSpy).toHaveBeenCalled();
    });

    it('does nothing gracefully if search input does not exist', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      expect(() => fireKey('Slash', { key: '/' })).not.toThrow();
    });

    it('does not trigger search focus when shiftKey is pressed', () => {
      renderHook(() => useDashboardShortcuts(defaultOptions));

      fireKey('Slash', { key: '?', shiftKey: true });
      // Handled by help shortcut, not search
      expect(onOpenHelp).toHaveBeenCalledTimes(1);
    });
  });

  describe('edit-mode actions (A, P, O, B)', () => {
    it('opens add widget dialog on KeyA in edit mode', () => {
      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, isEditing: true }),
      );

      const event = fireKey('KeyA');
      expect(event.defaultPrevented).toBe(true);
      expect(onOpenAddWidget).toHaveBeenCalledTimes(1);
    });

    it('opens appearance dialog on KeyP and KeyO in edit mode', () => {
      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, isEditing: true }),
      );

      fireKey('KeyP');
      expect(onOpenAppearance).toHaveBeenCalledTimes(1);

      fireKey('KeyO');
      expect(onOpenAppearance).toHaveBeenCalledTimes(2);
    });

    it('opens backup dialog on KeyB in edit mode', () => {
      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, isEditing: true }),
      );

      const event = fireKey('KeyB');
      expect(event.defaultPrevented).toBe(true);
      expect(onOpenBackup).toHaveBeenCalledTimes(1);
    });

    it('does not trigger A, P, O, B when not in edit mode', () => {
      renderHook(() =>
        useDashboardShortcuts({ ...defaultOptions, isEditing: false }),
      );

      fireKey('KeyA');
      fireKey('KeyP');
      fireKey('KeyO');
      fireKey('KeyB');

      expect(onOpenAddWidget).not.toHaveBeenCalled();
      expect(onOpenAppearance).not.toHaveBeenCalled();
      expect(onOpenBackup).not.toHaveBeenCalled();
    });
  });
});
