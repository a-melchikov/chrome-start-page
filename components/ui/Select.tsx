import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { CheckIcon, ChevronDownIcon } from '../icons';
import { classNames } from './class-names';

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectChangeEvent {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  dropdownPosition?: 'absolute' | 'static';
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
  'data-dialog-initial-focus'?: boolean | '';
  children?: ReactNode;
  options?: SelectOption[];
  onChange?: (event: SelectChangeEvent) => void;
  onValueChange?: (value: string) => void;
}

function extractOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];

  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) {
        return;
      }

      if (child.type === 'option') {
        const optionProps = child.props as {
          value?: string | number;
          children?: ReactNode;
          disabled?: boolean;
        };
        const val = String(optionProps.value ?? '');
        options.push({
          value: val,
          label: optionProps.children ?? val,
          disabled: Boolean(optionProps.disabled),
        });
      } else if (typeof child.type === 'symbol') {
        // Handle React.Fragment
        const fragmentProps = child.props as { children?: ReactNode };
        visit(fragmentProps.children);
      }
    });
  };

  visit(children);
  return options;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  function Select(
    {
      id,
      name,
      value,
      defaultValue,
      disabled = false,
      className,
      placeholder,
      dropdownPosition = 'absolute',
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-invalid': ariaInvalid,
      'data-dialog-initial-focus': dataDialogInitialFocus,
      children,
      options: optionsProp,
      onChange,
      onValueChange,
    },
    ref,
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(
      value !== undefined
        ? String(value)
        : defaultValue !== undefined
          ? String(defaultValue)
          : '',
    );
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listboxId = useId();

    useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

    const parsedOptions = useMemo(() => {
      if (optionsProp) {
        return optionsProp;
      }
      return extractOptions(children);
    }, [optionsProp, children]);

    const currentValue = value !== undefined ? String(value) : internalValue;

    const selectedOption = parsedOptions.find(
      (opt) => opt.value === currentValue,
    );
    const selectedIndex = parsedOptions.findIndex(
      (opt) => opt.value === currentValue,
    );
    const displayLabel =
      selectedOption?.label ?? (currentValue || placeholder || '');

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);

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
    }, [isOpen, selectedIndex]);

    const handleSelect = (nextValue: string) => {
      if (disabled) {
        return;
      }

      setInternalValue(nextValue);
      setIsOpen(false);
      triggerRef.current?.focus();

      if (nextValue !== currentValue) {
        onValueChange?.(nextValue);
        onChange?.({
          target: { value: nextValue, name },
          currentTarget: { value: nextValue, name },
        });
      }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }

      if (!isOpen) {
        if (
          event.key === 'ArrowDown' ||
          event.key === 'ArrowUp' ||
          event.key === 'Enter' ||
          event.key === ' '
        ) {
          event.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (event.key) {
        case 'Escape': {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        }

        case 'ArrowDown': {
          event.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev + 1;
            return next >= parsedOptions.length ? 0 : next;
          });
          break;
        }

        case 'ArrowUp': {
          event.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? parsedOptions.length - 1 : next;
          });
          break;
        }

        case 'Home': {
          event.preventDefault();
          setHighlightedIndex(0);
          break;
        }

        case 'End': {
          event.preventDefault();
          setHighlightedIndex(parsedOptions.length - 1);
          break;
        }

        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (
            highlightedIndex >= 0 &&
            highlightedIndex < parsedOptions.length
          ) {
            const opt = parsedOptions[highlightedIndex];
            if (opt && !opt.disabled) {
              handleSelect(opt.value);
            }
          }
          break;
        }

        case 'Tab': {
          setIsOpen(false);
          break;
        }

        default:
          break;
      }
    };

    return (
      <div
        ref={containerRef}
        className={classNames('relative w-full', className)}
        onKeyDown={handleKeyDown}
      >
        <button
          ref={triggerRef}
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={classNames(
            'flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-theme-border bg-theme-surface-elevated px-3 text-left text-sm text-theme-text-primary outline-none transition-colors focus-visible:border-theme-accent focus-visible:ring-2 focus-visible:ring-theme-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-theme-danger aria-invalid:ring-theme-danger/30',
            isOpen && 'border-theme-accent ring-2 ring-theme-ring/30',
          )}
          data-dialog-initial-focus={dataDialogInitialFocus ? '' : undefined}
          disabled={disabled}
          id={id}
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev);
            }
          }}
        >
          <span className="truncate pr-2">{displayLabel}</span>
          <ChevronDownIcon
            className={classNames(
              'size-4 shrink-0 text-theme-text-muted transition-transform duration-200',
              isOpen && 'rotate-180 text-theme-text-primary',
            )}
          />
        </button>

        {isOpen && (
          <div
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            className={classNames(
              'z-50 flex max-h-60 flex-col rounded-lg border border-theme-border bg-theme-surface-elevated p-1.5 shadow-xl backdrop-blur-md',
              dropdownPosition === 'static'
                ? 'mt-1.5 w-full'
                : 'absolute left-0 right-0 top-full mt-1',
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
              {parsedOptions.map((option, index) => {
                const isSelected = option.value === currentValue;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={classNames(
                      'flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                      isSelected
                        ? 'bg-theme-accent/15 font-semibold text-theme-accent'
                        : isHighlighted
                          ? 'bg-theme-surface text-theme-text-primary'
                          : 'text-theme-text-primary hover:bg-theme-surface hover:text-theme-text-primary',
                      option.disabled && 'cursor-not-allowed opacity-50',
                    )}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="truncate pr-2">{option.label}</span>
                    {isSelected ? (
                      <CheckIcon className="size-3.5 shrink-0 text-theme-accent" />
                    ) : null}
                  </button>
                );
              })}

              {parsedOptions.length === 0 ? (
                <div className="py-2 text-center text-xs text-theme-text-muted">
                  Нет вариантов
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  },
);
