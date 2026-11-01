import { classNames } from '../ui/class-names';

interface ShortcutItem {
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
      },
      {
        keys: ['Ctrl+K', '/'],
        separator: 'или',
        description: 'Поиск команд',
      },
      {
        keys: ['?', 'F1'],
        separator: 'или',
        description: 'Справка',
      },
      {
        keys: ['M'],
        description: 'Показать или скрыть панель',
      },
      {
        keys: ['W'],
        description: 'Сменить пространство',
      },
      {
        keys: ['P', 'O'],
        separator: 'или',
        description: 'Настройки',
      },
      {
        keys: ['B'],
        description: 'Резервные копии',
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
      },
      {
        keys: ['Delete'],
        description: 'Удалить выделение',
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

export function ShortcutsHelp() {
  return (
    <div className="pb-3">
      {SHORTCUT_GROUPS.map((group, groupIndex) => (
        <section
          key={group.title}
          className={classNames('space-y-2', groupIndex > 0 && 'mt-6')}
        >
          <h3 className="text-sm font-semibold text-theme-text-primary">
            {group.title}
          </h3>
          <ul className="space-y-1">
            {group.items.map((item) => (
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
        </section>
      ))}
    </div>
  );
}
