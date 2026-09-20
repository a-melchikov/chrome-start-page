import { Button, Dialog } from '../ui';

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
    <kbd className="inline-flex min-h-6 min-w-6 items-center justify-center rounded border border-zinc-300 bg-zinc-100 px-1.5 font-mono text-xs font-semibold text-zinc-800 shadow-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </kbd>
  );
}

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: ShortcutsHelpDialogProps) {
  return (
    <Dialog
      footer={
        <Button
          data-dialog-initial-focus
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          Закрыть
        </Button>
      }
      open={open}
      title="Горячие клавиши"
      onOpenChange={onOpenChange}
    >
      <div className="space-y-5">
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title} className="space-y-2">
            <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
              {group.title}
            </h3>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {group.items.map((item) => (
                <li
                  key={item.description}
                  className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {item.description}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.keys.map((key, index) => (
                      <span key={key} className="flex items-center gap-1.5">
                        {index > 0 && item.separator ? (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
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
