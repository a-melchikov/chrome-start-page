import { Button, Dialog, Input } from '../ui';
import type { AppearanceConfig, Theme } from '../../storage/schema';

interface AppearanceDialogProps {
  appearance: AppearanceConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppearanceChange: (changes: Partial<AppearanceConfig>) => void;
}

const themeOptions: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: 'Системная' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export function AppearanceDialog({
  appearance,
  open,
  onOpenChange,
  onAppearanceChange,
}: AppearanceDialogProps) {
  return (
    <Dialog
      description="Тема влияет на элементы интерфейса, цвет фона настраивается отдельно."
      open={open}
      title="Оформление"
      onOpenChange={onOpenChange}
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Тема</legend>
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((option) => (
              <Button
                key={option.value}
                aria-pressed={appearance.theme === option.value}
                data-dialog-initial-focus={
                  appearance.theme === option.value ? true : undefined
                }
                size="small"
                variant={
                  appearance.theme === option.value ? 'primary' : 'secondary'
                }
                onClick={() => onAppearanceChange({ theme: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="background-color"
          >
            Цвет фона
          </label>
          <div className="flex items-center gap-3">
            <Input
              id="background-color"
              className="h-10 w-16 cursor-pointer p-1"
              type="color"
              value={appearance.backgroundColor}
              onChange={(event) =>
                onAppearanceChange({ backgroundColor: event.target.value })
              }
            />
            <code className="text-sm text-zinc-600 dark:text-zinc-400">
              {appearance.backgroundColor}
            </code>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
