export interface ShortcutBinding {
  code: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

const binding = (
  code: string,
  modifiers: Partial<Omit<ShortcutBinding, 'code'>> = {},
): ShortcutBinding => ({
  code,
  ctrl: false,
  alt: false,
  shift: false,
  meta: false,
  ...modifiers,
});

export const SHORTCUT_COMMANDS = [
  { id: 'edit', label: 'Режим редактирования', defaults: [binding('KeyE')] },
  {
    id: 'palette',
    label: 'Поиск команд',
    defaults: [binding('KeyK', { ctrl: true }), binding('Slash')],
  },
  {
    id: 'help',
    label: 'Справка',
    defaults: [binding('Slash', { shift: true }), binding('F1')],
  },
  {
    id: 'toolbar',
    label: 'Показать или скрыть панель',
    defaults: [binding('KeyM')],
  },
  {
    id: 'workspace',
    label: 'Сменить пространство',
    defaults: [binding('KeyW')],
  },
  {
    id: 'settings',
    label: 'Настройки',
    defaults: [binding('KeyP'), binding('KeyO')],
  },
  { id: 'backup', label: 'Резервные копии', defaults: [binding('KeyB')] },
  { id: 'add', label: 'Добавить виджет', defaults: [binding('KeyA')] },
  {
    id: 'duplicate',
    label: 'Дублировать выделение',
    defaults: [binding('KeyD', { ctrl: true }), binding('KeyD')],
  },
  {
    id: 'delete',
    label: 'Удалить выделение',
    defaults: [binding('Delete'), binding('Backspace')],
  },
] as const;

export type ShortcutCommand = (typeof SHORTCUT_COMMANDS)[number]['id'];
export type ShortcutOverrides = Partial<
  Record<ShortcutCommand, ShortcutBinding[]>
>;

export function getCommandBindings(
  command: ShortcutCommand,
  overrides: ShortcutOverrides = {},
): readonly ShortcutBinding[] {
  return (
    overrides[command] ??
    SHORTCUT_COMMANDS.find((item) => item.id === command)!.defaults
  );
}

export function bindingFromEvent(
  event: Pick<
    KeyboardEvent,
    'code' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
  >,
): ShortcutBinding {
  return {
    code: event.code,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
  };
}

export function sameBinding(
  left: ShortcutBinding,
  right: ShortcutBinding,
): boolean {
  return (
    left.code === right.code &&
    left.ctrl === right.ctrl &&
    left.alt === right.alt &&
    left.shift === right.shift &&
    left.meta === right.meta
  );
}

export function formatBinding(value: ShortcutBinding): string {
  const key = value.code.replace(/^Key/, '').replace(/^Digit/, '');
  const labels: Record<string, string> = {
    Slash: '/',
    Backslash: '\\',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Backquote: '`',
    Backspace: 'Backspace',
  };
  return [
    value.ctrl && 'Ctrl',
    value.alt && 'Alt',
    value.shift && 'Shift',
    value.meta && 'Meta',
    labels[key] ?? key,
  ]
    .filter(Boolean)
    .join('+');
}

export function getShortcutLabel(
  command: ShortcutCommand,
  overrides?: ShortcutOverrides,
): string {
  return getCommandBindings(command, overrides)
    .map(formatBinding)
    .join(' или ');
}

export function isAllowedBinding(value: unknown): value is ShortcutBinding {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  if (
    typeof item.code !== 'string' ||
    !['ctrl', 'alt', 'shift', 'meta'].every(
      (key) => typeof item[key] === 'boolean',
    )
  )
    return false;
  if (
    !/^(Key[A-Z]|Digit[0-9]|F[1-9]|F1[0-2]|Slash|Backslash|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Backquote|Delete|Backspace)$/.test(
      item.code,
    )
  )
    return false;
  if (['F4', 'F5', 'F11', 'F12'].includes(item.code) || (item.ctrl && item.alt))
    return false;
  if (
    (item.ctrl || item.meta) &&
    [
      'KeyA',
      'KeyC',
      'KeyV',
      'KeyX',
      'KeyZ',
      'KeyL',
      'KeyT',
      'KeyN',
      'KeyW',
      'KeyR',
      'KeyQ',
    ].includes(item.code)
  )
    return false;
  return true;
}

export function findBindingConflict(
  value: ShortcutBinding,
  command: ShortcutCommand,
  overrides: ShortcutOverrides,
): string | undefined {
  return SHORTCUT_COMMANDS.find(
    (item) =>
      item.id !== command &&
      getCommandBindings(item.id, overrides).some((candidate) =>
        sameBinding(candidate, value),
      ),
  )?.label;
}

export function isShortcutOverrides(
  value: unknown,
): value is ShortcutOverrides {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const entries = Object.entries(value);
  if (
    !entries.every(
      ([key, values]) =>
        SHORTCUT_COMMANDS.some((item) => item.id === key) &&
        Array.isArray(values) &&
        values.length <= 2 &&
        values.every(isAllowedBinding),
    )
  )
    return false;
  const overrides = value as ShortcutOverrides;
  const seen: ShortcutBinding[] = [];
  for (const command of SHORTCUT_COMMANDS) {
    for (const item of getCommandBindings(command.id, overrides)) {
      if (seen.some((other) => sameBinding(item, other))) return false;
      seen.push(item);
    }
  }
  return true;
}
