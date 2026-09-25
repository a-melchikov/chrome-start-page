import { storage } from '#imports';

import type { WeatherForecast } from '../widgets/weather/types';

export const WEATHER_CACHE_PREFIX = 'local:weather-cache:' as const;
export const WEATHER_CACHE_FRESH_MS = 30 * 60 * 1000;
export const WEATHER_CACHE_RETRY_MS = 5 * 60 * 1000;

const LOCAL_KEY_PREFIX_LENGTH = 'local:'.length;
const WEATHER_SNAPSHOT_KEY_PREFIX = WEATHER_CACHE_PREFIX.slice(
  LOCAL_KEY_PREFIX_LENGTH,
);

export interface WeatherCacheEntry {
  version: 1;
  fingerprint: string;
  fetchedAt: number;
  lastAttemptAt: number;
  forecast: WeatherForecast;
}

export function getWeatherCacheKey(id: string): `local:${string}` {
  return `${WEATHER_CACHE_PREFIX}${id}`;
}

export function isWeatherCacheEntry(
  value: unknown,
): value is WeatherCacheEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const entry = value as Record<string, unknown>;
  if (
    entry.version !== 1 ||
    typeof entry.fingerprint !== 'string' ||
    typeof entry.fetchedAt !== 'number' ||
    !Number.isFinite(entry.fetchedAt) ||
    typeof entry.lastAttemptAt !== 'number' ||
    !Number.isFinite(entry.lastAttemptAt) ||
    typeof entry.forecast !== 'object' ||
    entry.forecast === null
  ) {
    return false;
  }
  const forecast = entry.forecast as Record<string, unknown>;
  return (
    typeof forecast.timezone === 'string' &&
    typeof forecast.current === 'object' &&
    forecast.current !== null &&
    Array.isArray(forecast.hourly) &&
    Array.isArray(forecast.daily)
  );
}

export async function loadWeatherCache(
  id: string,
): Promise<WeatherCacheEntry | null> {
  const key = getWeatherCacheKey(id);
  const value = await storage.getItem<unknown>(key);
  if (value === null) return null;
  if (!isWeatherCacheEntry(value)) {
    await storage.removeItem(key);
    return null;
  }
  return value;
}

export async function saveWeatherCache(
  id: string,
  entry: WeatherCacheEntry,
): Promise<void> {
  await storage.setItem(getWeatherCacheKey(id), entry);
}

export async function removeWeatherCache(id: string): Promise<void> {
  await storage.removeItem(getWeatherCacheKey(id));
}

export async function clearWeatherCaches(): Promise<void> {
  const snapshot = await storage.snapshot('local');
  const orphanKeys = Object.keys(snapshot)
    .filter((key) => key.startsWith(WEATHER_SNAPSHOT_KEY_PREFIX))
    .map((key) => `local:${key}` as const);

  if (orphanKeys.length > 0) {
    await storage.removeItems(orphanKeys);
  }
}

export async function cleanupUnusedWeatherCaches(
  previousWidgets: readonly { id: string; type: string }[],
  nextWidgets: readonly { id: string; type: string }[],
): Promise<void> {
  const previousWeatherIds = previousWidgets
    .filter((w) => w.type === 'weather')
    .map((w) => w.id);
  const nextWeatherIds = new Set(
    nextWidgets.filter((w) => w.type === 'weather').map((w) => w.id),
  );

  const removedIds = previousWeatherIds.filter((id) => !nextWeatherIds.has(id));
  if (removedIds.length > 0) {
    await storage.removeItems(removedIds.map((id) => getWeatherCacheKey(id)));
  }
}
