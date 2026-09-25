import {
  DASHBOARD_CONFIG_VERSION,
  type DashboardConfig,
  type LiquidGlassConfig,
  type Theme,
  type WallpaperConfig,
  type WidgetConfig,
  isImageAssetId,
  isWallpaperAssetId,
} from './schema';
import {
  IMAGE_OBJECT_POSITIONS,
  type ImageFitMode,
  type ImageObjectPosition,
  type ImageWidgetSource,
} from '../widgets/image/types';
import { isSearchEngine } from '../widgets/search/engines';
import { DEFAULT_LIQUID_GLASS } from './defaults';

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

const VALID_THEMES: ReadonlySet<string> = new Set<Theme>([
  'system',
  'light',
  'dark',
  'tokyo-night',
  'rainy-tokyo',
  'cozy-lofi-night',
  'catppuccin-mocha',
  'catppuccin-latte',
  'nord',
  'synthwave-84',
  'solarized-dark',
]);

function isTheme(value: unknown): value is Theme {
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
  if (typeof value !== 'string') {
    return false;
  }

  if ((IMAGE_OBJECT_POSITIONS as readonly string[]).includes(value)) {
    return true;
  }

  return /^\d+(\.\d+)?%\s+\d+(\.\d+)?%$/.test(value.trim());
}

function isImageFitMode(value: unknown): value is ImageFitMode {
  return value === 'cover' || value === 'contain';
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

  return false;
}

interface RetiredGoogleCalendarWidgetConfig {
  id: string;
  type: 'google-calendar';
  title?: string;
  selectedCalendarIds: string[] | null;
  layout: { x: number; y: number; w: number; h: number };
}

function isRetiredGoogleCalendarWidgetConfig(
  value: unknown,
): value is RetiredGoogleCalendarWidgetConfig {
  return (
    isRecord(value) &&
    value.type === 'google-calendar' &&
    isValidWidgetId(value.id) &&
    (value.title === undefined || typeof value.title === 'string') &&
    isWidgetLayout(value.layout) &&
    (value.selectedCalendarIds === null ||
      (Array.isArray(value.selectedCalendarIds) &&
        value.selectedCalendarIds.every(
          (calendarId) => typeof calendarId === 'string',
        )))
  );
}

interface LegacyAppearanceConfig {
  theme: Theme;
  backgroundColor: string;
}

interface WallpaperAppearanceConfig extends LegacyAppearanceConfig {
  wallpaper: WallpaperConfig;
}

interface DashboardConfigV4Appearance extends WallpaperAppearanceConfig {
  liquidGlassEnabled: boolean;
}

function hasValidLegacyDashboardEnvelope(value: unknown): value is Record<
  string,
  unknown
> & {
  widgets: unknown[];
  appearance: Record<string, unknown> & LegacyAppearanceConfig;
} {
  if (!isRecord(value)) {
    return false;
  }

  const appearance = value.appearance;

  return (
    Array.isArray(value.widgets) &&
    isRecord(appearance) &&
    isTheme(appearance.theme) &&
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

function isDashboardConfigV5(value: unknown): value is DashboardConfig {
  return (
    hasValidLegacyDashboardEnvelope(value) &&
    value.version === DASHBOARD_CONFIG_VERSION &&
    isWallpaperConfig(value.appearance.wallpaper) &&
    isLiquidGlassConfig(value.appearance.liquidGlass) &&
    value.widgets.every(isWidgetConfig)
  );
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
    if (widget.type !== 'search' || widget.layout.h === 1) {
      return widget;
    }

    hasChanges = true;
    return {
      ...widget,
      layout: {
        ...widget.layout,
        h: 1,
      },
    };
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
        ...value.appearance,
        wallpaper: { type: 'none' },
        liquidGlass: { ...DEFAULT_LIQUID_GLASS },
      },
      widgets: value.widgets.map((widget) =>
        widget.type === 'links'
          ? ({ ...widget, type: 'markdown' } as WidgetConfig)
          : (widget as unknown as WidgetConfig),
      ),
    });
  }

  if (version === 2) {
    if (!isDashboardConfigV2(value)) {
      throw new InvalidDashboardConfigError();
    }

    return normalizeDashboardConfig({
      version: DASHBOARD_CONFIG_VERSION,
      appearance: {
        ...value.appearance,
        wallpaper: { type: 'none' },
        liquidGlass: { ...DEFAULT_LIQUID_GLASS },
      },
      widgets: value.widgets.filter(isWidgetConfig),
    });
  }

  if (version === 3) {
    if (!isDashboardConfigV3(value)) {
      throw new InvalidDashboardConfigError();
    }

    return normalizeDashboardConfig({
      ...value,
      version: DASHBOARD_CONFIG_VERSION,
      appearance: {
        ...value.appearance,
        liquidGlass: { ...DEFAULT_LIQUID_GLASS },
      },
    });
  }

  if (version === 4) {
    if (!isDashboardConfigV4(value)) {
      throw new InvalidDashboardConfigError();
    }

    const { liquidGlassEnabled, ...appearance } = value.appearance;

    return normalizeDashboardConfig({
      ...value,
      version: DASHBOARD_CONFIG_VERSION,
      appearance: {
        ...appearance,
        liquidGlass: {
          ...DEFAULT_LIQUID_GLASS,
          enabled: liquidGlassEnabled,
        },
      },
    });
  }

  if (version === DASHBOARD_CONFIG_VERSION) {
    if (!isDashboardConfigV5(value)) {
      throw new InvalidDashboardConfigError();
    }

    return normalizeDashboardConfig(value);
  }

  throw new UnsupportedDashboardConfigVersionError(version);
}
