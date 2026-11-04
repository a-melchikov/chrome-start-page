import { MAX_WIDGET_BORDER_RADIUS } from './defaults';
import type { LiquidGlassConfig } from './schema';

export interface WidgetAppearance {
  borderRadius?: number;
  liquidGlass?: Partial<LiquidGlassConfig>;
}

export function resolveWidgetGlass(
  inherited: LiquidGlassConfig,
  overrides?: WidgetAppearance['liquidGlass'],
): LiquidGlassConfig {
  return {
    enabled: overrides?.enabled ?? inherited.enabled,
    transparency: overrides?.transparency ?? inherited.transparency,
    blur: overrides?.blur ?? inherited.blur,
    shadow: overrides?.shadow ?? inherited.shadow,
    pointerLight: overrides?.pointerLight ?? inherited.pointerLight,
  };
}

export function isWidgetAppearance(value: unknown): value is WidgetAppearance {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const fields = value as Record<string, unknown>;
  const inRange = (candidate: unknown, max: number) =>
    candidate === undefined ||
    (typeof candidate === 'number' &&
      Number.isInteger(candidate) &&
      candidate >= 0 &&
      candidate <= max);
  if (!inRange(fields.borderRadius, MAX_WIDGET_BORDER_RADIUS)) return false;
  if (fields.liquidGlass === undefined) return true;
  if (
    typeof fields.liquidGlass !== 'object' ||
    fields.liquidGlass === null ||
    Array.isArray(fields.liquidGlass)
  )
    return false;
  const glass = fields.liquidGlass as Record<string, unknown>;
  return (
    (glass.enabled === undefined || typeof glass.enabled === 'boolean') &&
    (glass.pointerLight === undefined ||
      typeof glass.pointerLight === 'boolean') &&
    inRange(glass.transparency, 100) &&
    inRange(glass.blur, 40) &&
    inRange(glass.shadow, 100)
  );
}
