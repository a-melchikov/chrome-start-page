import { useId } from 'react';

import { Button, Select } from '../../components/ui';
import { TimezoneSelect } from '../clock/TimezoneSelect';
import { AnalogClockWidget } from './AnalogClockWidget';
import type { AnalogClockDialStyle, AnalogClockWidgetConfig } from './types';

export interface AnalogClockWidgetEditorProps {
  config: AnalogClockWidgetConfig;
  onChange: (config: AnalogClockWidgetConfig) => void;
  onRequestFinish: () => void;
}

const DIAL_STYLE_PRESETS: ReadonlyArray<{
  id: AnalogClockDialStyle;
  label: string;
}> = [
  { id: 'minimal', label: 'Минималистичный (риски без цифр)' },
  { id: 'numbers', label: 'С цифрами (12, 3, 6, 9)' },
  { id: 'bauhaus', label: 'Баухаус / вокзальный' },
];

export function AnalogClockWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: AnalogClockWidgetEditorProps) {
  const dialStyleId = useId();
  const timezoneId = useId();

  const updateConfig = (partial: Partial<AnalogClockWidgetConfig>) => {
    onChange({
      ...config,
      ...partial,
    });
  };

  return (
    <div className="space-y-4 text-theme-text-primary">
      {/* Live Preview */}
      <div className="rounded-xl border border-theme-border/60 bg-theme-surface/50 p-3 shadow-xs">
        <div className="mb-2 text-xs font-medium text-theme-text-secondary">
          Предпросмотр
        </div>
        <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-lg border border-theme-border bg-theme-surface-elevated/40 p-2">
          <AnalogClockWidget config={config} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Часовой пояс */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-xs font-medium" htmlFor={timezoneId}>
            Часовой пояс
          </label>
          <TimezoneSelect
            dropdownPosition="static"
            id={timezoneId}
            value={config.timezone}
            onChange={(timezone) => updateConfig({ timezone })}
          />
        </div>

        {/* Стиль циферблата */}
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-xs font-medium" htmlFor={dialStyleId}>
            Стиль циферблата
          </label>
          <Select
            dropdownPosition="static"
            id={dialStyleId}
            value={config.dialStyle}
            onChange={(e) => {
              updateConfig({
                dialStyle: e.target.value as AnalogClockDialStyle,
              });
            }}
          >
            {DIAL_STYLE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Переключатели отображения */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-medium text-theme-text-secondary">
          Элементы циферблата
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              checked={config.showSeconds}
              className="size-4 rounded-sm border-theme-border bg-theme-surface-elevated text-theme-accent accent-theme-accent focus:ring-2 focus:ring-theme-ring/30"
              type="checkbox"
              onChange={(e) => updateConfig({ showSeconds: e.target.checked })}
            />
            Показывать секундную стрелку
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              checked={config.showDate}
              className="size-4 rounded-sm border-theme-border bg-theme-surface-elevated text-theme-accent accent-theme-accent focus:ring-2 focus:ring-theme-ring/30"
              type="checkbox"
              onChange={(e) => updateConfig({ showDate: e.target.checked })}
            />
            Показывать дату
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              checked={config.showTimezone}
              className="size-4 rounded-sm border-theme-border bg-theme-surface-elevated text-theme-accent accent-theme-accent focus:ring-2 focus:ring-theme-ring/30"
              type="checkbox"
              onChange={(e) => updateConfig({ showTimezone: e.target.checked })}
            />
            Показывать часовой пояс
          </label>
        </div>
      </div>

      {/* Кнопка завершения */}
      <div className="flex justify-end pt-2">
        <Button size="small" variant="primary" onClick={onRequestFinish}>
          Готово
        </Button>
      </div>
    </div>
  );
}
