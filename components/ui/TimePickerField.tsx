import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

import { Button } from './Button';
import { classNames } from './class-names';
import { PickerField, type PickerFieldProps } from './PickerField';

function TimeColumn({
  label,
  count,
  value,
  initialFocus,
  onSelect,
}: {
  label: string;
  count: number;
  value: number;
  initialFocus?: boolean;
  onSelect: (value: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    // The parent promotes the panel to the top layer after child effects run.
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      const selected = list?.querySelector<HTMLElement>(
        '[aria-selected="true"]',
      );
      if (list && selected)
        list.scrollTop =
          selected.offsetTop - (list.clientHeight - selected.clientHeight) / 2;
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const keyDown = (event: KeyboardEvent) => {
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (value + 1) % count;
        break;
      case 'ArrowUp':
        next = (value - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    onSelect(next);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-time-value="${next}"]`)
      ?.focus({ preventScroll: true });
  };
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="text-center text-xs font-medium text-theme-text-secondary">
        {label}
      </div>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        className="relative h-32 overflow-y-auto overscroll-contain rounded-lg bg-theme-surface p-1"
        onKeyDown={keyDown}
      >
        {Array.from({ length: count }, (_, index) => (
          <button
            key={index}
            type="button"
            role="option"
            aria-selected={index === value}
            data-time-value={index}
            data-picker-initial-focus={
              initialFocus && index === value ? '' : undefined
            }
            tabIndex={index === value ? 0 : -1}
            className={classNames(
              'flex min-h-7 w-full cursor-pointer items-center justify-center rounded-md px-2 py-1 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring',
              index === value
                ? 'bg-theme-accent font-semibold text-theme-accent-text'
                : 'hover:bg-theme-surface-muted',
            )}
            onClick={() => onSelect(index)}
          >
            {String(index).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}

function TimePanel({
  value,
  onValueChange,
  close,
}: {
  value: string;
  onValueChange: (value: string) => void;
  close: () => void;
}) {
  const [suggestion] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const current = value || suggestion;
  const [hours, minutes] = current.split(':').map(Number);
  const select = (hour: number, minute: number) =>
    onValueChange(
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    );
  return (
    <div className="w-[max(10rem,14em)] max-w-full space-y-2">
      <div className="flex gap-2">
        <TimeColumn
          label="Часы"
          count={24}
          value={hours!}
          initialFocus
          onSelect={(hour) => select(hour, minutes!)}
        />
        <TimeColumn
          label="Минуты"
          count={60}
          value={minutes!}
          onSelect={(minute) => select(hours!, minute)}
        />
      </div>
      <div className="flex justify-between gap-2 border-t border-theme-border pt-2">
        <Button
          size="xs"
          className="picker-action"
          variant="ghost"
          onClick={() => {
            onValueChange('');
            close();
          }}
        >
          Без времени
        </Button>
        <Button
          size="xs"
          className="picker-action"
          onClick={() => {
            onValueChange(current);
            close();
          }}
        >
          Готово
        </Button>
      </div>
    </div>
  );
}

export function TimePickerField(props: PickerFieldProps) {
  return <PickerField {...props} type="time" panel={TimePanel} />;
}
