import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import * as weatherCache from '../../../storage/weather-cache';
import * as api from '../../../widgets/weather/api';
import type {
  WeatherForecast,
  WeatherWidgetConfig,
} from '../../../widgets/weather/types';
import { useWeather } from '../../../widgets/weather/use-weather';

const mockForecast: WeatherForecast = {
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
      precipitationProbability: 0,
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

describe('useWeather hook', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('does not load or fetch when location is unset', () => {
    const config: WeatherWidgetConfig = {
      id: 'w-unset',
      type: 'weather',
      mode: 'visual',
      location: { type: 'unset' },
      layout: { x: 0, y: 0, w: 5, h: 5 },
    };

    const fetchSpy = vi.spyOn(api, 'fetchWeather');
    const { result } = renderHook(() => useWeather(config));

    expect(result.current.loading).toBe(false);
    expect(result.current.forecast).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('loads fresh cached forecast without network fetch', async () => {
    const config: WeatherWidgetConfig = {
      id: 'w-cached',
      type: 'weather',
      mode: 'visual',
      location: {
        type: 'city',
        id: 524901,
        name: 'Москва',
        region: 'Москва',
        country: 'Россия',
        latitude: 55.75,
        longitude: 37.62,
        timezone: 'Europe/Moscow',
      },
      layout: { x: 0, y: 0, w: 5, h: 5 },
    };

    const cacheEntry: weatherCache.WeatherCacheEntry = {
      version: 1,
      fingerprint: 'city:524901:55.75:37.62',
      fetchedAt: Date.now() - 5 * 60 * 1000, // 5 min ago (< 30 min)
      lastAttemptAt: Date.now() - 5 * 60 * 1000,
      forecast: mockForecast,
    };

    vi.spyOn(weatherCache, 'loadWeatherCache').mockResolvedValue(cacheEntry);
    const fetchSpy = vi.spyOn(api, 'fetchWeather');

    const { result } = renderHook(() => useWeather(config));

    await waitFor(() => {
      expect(result.current.forecast).toEqual(mockForecast);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches from API when cache is stale and saves to cache', async () => {
    const config: WeatherWidgetConfig = {
      id: 'w-fetch',
      type: 'weather',
      mode: 'visual',
      location: {
        type: 'city',
        id: 524901,
        name: 'Москва',
        region: 'Москва',
        country: 'Россия',
        latitude: 55.75,
        longitude: 37.62,
        timezone: 'Europe/Moscow',
      },
      layout: { x: 0, y: 0, w: 5, h: 5 },
    };

    vi.spyOn(weatherCache, 'loadWeatherCache').mockResolvedValue(null);
    const saveSpy = vi.spyOn(weatherCache, 'saveWeatherCache');
    const fetchSpy = vi
      .spyOn(api, 'fetchWeather')
      .mockResolvedValue(mockForecast);

    const { result } = renderHook(() => useWeather(config));

    await waitFor(() => {
      expect(result.current.forecast).toEqual(mockForecast);
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      { latitude: 55.75, longitude: 37.62 },
      'Europe/Moscow',
    );
    expect(saveSpy).toHaveBeenCalledWith(
      'w-fetch',
      expect.objectContaining({
        fingerprint: 'city:524901:55.75:37.62',
        forecast: mockForecast,
      }),
    );
  });

  it('preserves cached data when refresh encounters an error', async () => {
    const config: WeatherWidgetConfig = {
      id: 'w-err-stale',
      type: 'weather',
      mode: 'visual',
      location: {
        type: 'city',
        id: 524901,
        name: 'Москва',
        region: 'Москва',
        country: 'Россия',
        latitude: 55.75,
        longitude: 37.62,
        timezone: 'Europe/Moscow',
      },
      layout: { x: 0, y: 0, w: 5, h: 5 },
    };

    const staleEntry: weatherCache.WeatherCacheEntry = {
      version: 1,
      fingerprint: 'city:524901:55.75:37.62',
      fetchedAt: Date.now() - 40 * 60 * 1000, // 40 min ago (> 30 min)
      lastAttemptAt: Date.now() - 40 * 60 * 1000,
      forecast: mockForecast,
    };

    vi.spyOn(weatherCache, 'loadWeatherCache').mockResolvedValue(staleEntry);
    vi.spyOn(api, 'fetchWeather').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWeather(config));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.forecast).toEqual(mockForecast);
    });
  });
});
