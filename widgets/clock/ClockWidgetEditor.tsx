import { useId } from 'react';

import { Button, Select } from '../../components/ui';
import { ClockWidget } from './ClockWidget';
import { TimezoneSelect } from './TimezoneSelect';
import type {
  ClockDateFormat,
  ClockTimeFormat,
  ClockWidgetConfig,
} from './types';

export interface ClockWidgetEditorProps {
  config: ClockWidgetConfig;
  onChange: (config: ClockWidgetConfig) => void;
  onRequestFinish: () => void;
}

const DATE_FORMAT_PRESETS: ReadonlyArray<{
  id: ClockDateFormat;
  label: string;
}> = [
  { id: 'full', label: '22 сентября 2026 (полная)' },
  { id: 'numeric', label: '22.09.2026 (числовая)' },
  { id: 'shortWithYear', label: '22 сент 2026 (краткая с годом)' },
  { id: 'short', label: '22 сент (краткая без года)' },
];

export function ClockWidgetEditor({
  config,
  onChange,
  onRequestFinish,
}: ClockWidgetEditorProps) {
  const timeFormatId = useId();
  const dateFormatId = useId();
  const timezoneId = useId();

  const updateConfig = (partial: Partial<ClockWidgetConfig>) => {
    onChange({
      ...config,
      ...partial,
    });
  };

  return (
    <div className="space-y-4 text-theme-text-primary">
      {/* Live Preview */}
      <div className="rounded-xl border border-theme-border/60 bg-theme-surface/50 p-3 shadow-xs">
        <div className="mb-2 text-xs font-medium text-theme-text-muted">
          Предпросмотр
        </div>
        <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-theme-border bg-theme-surface-elevated/40 p-2">
          <ClockWidget config={config} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Часовой пояс со встроенным поиском в выпадающем меню */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="block text-xs font-medium" htmlFor={timezoneId}>
            Часовой пояс
          </label>
          <TimezoneSelect
            id={timezoneId}
            value={config.timezone}
            onChange={(timezone) => updateConfig({ timezone })}
          />
        </div>

        {/* Формат времени */}
        <div className="space-y-1">
          <label className="block text-xs font-medium" htmlFor={timeFormatId}>
            Формат времени
          </label>
          <Select
            id={timeFormatId}
            value={config.timeFormat}
            onChange={(e) => {
              updateConfig({ timeFormat: e.target.value as ClockTimeFormat });
            }}
          >
            <option value="24h">24-часовой (14:35)</option>
            <option value="12h">12-часовой (2:35 PM)</option>
          </Select>
        </div>

        {/* Формат даты */}
        <div className="space-y-1">
          <label className="block text-xs font-medium" htmlFor={dateFormatId}>
            Формат даты
          </label>
          <Select
            disabled={!config.showDate}
            id={dateFormatId}
            value={config.dateFormat}
            onChange={(e) => {
              updateConfig({ dateFormat: e.target.value as ClockDateFormat });
            }}
          >
            {DATE_FORMAT_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Переключатели отображения */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-medium text-theme-text-muted">
          Элементы циферблата
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              checked={config.showTime}
              className="size-4 rounded-sm border-theme-border bg-theme-surface-elevated text-theme-accent accent-theme-accent focus:ring-2 focus:ring-theme-ring/30"
              type="checkbox"
              onChange={(e) => updateConfig({ showTime: e.target.checked })}
            />
            Показывать время
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              checked={config.showSeconds}
              className="size-4 rounded-sm border-theme-border bg-theme-surface-elevated text-theme-accent accent-theme-accent focus:ring-2 focus:ring-theme-ring/30"
              disabled={!config.showTime}
              type="checkbox"
              onChange={(e) => updateConfig({ showSeconds: e.target.checked })}
            />
            Показывать секунды
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
              checked={config.showDayOfWeek}
              className="size-4 rounded-sm border-theme-border bg-theme-surface-elevated text-theme-accent accent-theme-accent focus:ring-2 focus:ring-theme-ring/30"
              type="checkbox"
              onChange={(e) =>
                updateConfig({ showDayOfWeek: e.target.checked })
              }
            />
            Показывать день недели
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              checked={config.showTimezoneAbbr}
              className="size-4 rounded-sm border-theme-border bg-theme-surface-elevated text-theme-accent accent-theme-accent focus:ring-2 focus:ring-theme-ring/30"
              type="checkbox"
              onChange={(e) =>
                updateConfig({ showTimezoneAbbr: e.target.checked })
              }
            />
            Показывать сокращение пояса
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
