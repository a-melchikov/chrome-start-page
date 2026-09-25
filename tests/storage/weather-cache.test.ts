import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  clearWeatherCaches,
  cleanupUnusedWeatherCaches,
  getWeatherCacheKey,
  isWeatherCacheEntry,
  loadWeatherCache,
  removeWeatherCache,
  saveWeatherCache,
  type WeatherCacheEntry,
} from '../../storage/weather-cache';
import type { WeatherForecast } from '../../widgets/weather/types';

function createMockForecast(): WeatherForecast {
  return {
    timezone: 'Europe/Moscow',
    current: {
      time: '2026-09-25T14:00',
      temperature: 15,
      apparentTemperature: 14,
      code: 1,
      isDay: true,
      humidity: 60,
      windSpeed: 3.5,
      windDirection: 180,
      pressure: 1013,
      rain: 0,
      showers: 0,
      snowfall: 0,
      uv: 3,
      visibility: 10000,
    },
    hourly: [
      {
        time: '2026-09-25T14:00',
        temperature: 15,
        code: 1,
        precipitationProbability: 10,
      },
    ],
    daily: [
      {
        date: '2026-09-25',
        min: 10,
        max: 18,
        code: 1,
        sunrise: '06:00',
        sunset: '19:00',
      },
    ],
  };
}

function createMockEntry(
  fingerprint = 'city:524901:55.75:37.62',
): WeatherCacheEntry {
  return {
    version: 1,
    fingerprint,
    fetchedAt: Date.now(),
    lastAttemptAt: Date.now(),
    forecast: createMockForecast(),
  };
}

describe('weather cache storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('stores and loads a cache entry under its widget id', async () => {
    const entry = createMockEntry();
    await saveWeatherCache('weather-1', entry);

    await expect(loadWeatherCache('weather-1')).resolves.toEqual(entry);
    await expect(
      storage.getItem(getWeatherCacheKey('weather-1')),
    ).resolves.toEqual(entry);
  });

  it('returns null when a cache entry is missing', async () => {
    await expect(loadWeatherCache('weather-missing')).resolves.toBeNull();
  });

  it('deletes a stored cache entry', async () => {
    const entry = createMockEntry();
    await saveWeatherCache('weather-1', entry);
    await removeWeatherCache('weather-1');

    await expect(loadWeatherCache('weather-1')).resolves.toBeNull();
  });

  it('clears all weather caches without touching unrelated keys', async () => {
    await saveWeatherCache('weather-1', createMockEntry());
    await saveWeatherCache('weather-2', createMockEntry());
    await storage.setItem('local:unrelated', 'test');

    await clearWeatherCaches();

    await expect(loadWeatherCache('weather-1')).resolves.toBeNull();
    await expect(loadWeatherCache('weather-2')).resolves.toBeNull();
    await expect(storage.getItem('local:unrelated')).resolves.toBe('test');
  });

  it('cleans up unused weather caches on widget removal', async () => {
    await saveWeatherCache('w-1', createMockEntry());
    await saveWeatherCache('w-2', createMockEntry());

    await cleanupUnusedWeatherCaches(
      [
        { id: 'w-1', type: 'weather' },
        { id: 'w-2', type: 'weather' },
      ],
      [{ id: 'w-1', type: 'weather' }],
    );

    await expect(loadWeatherCache('w-1')).resolves.not.toBeNull();
    await expect(loadWeatherCache('w-2')).resolves.toBeNull();
  });

  it('validates cache entry schema correctly', () => {
    expect(isWeatherCacheEntry(createMockEntry())).toBe(true);
    expect(isWeatherCacheEntry(null)).toBe(false);
    expect(isWeatherCacheEntry({ version: 2 })).toBe(false);
    expect(isWeatherCacheEntry({ version: 1, fingerprint: 123 })).toBe(false);
  });
});
