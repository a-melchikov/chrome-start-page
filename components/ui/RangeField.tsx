import { useId } from 'react';

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
  onCommit?: () => void;
}

export function RangeField({
  label,
  value,
  min,
  max,
  unit = 'px',
  onChange,
  onCommit,
}: RangeFieldProps) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <label htmlFor={id}>{label}</label>
        <output
          htmlFor={id}
          className="min-w-12 text-right tabular-nums text-theme-text-secondary"
        >
          {value} {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        className="block h-5 w-full cursor-pointer accent-theme-accent"
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
    </div>
  );
}
