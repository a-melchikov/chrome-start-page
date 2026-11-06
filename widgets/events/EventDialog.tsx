import { useId, useRef, useState, type FormEvent } from 'react';

import { Button, Dialog, Input, Select, Textarea } from '../../components/ui';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { TimePickerField } from '../../components/ui/TimePickerField';
import {
  isEventDate,
  isEventRepeat,
  isEventTime,
  REPEAT_LABELS,
} from './event-utils';
import type { CalendarEvent } from './types';

interface EventDialogProps {
  event: CalendarEvent;
  isNew: boolean;
  onSave: (event: CalendarEvent) => void;
  onDelete: () => void;
  onClose: () => void;
  returnFocusFallback: () => HTMLElement | null;
}

export function EventDialog({
  event,
  isNew,
  onSave,
  onDelete,
  onClose,
  returnFocusFallback,
}: EventDialogProps) {
  const [draft, setDraft] = useState(event);
  const [error, setError] = useState('');
  const [activePicker, setActivePicker] = useState<'date' | 'time' | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      setError('Введите название события.');
      titleRef.current?.focus();
      return;
    }
    if (
      !isEventDate(draft.date) ||
      !isEventTime(draft.time) ||
      !e.currentTarget.checkValidity()
    ) {
      setError('Укажите корректную дату и время. Год — от 1000 до 9999.');
      return;
    }
    onSave({ ...draft, title: draft.title.trim() });
    onClose();
  };

  return (
    <Dialog
      open
      returnFocusFallback={returnFocusFallback}
      title={isNew ? 'Новое событие' : 'Изменить событие'}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <form noValidate className="space-y-4 pb-2" onSubmit={submit}>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor={`${id}-title`}>
            Название события
          </label>
          <Input
            ref={titleRef}
            data-dialog-initial-focus
            id={`${id}-title`}
            maxLength={160}
            value={draft.title}
            aria-invalid={!!error && !draft.title.trim()}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => {
              setDraft({ ...draft, title: e.target.value });
              setError('');
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="block text-sm font-medium"
            htmlFor={`${id}-description`}
          >
            Описание (необязательно)
          </label>
          <Textarea
            id={`${id}-description`}
            rows={3}
            value={draft.description ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor={`${id}-date`}>
              Дата
            </label>
            <DatePickerField
              id={`${id}-date`}
              required
              open={activePicker === 'date'}
              onOpenChange={(open) => setActivePicker(open ? 'date' : null)}
              aria-invalid={!!error && !isEventDate(draft.date)}
              aria-describedby={error ? `${id}-error` : undefined}
              value={draft.date}
              onValueChange={(date) => {
                setDraft({ ...draft, date });
                setError('');
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor={`${id}-time`}>
              Время (необязательно)
            </label>
            <TimePickerField
              id={`${id}-time`}
              open={activePicker === 'time'}
              onOpenChange={(open) => setActivePicker(open ? 'time' : null)}
              aria-invalid={!!error && !isEventTime(draft.time)}
              aria-describedby={error ? `${id}-error` : undefined}
              value={draft.time}
              onValueChange={(time) => {
                setDraft({ ...draft, time });
                setError('');
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor={`${id}-repeat`}>
            Повтор
          </label>
          <Select
            id={`${id}-repeat`}
            dropdownPosition="static"
            value={draft.repeat}
            onChange={(e) => {
              if (isEventRepeat(e.target.value))
                setDraft({ ...draft, repeat: e.target.value });
            }}
          >
            {Object.entries(REPEAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        {draft.repeat === 'monthly' || draft.repeat === 'yearly' ? (
          <p className="text-xs text-theme-text-secondary">
            Если нужного числа нет, используется последний день месяца.
          </p>
        ) : null}
        {error ? (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-sm text-theme-danger"
          >
            {error}
          </p>
        ) : null}
        {confirmDelete ? (
          <div className="space-y-2 border-t border-theme-border pt-3">
            <p className="text-sm">
              Удалить событие «{event.title}»
              {event.repeat !== 'none' ? ' и все его повторы' : ''}?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="small"
                variant="danger"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
              >
                Подтвердить удаление
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Оставить событие
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {!isNew && !confirmDelete ? (
            <Button
              className="mr-auto"
              size="small"
              variant="danger-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              Удалить событие
            </Button>
          ) : null}
          <Button size="small" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button size="small" type="submit">
            Сохранить
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
