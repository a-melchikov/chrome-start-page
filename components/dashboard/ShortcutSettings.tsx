import { useState } from 'react';
import { Button } from '../ui';
import {
  bindingFromEvent,
  findBindingConflict,
  getShortcutLabel,
  isAllowedBinding,
  isShortcutOverrides,
  SHORTCUT_COMMANDS,
  type ShortcutCommand,
  type ShortcutOverrides,
} from '../../keyboard/shortcuts';

export function ShortcutSettings({
  value = {},
  onChange,
}: {
  value?: ShortcutOverrides;
  onChange: (value: ShortcutOverrides) => void;
}) {
  const [recording, setRecording] = useState<ShortcutCommand | null>(null);
  const [error, setError] = useState<{
    command: ShortcutCommand;
    message: string;
  } | null>(null);
  return (
    <section className="space-y-4 border-b border-theme-border pb-6 mb-6">
      <p className="text-sm text-theme-text-secondary">
        Нажмите сочетание, чтобы заменить его. Назначения работают при любой
        раскладке. Escape отменяет ввод.
      </p>
      <ul className="space-y-4">
        {SHORTCUT_COMMANDS.map((command) => (
          <li key={command.id} className="space-y-2">
            <span className="text-sm font-medium">{command.label}</span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="small"
                aria-label={`Изменить сочетание: ${command.label}`}
                aria-pressed={recording === command.id}
                onClick={() => {
                  setRecording(command.id);
                  setError(null);
                }}
                onBlur={() => setRecording(null)}
                onKeyDown={(event) => {
                  if (recording !== command.id) return;
                  if (event.key === 'Tab') {
                    setRecording(null);
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.key === 'Escape') {
                    setRecording(null);
                    setError(null);
                    return;
                  }
                  if (
                    /^(Control|Shift|Alt|Meta)/.test(event.code) ||
                    event.nativeEvent.isComposing
                  )
                    return;
                  const next = bindingFromEvent(event);
                  if (!isAllowedBinding(next)) {
                    setError({
                      command: command.id,
                      message:
                        'Это сочетание зарезервировано браузером или стандартными операциями. Выберите другое.',
                    });
                    return;
                  }
                  const conflict = findBindingConflict(next, command.id, value);
                  if (conflict) {
                    setError({
                      command: command.id,
                      message: `Сочетание уже используется: «${conflict}».`,
                    });
                    return;
                  }
                  onChange({ ...value, [command.id]: [next] });
                  setRecording(null);
                  setError(null);
                }}
              >
                {recording === command.id
                  ? 'Нажмите сочетание…'
                  : getShortcutLabel(command.id, value) || 'Отключено'}
              </Button>
              <Button
                size="small"
                variant="ghost"
                aria-label={`Отключить сочетание: ${command.label}`}
                disabled={value[command.id]?.length === 0}
                onClick={() => {
                  onChange({ ...value, [command.id]: [] });
                  setError(null);
                }}
              >
                Отключить
              </Button>
              {value[command.id] !== undefined && (
                <Button
                  size="small"
                  variant="ghost"
                  aria-label={`Сбросить сочетание: ${command.label}`}
                  onClick={() => {
                    const next = { ...value };
                    delete next[command.id];
                    if (!isShortcutOverrides(next)) {
                      setError({
                        command: command.id,
                        message:
                          'Стандартное сочетание занято другой командой. Сначала измените её назначение или сбросьте все сочетания.',
                      });
                      return;
                    }
                    onChange(next);
                    setError(null);
                  }}
                >
                  Сбросить
                </Button>
              )}
            </div>
            {error?.command === command.id && (
              <p role="alert" className="text-sm text-theme-danger">
                {error.message}
              </p>
            )}
          </li>
        ))}
      </ul>
      <Button
        size="small"
        onClick={() => {
          onChange({});
          setRecording(null);
          setError(null);
        }}
      >
        Вернуть стандартные сочетания
      </Button>
    </section>
  );
}
