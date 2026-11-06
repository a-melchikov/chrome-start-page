import { useRef, useState, type KeyboardEvent } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from '../icons';
import { Button } from './Button';
import { classNames } from './class-names';
import { IconButton } from './IconButton';
import { PickerField, type PickerFieldProps } from './PickerField';

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MIN_YEAR = 1000;
const MAX_YEAR = 9999;
const dayLabel = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'full' });

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function initialDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) &&
    date.getFullYear() >= MIN_YEAR &&
    date.getFullYear() <= MAX_YEAR &&
    dateValue(date) === value
    ? date
    : new Date();
}
function changeMonth(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  next.setDate(
    Math.min(
      date.getDate(),
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(),
    ),
  );
  return next;
}

function Calendar({
  value,
  onValueChange,
  close,
}: {
  value: string;
  onValueChange: (value: string) => void;
  close: () => void;
}) {
  const [cursor, setCursor] = useState(() => initialDate(value));
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const [yearStart, setYearStart] = useState(
    () => Math.floor(cursor.getFullYear() / 12) * 12,
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = dateValue(new Date());
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const pick = (date: Date) => {
    onValueChange(dateValue(date));
    close();
  };
  const move = (date: Date, focus = false) => {
    if (date.getFullYear() < MIN_YEAR || date.getFullYear() > MAX_YEAR) return;
    setCursor(date);
    if (focus)
      requestAnimationFrame(() => {
        gridRef.current
          ?.querySelector<HTMLElement>(`[data-date="${dateValue(date)}"]`)
          ?.focus({ preventScroll: true });
      });
  };
  const onDayKeyDown = (event: KeyboardEvent) => {
    const next = new Date(cursor);
    const weekday = (next.getDay() + 6) % 7;
    switch (event.key) {
      case 'ArrowLeft':
        next.setDate(next.getDate() - 1);
        break;
      case 'ArrowRight':
        next.setDate(next.getDate() + 1);
        break;
      case 'ArrowUp':
        next.setDate(next.getDate() - 7);
        break;
      case 'ArrowDown':
        next.setDate(next.getDate() + 7);
        break;
      case 'Home':
        next.setDate(next.getDate() - weekday);
        break;
      case 'End':
        next.setDate(next.getDate() + 6 - weekday);
        break;
      case 'PageUp':
      case 'PageDown': {
        event.preventDefault();
        move(
          changeMonth(
            cursor,
            (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1),
          ),
          true,
        );
        return;
      }
      default:
        return;
    }
    event.preventDefault();
    move(next, true);
  };
  const browse = (amount: number) => {
    if (view === 'years')
      setYearStart((start) =>
        Math.max(996, Math.min(9996, start + amount * 12)),
      );
    else move(changeMonth(cursor, amount * (view === 'months' ? 12 : 1)));
  };
  const previousDisabled =
    view === 'years'
      ? yearStart <= MIN_YEAR
      : year === MIN_YEAR && (view === 'months' || month === 0);
  const nextDisabled =
    view === 'years'
      ? yearStart + 11 >= MAX_YEAR
      : year === MAX_YEAR && (view === 'months' || month === 11);

  return (
    <div className="w-[max(13rem,18em)] max-w-full space-y-2">
      <div className="flex items-center justify-between gap-1">
        <IconButton
          size="xs"
          className="picker-action"
          variant="ghost"
          aria-label={
            view === 'days'
              ? 'Предыдущий месяц'
              : view === 'months'
                ? 'Предыдущий год'
                : 'Предыдущие годы'
          }
          disabled={previousDisabled}
          onClick={() => browse(-1)}
        >
          <ChevronLeftIcon className="size-4" />
        </IconButton>
        <Button
          size="xs"
          className="picker-action"
          variant="ghost"
          aria-live="polite"
          onClick={() => {
            setView(
              view === 'days'
                ? 'months'
                : view === 'months'
                  ? 'years'
                  : 'months',
            );
            setYearStart(Math.floor(year / 12) * 12);
          }}
        >
          {view === 'days'
            ? `${MONTHS[month]} ${year}`
            : view === 'months'
              ? year
              : `${Math.max(MIN_YEAR, yearStart)}–${Math.min(MAX_YEAR, yearStart + 11)}`}
        </Button>
        <IconButton
          size="xs"
          className="picker-action"
          variant="ghost"
          aria-label={
            view === 'days'
              ? 'Следующий месяц'
              : view === 'months'
                ? 'Следующий год'
                : 'Следующие годы'
          }
          disabled={nextDisabled}
          onClick={() => browse(1)}
        >
          <ChevronRightIcon className="size-4" />
        </IconButton>
      </div>
      {view === 'days' ? (
        <div
          ref={gridRef}
          role="grid"
          aria-label="Дни месяца"
          onKeyDown={onDayKeyDown}
        >
          <div role="row" className="grid grid-cols-7 gap-1 pb-1">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                role="columnheader"
                className="py-1 text-center text-xs text-theme-text-secondary"
              >
                {day}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, week) => (
            <div key={week} role="row" className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, day) => {
                const date = new Date(year, month, week * 7 + day - offset + 1);
                const key = dateValue(date);
                const selected = key === value;
                const disabled =
                  date.getFullYear() < MIN_YEAR ||
                  date.getFullYear() > MAX_YEAR;
                return (
                  <span key={key} role="gridcell" aria-selected={selected}>
                    <button
                      type="button"
                      data-date={key}
                      data-picker-initial-focus={
                        key === dateValue(cursor) ? '' : undefined
                      }
                      tabIndex={key === dateValue(cursor) ? 0 : -1}
                      disabled={disabled}
                      aria-label={dayLabel.format(date)}
                      aria-current={key === today ? 'date' : undefined}
                      className={classNames(
                        'my-px flex aspect-square w-full cursor-pointer items-center justify-center rounded-md text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-theme-ring disabled:pointer-events-none disabled:opacity-30',
                        selected
                          ? 'bg-theme-accent font-semibold text-theme-accent-text'
                          : 'hover:bg-theme-surface-muted',
                        !selected &&
                          date.getMonth() !== month &&
                          'text-theme-text-muted',
                        !selected &&
                          key === today &&
                          'font-semibold text-theme-accent ring-1 ring-inset ring-theme-accent',
                      )}
                      onClick={() => pick(date)}
                    >
                      {date.getDate()}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-1"
          aria-label={view === 'months' ? 'Месяцы' : 'Годы'}
        >
          {Array.from({ length: 12 }, (_, index) => {
            const itemYear = view === 'years' ? yearStart + index : year;
            const selected =
              view === 'years' ? itemYear === year : index === month;
            return (
              <Button
                key={index}
                size="xs"
                className="picker-action"
                variant={selected ? 'primary' : 'ghost'}
                disabled={itemYear < MIN_YEAR || itemYear > MAX_YEAR}
                aria-pressed={selected}
                onClick={() => {
                  const next = new Date(cursor);
                  next.setDate(1);
                  if (view === 'years') next.setFullYear(itemYear);
                  else next.setMonth(index);
                  setCursor(next);
                  setView(view === 'years' ? 'months' : 'days');
                }}
              >
                {view === 'years' ? itemYear : MONTHS[index]}
              </Button>
            );
          })}
        </div>
      )}
      <div className="flex justify-end border-t border-theme-border pt-2">
        <Button
          size="xs"
          className="picker-action"
          variant="ghost"
          onClick={() => pick(new Date())}
        >
          Сегодня
        </Button>
      </div>
    </div>
  );
}

export function DatePickerField(props: PickerFieldProps) {
  return (
    <PickerField
      {...props}
      type="date"
      min="1000-01-01"
      max="9999-12-31"
      panel={Calendar}
      placement="below"
    />
  );
}
