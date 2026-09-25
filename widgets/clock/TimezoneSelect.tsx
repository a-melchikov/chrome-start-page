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
import { formatTimezoneLabel, getAvailableTimezones } from './time-utils';

export interface TimezoneSelectProps {
  id?: string;
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
}

export function TimezoneSelect({
  id,
  value,
  onChange,
  className,
}: TimezoneSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const allTimezones = useMemo(() => getAvailableTimezones(), []);

  const filteredTimezones = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return allTimezones;
    }
    return allTimezones.filter((tz) => {
      const matchIana = tz.toLowerCase().includes(q);
      const label = formatTimezoneLabel(tz).toLowerCase();
      return matchIana || label.includes(q);
    });
  }, [allTimezones, searchQuery]);

  const showLocalOption = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return 'локальное время (системный)'.includes(q) || 'local'.includes(q);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      // Focus search input on open
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });

      const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDownOutside);
      document.addEventListener('touchstart', handlePointerDownOutside);

      return () => {
        document.removeEventListener('mousedown', handlePointerDownOutside);
        document.removeEventListener('touchstart', handlePointerDownOutside);
      };
    }
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation();
      setIsOpen(false);
    }
  };

  const selectedDisplayLabel =
    value === 'local'
      ? 'Локальное время (системный)'
      : `${formatTimezoneLabel(value)} (${value})`;

  return (
    <div
      ref={containerRef}
      className={classNames('relative w-full', className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
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
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="truncate pr-2">{selectedDisplayLabel}</span>
        <ChevronDownIcon
          className={classNames(
            'size-4 shrink-0 text-theme-text-muted transition-transform duration-200',
            isOpen && 'rotate-180 text-theme-text-primary',
          )}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 flex-col rounded-lg border border-theme-border bg-theme-surface-elevated p-1.5 shadow-xl backdrop-blur-md"
          id={listboxId}
          role="listbox"
        >
          {/* Integrated Search Input */}
          <div className="relative mb-1.5 shrink-0 px-1 pt-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-theme-text-muted" />
            <input
              ref={searchInputRef}
              aria-label="Поиск города или пояса"
              className="h-8 w-full rounded-md border border-theme-border bg-theme-surface pl-8 pr-2.5 text-xs text-theme-text-primary placeholder:text-theme-text-muted outline-none transition-colors focus:border-theme-accent"
              placeholder="Поиск города или пояса..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Options List */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
            {showLocalOption ? (
              <button
                aria-selected={value === 'local'}
                className={classNames(
                  'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                  value === 'local'
                    ? 'bg-theme-accent/15 font-semibold text-theme-accent'
                    : 'text-theme-text-primary hover:bg-theme-surface hover:text-theme-text-primary',
                )}
                role="option"
                type="button"
                onClick={() => {
                  onChange('local');
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                <span>Локальное время (системный)</span>
                {value === 'local' ? (
                  <CheckIcon className="size-3.5 shrink-0 text-theme-accent" />
                ) : null}
              </button>
            ) : null}

            {filteredTimezones.map((tz) => {
              const isSelected = value === tz;
              const label = formatTimezoneLabel(tz);

              return (
                <button
                  key={tz}
                  aria-selected={isSelected}
                  className={classNames(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-theme-accent/15 font-semibold text-theme-accent'
                      : 'text-theme-text-primary hover:bg-theme-surface hover:text-theme-text-primary',
                  )}
                  role="option"
                  type="button"
                  onClick={() => {
                    onChange(tz);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <span className="truncate pr-2">
                    {label}{' '}
                    <span className="text-theme-text-muted">({tz})</span>
                  </span>
                  {isSelected ? (
                    <CheckIcon className="size-3.5 shrink-0 text-theme-accent" />
                  ) : null}
                </button>
              );
            })}

            {!showLocalOption && filteredTimezones.length === 0 ? (
              <div className="py-4 text-center text-xs text-theme-text-muted">
                Ничего не найдено
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
