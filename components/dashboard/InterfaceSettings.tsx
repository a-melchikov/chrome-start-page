import type { AnimationMode, ToolbarConfig } from '../../storage/schema';
import { isToolbarConfig } from '../../storage/migrations';
import { Select } from '../ui';

interface InterfaceSettingsProps {
  toolbar: ToolbarConfig;
  animationMode?: AnimationMode;
  onAnimationModeChange: (mode: AnimationMode) => void;
  onToolbarChange: (toolbar: ToolbarConfig) => void;
}

export function InterfaceSettings({
  toolbar,
  animationMode = 'system',
  onAnimationModeChange,
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
      <div className="space-y-3 border-t border-theme-border pt-5">
        <h3 className="text-sm font-semibold">Анимации</h3>
        <label className="block space-y-2 text-sm">
          <span>Движение интерфейса и погоды</span>
          <Select
            aria-label="Режим анимации"
            dropdownPosition="static"
            value={animationMode}
            options={[
              { value: 'system', label: 'По системе' },
              { value: 'reduced', label: 'Сокращённые' },
              { value: 'off', label: 'Выключены' },
            ]}
            onValueChange={(mode) => {
              if (mode === 'system' || mode === 'reduced' || mode === 'off')
                onAnimationModeChange(mode);
            }}
          />
        </label>
        <p className="text-xs text-theme-text-secondary">
          Сокращённые анимации оставляют короткие переходы прозрачности. GIF
          управляются отдельно.
        </p>
      </div>
    </section>
  );
}
