import {
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentType,
} from 'react';

import { CalendarIcon, ClockIcon } from '../icons';
import { IconButton } from './IconButton';
import { Input } from './Input';

export interface PickerFieldProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'value' | 'onChange' | 'children'
> {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface PickerPanelProps {
  value: string;
  onValueChange: (value: string) => void;
  close: () => void;
}

interface PickerShellProps extends PickerFieldProps {
  type: 'date' | 'time';
  panel: ComponentType<PickerPanelProps>;
  placement?: 'auto' | 'below';
}

// Keep the native segmented editor, but render our picker in the top layer.
// A body portal would be inert behind the modal; a normal dropdown is clipped.
export function PickerField({
  type,
  value,
  onValueChange,
  open,
  onOpenChange,
  panel: Panel,
  placement = 'auto',
  ...inputProps
}: PickerShellProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const changeRef = useRef(onOpenChange);
  useLayoutEffect(() => {
    changeRef.current = onOpenChange;
  });
  const panelId = `${inputProps.id}-picker`;
  const label = type === 'date' ? 'Выбор даты' : 'Выбор времени';
  const close = () => {
    onOpenChange(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const field = fieldRef.current;
    if (!panel || !field) return;
    panel.showPopover();

    const position = () => {
      const scrollTop = panel.scrollTop;
      const anchor = field.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const gap = 6;
      const edge = 8;
      const below = Math.max(0, top + height - anchor.bottom - gap - edge);
      const above = Math.max(0, anchor.top - top - gap - edge);
      panel.style.maxWidth = `${Math.max(0, width - edge * 2)}px`;
      panel.style.maxHeight = `${Math.max(below, above)}px`;
      const bounds = panel.getBoundingClientRect();
      const placeBelow =
        placement === 'below' || bounds.height <= below || below >= above;
      panel.style.maxHeight = `${placeBelow ? below : above}px`;
      panel.style.left = `${Math.max(left + edge, Math.min(anchor.left, left + width - bounds.width - edge))}px`;
      panel.style.top = `${placeBelow ? anchor.bottom + gap : anchor.top - gap - Math.min(bounds.height, above)}px`;
      panel.scrollTop = scrollTop;
    };
    const handleScroll = (event: Event) => {
      if (event.target instanceof Node && panel.contains(event.target)) return;
      position();
    };
    position();
    panel.querySelector<HTMLElement>('[data-picker-initial-focus]')?.focus({
      preventScroll: true,
    });

    const contains = (target: EventTarget | null) =>
      target instanceof Node && field.contains(target);
    const dismiss = (event: MouseEvent) => {
      if (contains(event.target)) return;
      // A click on the modal backdrop dismisses only this picker first.
      if (event.target === field.closest('dialog')) event.stopPropagation();
      changeRef.current(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      changeRef.current(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    observer.observe(field);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('click', dismiss, true);
    document.addEventListener('keydown', escape, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('click', dismiss, true);
      document.removeEventListener('keydown', escape, true);
      panel.hidePopover();
    };
  }, [open, placement]);

  const Icon = type === 'date' ? CalendarIcon : ClockIcon;
  return (
    <div ref={fieldRef} className="relative">
      <Input
        {...inputProps}
        type={type}
        value={value}
        className="themed-picker-input pr-11 tabular-nums"
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          inputProps.onKeyDown?.(event);
          if (
            !event.defaultPrevented &&
            ((event.altKey && event.key === 'ArrowDown') ||
              event.key === 'F4' ||
              event.key === ' ')
          ) {
            event.preventDefault();
            onOpenChange(!open);
          }
        }}
      />
      <IconButton
        ref={triggerRef}
        size="small"
        variant="ghost"
        className="absolute top-0 right-0"
        aria-label={type === 'date' ? 'Открыть календарь' : 'Выбрать время'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={inputProps.disabled}
        onClick={() => onOpenChange(!open)}
      >
        <Icon className="size-4" />
      </IconButton>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          popover="manual"
          role="dialog"
          aria-label={label}
          className="themed-picker-panel fixed m-0 overflow-y-auto overscroll-contain rounded-xl border border-theme-border bg-theme-surface-elevated p-2 text-xs text-theme-text-primary shadow-xl"
        >
          <Panel value={value} onValueChange={onValueChange} close={close} />
        </div>
      ) : null}
    </div>
  );
}
