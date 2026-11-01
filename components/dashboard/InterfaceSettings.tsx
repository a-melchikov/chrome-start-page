import type { ToolbarConfig } from '../../storage/schema';
import { isToolbarConfig } from '../../storage/migrations';
import { Select } from '../ui';

interface InterfaceSettingsProps {
  toolbar: ToolbarConfig;
  onToolbarChange: (toolbar: ToolbarConfig) => void;
}

export function InterfaceSettings({
  toolbar,
  onToolbarChange,
}: InterfaceSettingsProps) {
  return (
    <section className="space-y-4" data-appearance-section="toolbar">
      <h3 className="text-sm font-semibold">Панель управления</h3>
      <div className="space-y-3 ">
        <label className="block space-y-2 text-sm">
          <span>Расположение и видимость</span>
          <Select
            dropdownPosition="static"
            aria-label="Расположение и видимость"
            value={toolbar.mode}
            options={[
              { value: 'top-right', label: 'Справа сверху' },
              { value: 'left-fixed', label: 'Слева — всегда видна' },
              {
                value: 'left-collapsible',
                label: 'Слева — скрываемая',
              },
            ]}
            onValueChange={(mode) => {
              const next = { mode };
              if (isToolbarConfig(next)) onToolbarChange(next);
            }}
          />
        </label>
      </div>
    </section>
  );
}
