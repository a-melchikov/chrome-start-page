import type {
  ShortcutCommand,
  ShortcutOverrides,
} from '../../keyboard/shortcuts';
import { ShortcutSettings } from './ShortcutSettings';
import { SettingsBlock } from './SettingsBlock';

interface ShortcutItem {
  command?: ShortcutCommand;
  keys: readonly string[];
  separator?: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: readonly ShortcutItem[];
}

const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    title: 'Общие',
    items: [
      {
        keys: ['E'],
        description: 'Режим редактирования',
        command: 'edit',
      },
      {
        keys: ['Ctrl+K', '/'],
        separator: 'или',
        description: 'Поиск команд',
        command: 'palette',
      },
      {
        keys: ['?', 'F1'],
        separator: 'или',
        description: 'Справка',
        command: 'help',
      },
      {
        keys: ['M'],
        description: 'Показать или скрыть панель',
        command: 'toolbar',
      },
      {
        keys: ['W'],
        description: 'Сменить пространство',
        command: 'workspace',
      },
      {
        keys: ['P', 'O'],
        separator: 'или',
        description: 'Настройки',
        command: 'settings',
      },
      {
        keys: ['B'],
        description: 'Резервные копии',
        command: 'backup',
      },
      {
        keys: ['Esc'],
        description: 'Закрыть окно или выйти из редактирования',
      },
    ],
  },
  {
    title: 'В режиме редактирования',
    items: [
      {
        keys: ['A'],
        description: 'Добавить виджет',
        command: 'add',
      },
      {
        keys: ['Ctrl+Z', 'Ctrl+Shift+Z'],
        separator: 'и',
        description: 'Отменить и повторить изменение',
      },
      {
        keys: ['Ctrl+A'],
        description: 'Выбрать все виджеты',
      },
      {
        keys: ['Ctrl/Shift+клик', 'Space'],
        separator: 'или',
        description: 'Добавить виджет к выделению',
      },
      {
        keys: ['Ctrl+C', 'Ctrl+V'],
        separator: 'и',
        description: 'Копировать и вставить',
      },
      {
        keys: ['Ctrl+D', 'D'],
        separator: 'или',
        description: 'Дублировать выделение',
        command: 'duplicate',
      },
      {
        keys: ['Delete'],
        description: 'Удалить выделение',
        command: 'delete',
      },
      {
        keys: ['← ↑ → ↓', 'Shift+стрелка'],
        separator: 'или',
        description: 'Переместить выделение: на клетку / до края',
      },
    ],
  },
];

function ShortcutKey({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-h-6 min-w-6 items-center justify-center rounded border border-theme-border bg-theme-surface-muted px-1.5 font-mono text-xs font-semibold text-theme-text-primary shadow-xs">
      {children}
    </kbd>
  );
}

export function ShortcutsHelp({
  shortcuts,
  onChange,
}: {
  shortcuts?: ShortcutOverrides;
  onChange?: (value: ShortcutOverrides) => void;
} = {}) {
  return (
    <div className="space-y-5 pb-3">
      {onChange && (
        <SettingsBlock blockId="shortcuts.bindings" title="Назначения клавиш">
          <ShortcutSettings value={shortcuts} onChange={onChange} />
        </SettingsBlock>
      )}
      {SHORTCUT_GROUPS.map((group, groupIndex) => (
        <SettingsBlock
          key={group.title}
          blockId={groupIndex === 0 ? 'shortcuts.general' : 'shortcuts.editing'}
          title={group.title}
        >
          <ul className="space-y-1">
            {group.items
              .filter((item) => !onChange || !item.command)
              .map((item) => (
                <li
                  key={item.description}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-1.5"
                >
                  <span className="text-sm text-theme-text-secondary">
                    {item.description}
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    {item.keys.map((key, index) => (
                      <span key={key} className="flex items-center gap-1.5">
                        {index > 0 && item.separator ? (
                          <span className="text-xs text-theme-text-secondary">
                            {item.separator}
                          </span>
                        ) : null}
                        <ShortcutKey>{key}</ShortcutKey>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        </SettingsBlock>
      ))}
    </div>
  );
}
