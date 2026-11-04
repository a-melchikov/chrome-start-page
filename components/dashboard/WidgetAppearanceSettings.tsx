import { useContext } from 'react';
import type { WidgetAppearance } from '../../storage/widget-appearance';
import { resolveWidgetGlass } from '../../storage/widget-appearance';
import {
  DEFAULT_WIDGET_BORDER_RADIUS,
  MAX_WIDGET_BORDER_RADIUS,
} from '../../storage/defaults';
import { Button, Select } from '../ui';
import { RangeField } from '../ui/RangeField';
import { WidgetAppearanceContext } from './widget-appearance-context';

interface WidgetAppearanceSettingsProps {
  value?: WidgetAppearance;
  onChange: (value: WidgetAppearance | undefined) => void;
}

export function WidgetAppearanceSettings({
  value,
  onChange,
}: WidgetAppearanceSettingsProps) {
  const inherited = useContext(WidgetAppearanceContext);
  const commit = (next: WidgetAppearance) => {
    if (next.liquidGlass && !Object.keys(next.liquidGlass).length)
      delete next.liquidGlass;
    onChange(Object.keys(next).length ? next : undefined);
  };
  const updateGlass = (
    changes: NonNullable<WidgetAppearance['liquidGlass']>,
  ) => {
    const liquidGlass = { ...value?.liquidGlass, ...changes };
    for (const key of Object.keys(
      liquidGlass,
    ) as (keyof typeof liquidGlass)[]) {
      if (liquidGlass[key] === undefined) delete liquidGlass[key];
    }
    commit({ ...value, liquidGlass });
  };
  const glass = resolveWidgetGlass(inherited.liquidGlass, value?.liquidGlass);
  return (
    <details className="widget-appearance-settings shrink-0 border-b border-theme-border-subtle">
      <summary className="cursor-pointer px-5 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-ring">
        Оформление карточки
      </summary>
      <div className="max-h-[40vh] space-y-4 overflow-y-auto px-5 pb-4">
        <p className="text-xs text-theme-text-secondary">
          По умолчанию используются настройки пространства. Изменённые параметры
          действуют только для этого виджета.
        </p>
        <div className="space-y-2">
          <RangeField
            label="Скругление карточки"
            min={0}
            max={MAX_WIDGET_BORDER_RADIUS}
            value={
              value?.borderRadius ??
              inherited.widgetBorderRadius ??
              DEFAULT_WIDGET_BORDER_RADIUS
            }
            onChange={(borderRadius) => commit({ ...value, borderRadius })}
          />
          <Button
            variant="ghost"
            size="small"
            className="!h-auto min-h-10 whitespace-normal py-2 text-left"
            disabled={value?.borderRadius === undefined}
            onClick={() => {
              const next = { ...value };
              delete next.borderRadius;
              commit(next);
            }}
          >
            Скругление как у пространства
          </Button>
        </div>
        {(['enabled', 'pointerLight'] as const).map((key) => (
          <label key={key} className="block space-y-2 text-sm">
            <span>
              {key === 'enabled' ? 'Стекло карточки' : 'Блик карточки'}
            </span>
            <Select
              aria-label={
                key === 'enabled' ? 'Стекло карточки' : 'Блик карточки'
              }
              dropdownPosition="static"
              value={
                value?.liquidGlass?.[key] === undefined
                  ? 'inherit'
                  : String(value.liquidGlass[key])
              }
              options={[
                {
                  value: 'inherit',
                  label: `Как у пространства (${inherited.liquidGlass[key] ? 'включён' : 'выключен'})`,
                },
                { value: 'true', label: 'Включён' },
                { value: 'false', label: 'Выключен' },
              ]}
              onValueChange={(selected) =>
                updateGlass({
                  [key]:
                    selected === 'inherit' ? undefined : selected === 'true',
                })
              }
            />
          </label>
        ))}
        {!glass.enabled && (
          <p className="text-xs text-theme-text-secondary">
            Размытие, прозрачность, тень и блик применяются при включённом
            стекле.
          </p>
        )}
        {(
          [
            {
              key: 'transparency',
              label: 'Прозрачность карточки',
              max: 100,
              unit: '%',
            },
            { key: 'blur', label: 'Размытие карточки', max: 40, unit: 'px' },
            { key: 'shadow', label: 'Тень карточки', max: 100, unit: '%' },
          ] as const
        ).map(({ key, label, max, unit }) => (
          <div key={key} className="space-y-2">
            <RangeField
              label={label}
              min={0}
              max={max}
              unit={unit}
              value={glass[key]}
              onChange={(next) => updateGlass({ [key]: next })}
            />
            <Button
              variant="ghost"
              size="small"
              className="!h-auto min-h-10 whitespace-normal py-2 text-left"
              disabled={value?.liquidGlass?.[key] === undefined}
              onClick={() => updateGlass({ [key]: undefined })}
            >
              {label}: как у пространства
            </Button>
          </div>
        ))}
        <p className="text-xs text-theme-text-secondary">
          На фотографиях и погодных сценах стекло меняет только кромку и тень.
        </p>
        <Button
          variant="secondary"
          size="small"
          className="!h-auto min-h-10 whitespace-normal py-2 text-left"
          disabled={!value || !Object.keys(value).length}
          onClick={() => onChange(undefined)}
        >
          Использовать оформление пространства
        </Button>
      </div>
    </details>
  );
}
