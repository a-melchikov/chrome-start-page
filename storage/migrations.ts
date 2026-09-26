import {
  DASHBOARD_CONFIG_VERSION,
  type BackgroundColorConfig,
  type DashboardConfig,
  type LiquidGlassConfig,
  type WallpaperConfig,
  type WidgetConfig,
  isImageAssetId,
  isWallpaperAssetId,
} from './schema';
import type { ClockDateFormat, ClockTimeFormat } from '../widgets/clock/types';
import {
  IMAGE_OBJECT_POSITIONS,
  type ImageFitMode,
  type ImageObjectPosition,
  type ImageWidgetSource,
} from '../widgets/image/types';
import { isSearchEngine } from '../widgets/search/engines';
import type { WeatherLocation } from '../widgets/weather/types';
import { DEFAULT_LIQUID_GLASS } from './defaults';
import {
  ALL_CUSTOM_THEME_COLOR_KEYS,
  type BuiltinThemeId,
  type CustomTheme,
  type CustomThemeColors,
  type ThemeRef,
} from '../themes/types';
import { BUILTIN_THEME_IDS, isBuiltinThemeId } from '../themes/registry';
import { isCustomThemeColorKey } from '../themes/color-derivation';
import { isValidHex } from '../themes/color-utils';

export class InvalidDashboardConfigError extends Error {
  constructor(message = 'Dashboard config has an invalid structure') {
    super(message);
    this.name = 'InvalidDashboardConfigError';
  }
}

export class UnsupportedDashboardConfigVersionError extends Error {
  constructor(public readonly version: number) {
    super(`Dashboard config version ${version} is not supported`);
    this.name = 'UnsupportedDashboardConfigVersionError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIntegerInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

const VALID_THEMES: ReadonlySet<string> = new Set<string>(BUILTIN_THEME_IDS);

function isLegacyTheme(value: unknown): value is BuiltinThemeId {
  return typeof value === 'string' && VALID_THEMES.has(value);
}

function isAbsoluteHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function isWallpaperConfig(value: unknown): value is WallpaperConfig {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type === 'none') {
    return true;
  }

  if (value.type === 'url') {
    return isAbsoluteHttpsUrl(value.url);
  }

  return value.type === 'local' && isWallpaperAssetId(value.assetId);
}

function isWidgetLayout(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.w) &&
    isFiniteNumber(value.h)
  );
}

const WIDGET_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function isValidWidgetId(value: unknown): value is string {
  return typeof value === 'string' && WIDGET_ID_PATTERN.test(value);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isImageWidgetSource(value: unknown): value is ImageWidgetSource {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type === 'none') {
    return true;
  }

  if (value.type === 'url') {
    return isAbsoluteHttpsUrl(value.url);
  }

  return value.type === 'local' && isImageAssetId(value.assetId);
}

function isImageObjectPosition(value: unknown): value is ImageObjectPosition {
  return (
    typeof value === 'string' &&
    (IMAGE_OBJECT_POSITIONS as readonly string[]).includes(value)
  );
}

function isImageFitMode(value: unknown): value is ImageFitMode {
  return value === 'cover' || value === 'contain';
}

const CLOCK_TIME_FORMATS: ReadonlySet<string> = new Set<ClockTimeFormat>([
  '12h',
  '24h',
]);

const CLOCK_DATE_FORMATS: ReadonlySet<string> = new Set<ClockDateFormat>([
  'full',
  'numeric',
  'shortWithYear',
  'short',
]);

function isClockTimeFormat(value: unknown): value is ClockTimeFormat {
  return typeof value === 'string' && CLOCK_TIME_FORMATS.has(value);
}

function isClockDateFormat(value: unknown): value is ClockDateFormat {
  return typeof value === 'string' && CLOCK_DATE_FORMATS.has(value);
}

function isValidTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }
  if (value === 'local') {
    return true;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isWeatherLocation(value: unknown): value is WeatherLocation {
  if (!isRecord(value)) return false;
  if (value.type === 'unset' || value.type === 'auto') return true;
  return (
    value.type === 'city' &&
    Number.isSafeInteger(value.id) &&
    (value.id as number) > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    value.name.length <= 160 &&
    typeof value.region === 'string' &&
    value.region.length <= 160 &&
    typeof value.country === 'string' &&
    value.country.length <= 160 &&
    isFiniteNumber(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    isFiniteNumber(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180 &&
    isValidTimezone(value.timezone) &&
    value.timezone !== 'local'
  );
}

function isWidgetConfig(value: unknown): value is WidgetConfig {
  if (
    !isRecord(value) ||
    !isValidWidgetId(value.id) ||
    (value.title !== undefined && typeof value.title !== 'string') ||
    !isWidgetLayout(value.layout)
  ) {
    return false;
  }

  if (value.type === 'markdown') {
    return typeof value.content === 'string';
  }

  if (value.type === 'search') {
    return isSearchEngine(value.engine);
  }

  if (value.type === 'pomodoro') {
    return (
      isIntegerInRange(value.workDuration, 1, 120) &&
      isIntegerInRange(value.shortBreakDuration, 1, 60) &&
      isIntegerInRange(value.longBreakDuration, 1, 60) &&
      isIntegerInRange(value.longBreakInterval, 1, 12) &&
      typeof value.soundEnabled === 'boolean'
    );
  }

  if (value.type === 'image') {
    return (
      isImageWidgetSource(value.source) &&
      isImageObjectPosition(value.objectPosition) &&
      (value.fitMode === undefined || isImageFitMode(value.fitMode)) &&
      (value.zoom === undefined ||
        (typeof value.zoom === 'number' &&
          Number.isFinite(value.zoom) &&
          value.zoom >= 1 &&
          value.zoom <= 3)) &&
      (value.altText === undefined || typeof value.altText === 'string')
    );
  }

  if (value.type === 'clock') {
    return (
      isClockTimeFormat(value.timeFormat) &&
      isClockDateFormat(value.dateFormat) &&
      typeof value.showSeconds === 'boolean' &&
      isValidTimezone(value.timezone)
    );
  }

  if (value.type === 'weather') {
    return (
      (value.mode === 'visual' || value.mode === 'compact') &&
      isWeatherLocation(value.location)
    );
  }

  return false;
}

interface RetiredGoogleCalendarWidgetConfig {
  id: string;
  type: 'google-calendar';
  title?: string;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

function isRetiredGoogleCalendarWidgetConfig(
  value: unknown,
): value is RetiredGoogleCalendarWidgetConfig {
  return (
    isRecord(value) &&
    isValidWidgetId(value.id) &&
    (value.title === undefined || typeof value.title === 'string') &&
    isWidgetLayout(value.layout) &&
    value.type === 'google-calendar'
  );
}

interface LegacyAppearanceConfig {
  theme: string;
  backgroundColor: string;
}

interface WallpaperAppearanceConfig extends LegacyAppearanceConfig {
  wallpaper: WallpaperConfig;
}

interface DashboardConfigV4Appearance extends WallpaperAppearanceConfig {
  liquidGlassEnabled: boolean;
}

interface DashboardConfigV5Appearance extends LegacyAppearanceConfig {
  wallpaper: WallpaperConfig;
  liquidGlass: LiquidGlassConfig;
}

function hasValidLegacyDashboardEnvelope(value: unknown): value is {
  version: number;
  widgets: unknown[];
  appearance: {
    theme: unknown;
    backgroundColor: unknown;
    [key: string]: unknown;
  };
} {
  if (!isRecord(value)) {
    return false;
  }

  const appearance = value.appearance;

  return (
    Array.isArray(value.widgets) &&
    isRecord(appearance) &&
    isLegacyTheme(appearance.theme) &&
    typeof appearance.backgroundColor === 'string'
  );
}

function isDashboardConfigV2(value: unknown): value is Record<
  string,
  unknown
> & {
  version: 2;
  widgets: Array<WidgetConfig | RetiredGoogleCalendarWidgetConfig>;
  appearance: LegacyAppearanceConfig;
} {
  return (
    hasValidLegacyDashboardEnvelope(value) &&
    value.version === 2 &&
    value.widgets.every(
      (widget) =>
        isWidgetConfig(widget) || isRetiredGoogleCalendarWidgetConfig(widget),
    )
  );
}

function isDashboardConfigV3(value: unknown): value is Record<
  string,
  unknown
> & {
  version: 3;
  widgets: WidgetConfig[];
  appearance: WallpaperAppearanceConfig;
} {
  return (
    hasValidLegacyDashboardEnvelope(value) &&
    value.version === 3 &&
    isWallpaperConfig(value.appearance.wallpaper) &&
    value.widgets.every(isWidgetConfig)
  );
}

function isDashboardConfigV4(value: unknown): value is Record<
  string,
  unknown
> & {
  version: 4;
  widgets: WidgetConfig[];
  appearance: DashboardConfigV4Appearance;
} {
  return (
    hasValidLegacyDashboardEnvelope(value) &&
    value.version === 4 &&
    isWallpaperConfig(value.appearance.wallpaper) &&
    typeof value.appearance.liquidGlassEnabled === 'boolean' &&
    value.widgets.every(isWidgetConfig)
  );
}

function isLiquidGlassConfig(value: unknown): value is LiquidGlassConfig {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    isIntegerInRange(value.transparency, 0, 100) &&
    isIntegerInRange(value.blur, 0, 40) &&
    isIntegerInRange(value.shadow, 0, 100)
  );
}

function isDashboardConfigV5(value: unknown): value is Record<
  string,
  unknown
> & {
  version: 5;
  widgets: WidgetConfig[];
  appearance: DashboardConfigV5Appearance;
} {
  return (
    hasValidLegacyDashboardEnvelope(value) &&
    value.version === 5 &&
    isWallpaperConfig(value.appearance.wallpaper) &&
    isLiquidGlassConfig(value.appearance.liquidGlass) &&
    value.widgets.every(isWidgetConfig)
  );
}

function isCustomThemeColors(value: unknown): value is CustomThemeColors {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== ALL_CUSTOM_THEME_COLOR_KEYS.length) return false;
  return ALL_CUSTOM_THEME_COLOR_KEYS.every(
    (key) => typeof value[key] === 'string' && isValidHex(value[key]),
  );
}

function isCustomTheme(value: unknown): value is CustomTheme {
  if (!isRecord(value)) return false;
  if (!isValidUuid(value.id)) return false;
  if (
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    value.name.trim().length > 64
  ) {
    return false;
  }
  if (
    value.description !== undefined &&
    (typeof value.description !== 'string' || value.description.length > 200)
  ) {
    return false;
  }
  if (value.mode !== 'light' && value.mode !== 'dark') return false;
  if (value.baseThemeId !== undefined && !isBuiltinThemeId(value.baseThemeId)) {
    return false;
  }
  if (!isCustomThemeColors(value.colors)) return false;
  if (
    !Array.isArray(value.manualOverrides) ||
    !value.manualOverrides.every((k) => isCustomThemeColorKey(k))
  ) {
    return false;
  }
  if (value.glow !== undefined && typeof value.glow !== 'boolean') {
    return false;
  }
  return true;
}

function isValidCustomThemesList(value: unknown): value is CustomTheme[] {
  if (!Array.isArray(value)) return false;
  if (!value.every(isCustomTheme)) return false;

  const ids = new Set(value.map((t) => t.id));
  if (ids.size !== value.length) return false;

  const names = new Set(value.map((t) => t.name.trim().toLowerCase()));
  if (names.size !== value.length) return false;

  return true;
}

function isThemeRef(
  value: unknown,
  customThemes: readonly CustomTheme[],
): value is ThemeRef {
  if (!isRecord(value)) return false;
  if (value.type === 'builtin') {
    return isBuiltinThemeId(value.id);
  }
  if (value.type === 'custom') {
    return isValidUuid(value.id) && customThemes.some((t) => t.id === value.id);
  }
  return false;
}

function isBackgroundColorConfig(
  value: unknown,
): value is BackgroundColorConfig {
  if (!isRecord(value)) return false;
  if (value.type === 'theme') return true;
  if (value.type === 'custom') {
    return typeof value.color === 'string' && isValidHex(value.color);
  }
  return false;
}

function isDashboardConfigV6(value: unknown): value is DashboardConfig {
  if (!isRecord(value)) return false;
  if (value.version !== DASHBOARD_CONFIG_VERSION) return false;
  if (!Array.isArray(value.widgets) || !value.widgets.every(isWidgetConfig)) {
    return false;
  }
  if (!isValidCustomThemesList(value.customThemes)) return false;
  if (!isRecord(value.appearance)) return false;
  if (!isThemeRef(value.appearance.theme, value.customThemes)) return false;
  if (!isBackgroundColorConfig(value.appearance.backgroundColor)) return false;
  if (!isWallpaperConfig(value.appearance.wallpaper)) return false;
  if (!isLiquidGlassConfig(value.appearance.liquidGlass)) return false;
  return true;
}

function isLegacyWidgetConfig(value: unknown): boolean {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    (value.title !== undefined && typeof value.title !== 'string') ||
    !isWidgetLayout(value.layout)
  ) {
    return false;
  }

  if (value.type === 'links') {
    return typeof value.content === 'string';
  }

  if (value.type === 'search') {
    return isSearchEngine(value.engine);
  }

  return false;
}

function isDashboardConfigV1(value: unknown): value is Record<
  string,
  unknown
> & {
  version: 1;
  widgets: Array<Record<string, unknown>>;
  appearance: LegacyAppearanceConfig;
} {
  return (
    hasValidLegacyDashboardEnvelope(value) &&
    value.version === 1 &&
    value.widgets.every(isLegacyWidgetConfig)
  );
}

function readVersion(value: unknown): number {
  if (!isRecord(value) || !Number.isInteger(value.version)) {
    throw new InvalidDashboardConfigError(
      'Dashboard config version is missing',
    );
  }

  return value.version as number;
}

function normalizeDashboardConfig(config: DashboardConfig): DashboardConfig {
  let hasChanges = false;
  const widgets = config.widgets.map((widget) => {
    let normalized = widget;

    if (widget.type === 'search' && widget.layout.h !== 1) {
      hasChanges = true;
      normalized = {
        ...normalized,
        layout: {
          ...normalized.layout,
          h: 1,
        },
      };
    }

    if (
      normalized.type === 'weather' &&
      (normalized.location as { type: string }).type === 'auto'
    ) {
      hasChanges = true;
      normalized = {
        ...normalized,
        location: { type: 'unset' },
      };
    }

    return normalized;
  });

  return hasChanges ? { ...config, widgets } : config;
}

export function migrateDashboardConfig(value: unknown): DashboardConfig {
  const version = readVersion(value);

  if (version === 1) {
    if (!isDashboardConfigV1(value)) {
      throw new InvalidDashboardConfigError();
    }

    return normalizeDashboardConfig({
      version: DASHBOARD_CONFIG_VERSION,
      appearance: {
        theme: {
          type: 'builtin',
          id: value.appearance.theme as BuiltinThemeId,
        },
        backgroundColor: {
          type: 'custom',
          color: value.appearance.backgroundColor,
        },
        wallpaper: { type: 'none' },
        liquidGlass: { ...DEFAULT_LIQUID_GLASS },
      },
      widgets: value.widgets.map((widget) =>
        widget.type === 'links'
          ? ({ ...widget, type: 'markdown' } as WidgetConfig)
          : (widget as unknown as WidgetConfig),
      ),
      customThemes: [],
    });
  }

  if (version === 2) {
    if (!isDashboardConfigV2(value)) {
      throw new InvalidDashboardConfigError();
    }

    return normalizeDashboardConfig({
      version: DASHBOARD_CONFIG_VERSION,
      appearance: {
        theme: {
          type: 'builtin',
          id: value.appearance.theme as BuiltinThemeId,
        },
        backgroundColor: {
          type: 'custom',
          color: value.appearance.backgroundColor,
        },
        wallpaper: { type: 'none' },
        liquidGlass: { ...DEFAULT_LIQUID_GLASS },
      },
      widgets: value.widgets.filter(isWidgetConfig),
      customThemes: [],
    });
  }

  if (version === 3) {
    if (!isDashboardConfigV3(value)) {
      throw new InvalidDashboardConfigError();
    }

    return normalizeDashboardConfig({
      version: DASHBOARD_CONFIG_VERSION,
      widgets: value.widgets,
      appearance: {
        theme: {
          type: 'builtin',
          id: value.appearance.theme as BuiltinThemeId,
        },
        backgroundColor: {
          type: 'custom',
          color: value.appearance.backgroundColor,
        },
        wallpaper: value.appearance.wallpaper,
        liquidGlass: { ...DEFAULT_LIQUID_GLASS },
      },
      customThemes: [],
    });
  }

  if (version === 4) {
    if (!isDashboardConfigV4(value)) {
      throw new InvalidDashboardConfigError();
    }

    const { liquidGlassEnabled, ...appearance } = value.appearance;

    return normalizeDashboardConfig({
      version: DASHBOARD_CONFIG_VERSION,
      widgets: value.widgets,
      appearance: {
        theme: { type: 'builtin', id: appearance.theme as BuiltinThemeId },
        backgroundColor: { type: 'custom', color: appearance.backgroundColor },
        wallpaper: appearance.wallpaper,
        liquidGlass: {
          ...DEFAULT_LIQUID_GLASS,
          enabled: liquidGlassEnabled,
        },
      },
      customThemes: [],
    });
  }

  if (version === 5) {
    if (!isDashboardConfigV5(value)) {
      throw new InvalidDashboardConfigError();
    }

    return normalizeDashboardConfig({
      version: DASHBOARD_CONFIG_VERSION,
      widgets: value.widgets,
      appearance: {
        theme: {
          type: 'builtin',
          id: value.appearance.theme as BuiltinThemeId,
        },
        backgroundColor: {
          type: 'custom',
          color: value.appearance.backgroundColor,
        },
        wallpaper: value.appearance.wallpaper,
        liquidGlass: value.appearance.liquidGlass,
      },
      customThemes: [],
    });
  }

  if (version === DASHBOARD_CONFIG_VERSION) {
    if (!isDashboardConfigV6(value)) {
      throw new InvalidDashboardConfigError();
    }

    return normalizeDashboardConfig(value);
  }

  throw new UnsupportedDashboardConfigVersionError(version);
}
