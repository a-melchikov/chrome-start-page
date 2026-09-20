import { classNames } from '../ui/class-names';
import { Dialog } from '../ui';

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
        description: 'Включить или выключить режим редактирования',
      },
      {
        keys: ['/'],
        description: 'Переместить фокус в поле поиска',
      },
      {
        keys: ['?', 'F1'],
        separator: 'или',
        description: 'Справка по горячим клавишам',
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
        keys: ['P', 'O'],
        separator: 'или',
        description: 'Настройки оформления',
      },
      {
        keys: ['B'],
        description: 'Импорт и экспорт (резервная копия)',
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

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: ShortcutsHelpDialogProps) {
  return (
    <Dialog open={open} title="Горячие клавиши" onOpenChange={onOpenChange}>
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
                  className="flex items-center justify-between gap-4 py-1.5"
                >
                  <span className="text-sm text-theme-text-secondary">
                    {item.description}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.keys.map((key, index) => (
                      <span key={key} className="flex items-center gap-1.5">
                        {index > 0 && item.separator ? (
                          <span className="text-xs text-theme-text-muted">
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
    </Dialog>
  );
}
