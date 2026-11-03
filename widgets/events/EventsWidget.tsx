import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { PlusIcon } from '../../components/icons';
import { Button, IconButton } from '../../components/ui';
import { useClockTicker } from '../clock/use-clock-ticker';
import { createWidgetId } from '../create-widget-id';
import { EventDialog } from './EventDialog';
import {
  formatCountdown,
  formatEventDate,
  localDateString,
  REPEAT_LABELS,
  upcomingEvents,
} from './event-utils';
import type { CalendarEvent, EventsWidgetConfig } from './types';

interface EventsWidgetProps {
  config: EventsWidgetConfig;
  onChange?: (config: EventsWidgetConfig) => void;
  headerActionsTarget?: HTMLElement | null;
  showPast?: boolean;
}

export function EventsWidget({
  config,
  onChange,
  headerActionsTarget,
  showPast = false,
}: EventsWidgetProps) {
  const { currentTime } = useClockTicker('local', false);
  const [draft, setDraft] = useState<CalendarEvent | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const items = upcomingEvents(config.events, currentTime);
  const visibleIds = new Set(items.map(({ event }) => event.id));
  const past = showPast
    ? config.events.filter((event) => !visibleIds.has(event.id))
    : [];
  const isNew =
    draft !== null && !config.events.some((event) => event.id === draft.id);

  const add = () =>
    setDraft({
      id: createWidgetId(),
      title: '',
      date: localDateString(new Date()),
      time: '',
      repeat: 'none',
    });
  const close = () => setDraft(null);
  const addButton = onChange ? (
    <Button
      ref={headerActionsTarget ? undefined : addRef}
      size="small"
      variant="secondary"
      onClick={add}
    >
      <PlusIcon className="size-4" />
      Добавить событие
    </Button>
  ) : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3" data-no-drag>
      {onChange && headerActionsTarget
        ? createPortal(
            <IconButton
              ref={addRef}
              aria-label="Добавить событие"
              title="Добавить событие"
              size="xs"
              variant="ghost"
              onClick={add}
            >
              <PlusIcon className="size-4" />
            </IconButton>,
            headerActionsTarget,
          )
        : addButton}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {items.length ? (
          <ul
            aria-label="Ближайшие события"
            className="divide-y divide-theme-border/60"
          >
            {items.map(({ event, occurrence }) => (
              <li key={event.id}>
                <button
                  type="button"
                  disabled={!onChange}
                  aria-label={`Изменить событие «${event.title}»`}
                  aria-describedby={`${descriptionId}-${event.id}-date ${descriptionId}-${event.id}-countdown`}
                  className="w-full cursor-pointer rounded-md px-1 py-3 text-left outline-none transition-colors hover:bg-theme-surface-elevated/60 focus-visible:ring-2 focus-visible:ring-theme-ring disabled:cursor-default"
                  onClick={() => setDraft(event)}
                >
                  <span
                    id={`${descriptionId}-${event.id}-date`}
                    className="block text-xs text-theme-text-secondary"
                  >
                    {formatEventDate(event, occurrence, currentTime)}
                  </span>
                  <span className="mt-1 block break-words text-sm font-medium text-theme-text-primary">
                    {event.title}
                  </span>
                  <span
                    id={`${descriptionId}-${event.id}-countdown`}
                    className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs"
                  >
                    <span className="font-medium tabular-nums text-theme-accent">
                      {formatCountdown(event, occurrence, currentTime)}
                    </span>
                    {event.repeat !== 'none' ? (
                      <span className="text-theme-text-secondary">
                        {REPEAT_LABELS[event.repeat]}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-4">
            <p className="text-sm font-medium text-theme-text-primary">
              Ближайших событий нет
            </p>
            <p className="mt-1 text-sm text-theme-text-secondary">
              Добавьте встречу, важную дату или дедлайн.
            </p>
            {headerActionsTarget ? (
              <div className="mt-3">{addButton}</div>
            ) : null}
          </div>
        )}
        {past.length ? (
          <div className="mt-4 border-t border-theme-border pt-3">
            <h3 className="mb-2 text-sm font-medium text-theme-text-secondary">
              Прошедшие события
            </h3>
            <ul className="space-y-1">
              {past.map((event) => (
                <li key={event.id}>
                  <Button
                    className="!h-auto w-full justify-start break-words py-2 text-left"
                    size="small"
                    variant="ghost"
                    onClick={() => setDraft(event)}
                  >
                    {event.title} · {event.date}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      {draft && onChange ? (
        <EventDialog
          key={draft.id}
          event={draft}
          isNew={isNew}
          onClose={close}
          returnFocusFallback={() => addRef.current}
          onSave={(event) =>
            onChange({
              ...config,
              events: isNew
                ? [...config.events, event]
                : config.events.map((item) =>
                    item.id === event.id ? event : item,
                  ),
            })
          }
          onDelete={() => {
            onChange({
              ...config,
              events: config.events.filter((event) => event.id !== draft.id),
            });
          }}
        />
      ) : null}
    </div>
  );
}
