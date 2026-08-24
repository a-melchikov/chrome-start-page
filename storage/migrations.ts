import {
  DASHBOARD_CONFIG_VERSION,
  type DashboardConfig,
  type Theme,
  type WidgetConfig,
} from './schema';
import { isSearchEngine } from '../widgets/search/engines';

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

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark';
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

function isWidgetConfig(value: unknown): value is WidgetConfig {
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

function isDashboardConfigV1(value: unknown): value is DashboardConfig {
  if (!isRecord(value)) {
    return false;
  }

  const appearance = value.appearance;

  return (
    value.version === DASHBOARD_CONFIG_VERSION &&
    Array.isArray(value.widgets) &&
    value.widgets.every(isWidgetConfig) &&
    isRecord(appearance) &&
    isTheme(appearance.theme) &&
    typeof appearance.backgroundColor === 'string'
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

  if (version !== DASHBOARD_CONFIG_VERSION) {
    throw new UnsupportedDashboardConfigVersionError(version);
  }

  if (!isDashboardConfigV1(value)) {
    throw new InvalidDashboardConfigError();
  }

  return normalizeDashboardConfig(value);
}
