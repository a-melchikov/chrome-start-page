import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { CheckIcon, ChevronDownIcon, SearchIcon } from '../../components/icons';
import { classNames } from '../../components/ui/class-names';
import { Popover } from '../../components/ui/Popover';
import { formatTimezoneLabel, getAvailableTimezones } from './time-utils';

export interface TimezoneSelectProps {
  id?: string;
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
  dropdownPosition?: 'absolute' | 'static';
}

export function TimezoneSelect({
  id,
  value,
  onChange,
  className,
  dropdownPosition = 'absolute',
}: TimezoneSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listboxId = useId();
  const allTimezones = useMemo(() => getAvailableTimezones(), []);
  const options = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ['local', ...allTimezones]
      .map((timezone) => ({
        value: timezone,
        label:
          timezone === 'local'
            ? 'Локальное время (системный)'
            : `${formatTimezoneLabel(timezone)} (${timezone})`,
      }))
      .filter(
        (option) =>
          !q || `${option.value} ${option.label}`.toLowerCase().includes(q),
      );
  }, [allTimezones, searchQuery]);

  const openList = () => {
    setSearchQuery('');
    setActiveIndex(Math.max(0, ['local', ...allTimezones].indexOf(value)));
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    const outside = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node))
        setIsOpen(false);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('touchstart', outside);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('touchstart', outside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen)
      optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, isOpen, options]);

  const select = (timezone: string) => {
    onChange(timezone);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length)
        setActiveIndex(
          (index) =>
            (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
            options.length,
        );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) select(option.value);
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const selectedLabel =
    value === 'local'
      ? 'Локальное время (системный)'
      : `${formatTimezoneLabel(value)} (${value})`;

  return (
    <div
      ref={containerRef}
      className={classNames('relative w-full', className)}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        id={id}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={classNames(
          'flex h-10 w-full items-center justify-between rounded-md border border-theme-border bg-theme-surface-elevated px-3 text-left text-sm text-theme-text-primary outline-none transition-colors focus-visible:border-theme-accent focus-visible:ring-2 focus-visible:ring-theme-ring/30',
          isOpen && 'border-theme-accent ring-2 ring-theme-ring/30',
        )}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openList())}
      >
        <span className="truncate pr-2">{selectedLabel}</span>
        <ChevronDownIcon
          className={classNames(
            'size-4 shrink-0 text-theme-text-secondary transition-transform duration-150',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      <Popover
        open={isOpen}
        className={classNames(
          'z-50 flex max-h-72 flex-col rounded-lg border border-theme-border bg-theme-surface-elevated p-1.5 shadow-xl',
          dropdownPosition === 'static'
            ? 'mt-1.5 w-full'
            : 'absolute left-0 right-0 top-full mt-1',
        )}
      >
        <div className="relative mb-1.5 shrink-0 px-1 pt-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-theme-text-secondary" />
          <input
            ref={searchInputRef}
            role="combobox"
            aria-label="Поиск города или пояса"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={isOpen}
            aria-activedescendant={
              isOpen && options[activeIndex]
                ? `${listboxId}-${activeIndex}`
                : undefined
            }
            className="h-8 w-full rounded-md border border-theme-border bg-theme-surface pl-8 pr-2.5 text-xs text-theme-text-primary placeholder:text-theme-text-secondary outline-none focus:border-theme-accent"
            placeholder="Поиск города или пояса…"
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setActiveIndex(0);
            }}
          />
        </div>
        <div
          id={listboxId}
          role="listbox"
          aria-label="Часовые пояса"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${listboxId}-${index}`}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              role="option"
              aria-selected={value === option.value}
              tabIndex={-1}
              type="button"
              className={classNames(
                'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs text-theme-text-primary transition-colors',
                index === activeIndex && 'bg-theme-surface-muted',
                value === option.value && 'font-semibold',
              )}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(option.value)}
            >
              <span className="truncate pr-2">{option.label}</span>
              {value === option.value && (
                <CheckIcon className="size-3.5 shrink-0 text-theme-text-primary" />
              )}
            </button>
          ))}
          {options.length === 0 && (
            <p className="py-4 text-center text-xs text-theme-text-secondary">
              Ничего не найдено
            </p>
          )}
        </div>
      </Popover>
    </div>
  );
}
