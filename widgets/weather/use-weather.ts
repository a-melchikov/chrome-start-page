import { useCallback, useEffect, useRef, useState } from 'react';

import {
  loadWeatherCache,
  saveWeatherCache,
  WEATHER_CACHE_FRESH_MS,
  WEATHER_CACHE_RETRY_MS,
  type WeatherCacheEntry,
} from '../../storage/weather-cache';
import { fetchWeather } from './api';
import type { WeatherForecast, WeatherWidgetConfig } from './types';

interface WeatherState {
  forecast: WeatherForecast | null;
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
  accessRequired: boolean;
}

const EMPTY_STATE: WeatherState = {
  forecast: null,
  fetchedAt: null,
  loading: false,
  error: null,
  accessRequired: false,
};

function fingerprint(config: WeatherWidgetConfig): string {
  return config.location.type === 'city'
    ? `city:${config.location.id}:${config.location.latitude}:${config.location.longitude}`
    : 'unset';
}

export function useWeather(config: WeatherWidgetConfig) {
  const [state, setState] = useState<WeatherState>(EMPTY_STATE);
  const activeRef = useRef(0);
  const lastManualAttemptRef = useRef(0);

  const refresh = useCallback(
    async (
      coords: { latitude: number; longitude: number },
      timezone: string | undefined,
      forced: boolean,
      generation: number,
    ) => {
      const key = fingerprint(config);

      const run = async () => {
        const existing = await loadWeatherCache(config.id);
        const matched = existing?.fingerprint === key ? existing : null;
        const now = Date.now();

        if (
          !forced &&
          matched &&
          now - matched.fetchedAt < WEATHER_CACHE_FRESH_MS
        ) {
          if (generation === activeRef.current) {
            setState({
              forecast: matched.forecast,
              fetchedAt: matched.fetchedAt,
              loading: false,
              error: null,
              accessRequired: false,
            });
          }
          return;
        }

        if (
          !forced &&
          matched &&
          now - matched.lastAttemptAt < WEATHER_CACHE_RETRY_MS
        ) {
          return;
        }

        if (generation === activeRef.current) {
          setState((previous) => ({
            ...previous,
            loading: true,
            error: null,
            accessRequired: false,
          }));
        }

        try {
          const forecast = await fetchWeather(coords, timezone);
          const entry: WeatherCacheEntry = {
            version: 1,
            fingerprint: key,
            fetchedAt: Date.now(),
            lastAttemptAt: now,
            forecast,
          };
          await saveWeatherCache(config.id, entry);
          if (generation === activeRef.current) {
            setState({
              forecast,
              fetchedAt: entry.fetchedAt,
              loading: false,
              error: null,
              accessRequired: false,
            });
          }
        } catch (error) {
          if (matched) {
            await saveWeatherCache(config.id, {
              ...matched,
              lastAttemptAt: now,
            });
          }
          if (generation === activeRef.current) {
            setState((previous) => ({
              ...previous,
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : 'Не удалось обновить погоду',
            }));
          }
        }
      };

      if (navigator.locks) {
        await navigator.locks.request(`weather-${config.id}`, run);
      } else {
        await run();
      }
    },
    [config],
  );

  useEffect(() => {
    const generation = ++activeRef.current;
    setState(EMPTY_STATE);
    if (config.location.type === 'unset') return;

    const coords = {
      latitude: config.location.latitude,
      longitude: config.location.longitude,
    };
    const timezone = config.location.timezone;

    void (async () => {
      try {
        const cached = await loadWeatherCache(config.id);
        if (generation !== activeRef.current) return;

        const matched =
          cached?.fingerprint === fingerprint(config) ? cached : null;

        setState({
          forecast: matched?.forecast ?? null,
          fetchedAt: matched?.fetchedAt ?? null,
          loading: !matched,
          error: null,
          accessRequired: false,
        });

        await refresh(coords, timezone, false, generation);
      } catch (error) {
        if (generation === activeRef.current) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Не удалось загрузить погоду',
          }));
        }
      }
    })();

    return () => {
      activeRef.current += 1;
    };
  }, [config, refresh]);

  const retry = useCallback(() => {
    const now = Date.now();
    if (now - lastManualAttemptRef.current < 2_000) return;
    lastManualAttemptRef.current = now;

    if (config.location.type === 'city') {
      const coords = {
        latitude: config.location.latitude,
        longitude: config.location.longitude,
      };
      void refresh(coords, config.location.timezone, true, activeRef.current);
    }
  }, [config, refresh]);

  const grantAccess = useCallback(async () => {
    retry();
  }, [retry]);

  return { ...state, retry, grantAccess };
}
