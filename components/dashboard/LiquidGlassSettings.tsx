import { DEFAULT_LIQUID_GLASS } from '../../storage/defaults';
import type { LiquidGlassConfig } from '../../storage/schema';
import { Button } from '../ui';

interface LiquidGlassSettingsProps {
  settings: LiquidGlassConfig;
  onChange: (settings: LiquidGlassConfig) => void;
  onCommit: () => void;
  onReset: (settings: LiquidGlassConfig) => void;
}

type LiquidGlassNumberKey = 'transparency' | 'blur' | 'shadow';

const controls: Array<{
  key: LiquidGlassNumberKey;
  label: string;
  min: number;
  max: number;
  unit: string;
}> = [
  {
    key: 'transparency',
    label: 'Прозрачность',
    min: 0,
    max: 100,
    unit: '%',
  },
  { key: 'blur', label: 'Размытие', min: 0, max: 40, unit: ' px' },
  { key: 'shadow', label: 'Тень', min: 0, max: 100, unit: '%' },
];

export function LiquidGlassSettings({
  settings,
  onChange,
  onCommit,
  onReset,
}: LiquidGlassSettingsProps) {
  const usesDefaultValues = controls.every(
    ({ key }) => settings[key] === DEFAULT_LIQUID_GLASS[key],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {controls.map((control) => {
          const id = `liquid-glass-${control.key}`;

          return (
            <div key={control.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="font-medium" htmlFor={id}>
                  {control.label}
                </label>
                <output
                  className="min-w-12 text-right font-mono text-xs tabular-nums text-theme-text-secondary"
                  htmlFor={id}
                >
                  {settings[control.key]}
                  {control.unit}
                </output>
              </div>
              <input
                aria-label={control.label}
                className="block h-5 w-full cursor-pointer accent-theme-accent disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!settings.enabled}
                id={id}
                max={control.max}
                min={control.min}
                step="1"
                type="range"
                value={settings[control.key]}
                onBlur={onCommit}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    [control.key]: Number(event.target.value),
                  })
                }
                onKeyUp={onCommit}
                onPointerUp={onCommit}
              />
            </div>
          );
        })}
      </div>

      <Button
        disabled={usesDefaultValues}
        size="small"
        variant="secondary"
        onClick={() =>
          onReset({ ...DEFAULT_LIQUID_GLASS, enabled: settings.enabled })
        }
      >
        Вернуть стандартные параметры
      </Button>
    </div>
  );
}
