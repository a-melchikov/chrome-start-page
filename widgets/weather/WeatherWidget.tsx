import { useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui';
import { useWeather } from './use-weather';
import {
  formatDaySlot,
  formatHourSlot,
  formatHumidity,
  formatPressure,
  formatRelativeUpdate,
  formatTemperature,
  formatUvIndex,
  formatVisibility,
  formatWindDirection,
  formatWindSpeed,
  getWeatherConditionInfo,
} from './weather-utils';
import {
  DropletIcon,
  EyeIcon,
  GaugeIcon,
  RefreshCwIcon,
  SunMediumIcon,
  ThermometerIcon,
  WeatherConditionIcon,
  WindIcon,
} from './WeatherIcons';
import { WeatherVisualEffects } from './WeatherVisualEffects';
import type { WeatherWidgetConfig } from './types';

export interface WeatherWidgetProps {
  config: WeatherWidgetConfig;
}

export function WeatherWidget({ config }: WeatherWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>({
    width: 300,
    height: 300,
  });

  const {
    forecast,
    fetchedAt,
    loading,
    error,
    accessRequired,
    retry,
    grantAccess,
  } = useWeather(config);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const locationTitle =
    config.location.type === 'city' ? config.location.name : 'Погода';

  const isSmall = dimensions.height < 210 || dimensions.width < 220;
  const isLarge = dimensions.height >= 320 && dimensions.width >= 240;

  // Unconfigured state
  if (config.location.type === 'unset') {
    return (
      <div
        ref={containerRef}
        aria-label="Погода не настроена"
        className="relative flex h-full w-full select-none flex-col items-center justify-center p-3 text-center"
      >
        <div className="mb-2 rounded-full border border-theme-border/60 bg-theme-surface-elevated/40 p-2 text-theme-text-muted">
          <WeatherConditionIcon code={null} isDay={true} className="size-6" />
        </div>
        <p className="text-sm font-medium text-theme-text-primary">
          Погода не настроена
        </p>
        <p className="mt-1 max-w-[200px] text-xs text-theme-text-muted">
          Включите режим правки и откройте настройки, чтобы выбрать город или
          местоположение
        </p>
      </div>
    );
  }

  // Permission required state
  if (accessRequired) {
    return (
      <div
        ref={containerRef}
        aria-label="Требуется разрешение для погоды"
        className="relative flex h-full w-full select-none flex-col items-center justify-center p-3 text-center"
      >
        <p className="text-xs font-medium text-theme-danger">
          Требуется доступ к сервису погоды
        </p>
        <p className="mt-1 max-w-[220px] text-xs text-theme-text-muted">
          Для загрузки прогноза разрешите доступ к api.open-meteo.com
        </p>
        <Button
          className="mt-3"
          size="small"
          variant="primary"
          onClick={grantAccess}
        >
          Разрешить доступ
        </Button>
      </div>
    );
  }

  // Initial loading state (no cached data)
  if (loading && !forecast) {
    return (
      <div
        ref={containerRef}
        aria-label="Загрузка прогноза погоды"
        className="relative flex h-full w-full select-none flex-col items-center justify-center p-3 text-center"
      >
        <div className="size-6 animate-spin rounded-full border-2 border-theme-accent border-t-transparent" />
        <p className="mt-2 text-xs text-theme-text-muted">Загрузка прогноза…</p>
      </div>
    );
  }

  // Fatal error state (no cached data)
  if (error && !forecast) {
    return (
      <div
        ref={containerRef}
        aria-label="Ошибка загрузки погоды"
        className="relative flex h-full w-full select-none flex-col items-center justify-center p-3 text-center"
      >
        <p className="text-xs font-medium text-theme-danger">
          Не удалось получить погоду
        </p>
        <p className="mt-1 max-w-[220px] text-xs text-theme-text-muted">
          {error}
        </p>
        <Button
          className="mt-3 gap-1.5"
          size="small"
          variant="secondary"
          onClick={retry}
        >
          <RefreshCwIcon className="size-3.5" />
          Повторить
        </Button>
      </div>
    );
  }

  if (!forecast) {
    return null;
  }

  const { current, hourly, daily, timezone } = forecast;
  const condition = getWeatherConditionInfo(current.code);
  const isVisual = config.mode === 'visual';
  const todayDaily = daily[0];

  return (
    <div
      ref={containerRef}
      aria-label={`Погода в ${locationTitle}: ${formatTemperature(
        current.temperature,
      )}, ${condition.label}`}
      className="relative flex h-full w-full select-none flex-col justify-between overflow-hidden rounded-xl text-theme-text-primary"
    >
      {/* Decorative Visual Background */}
      {isVisual && (
        <WeatherVisualEffects
          code={current.code}
          isDay={current.isDay}
          rain={current.rain}
          snowfall={current.snowfall}
          windDirection={current.windDirection}
          windSpeed={current.windSpeed}
        />
      )}

      {/* Content wrapper with readable background scrim in visual mode */}
      <div
        className={`relative z-1 flex h-full w-full flex-col overflow-hidden p-3 ${
          isVisual ? 'bg-theme-surface/35 backdrop-blur-[2px]' : ''
        }`}
      >
        {/* Header: Location & Stale status / Update time */}
        <div className="flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-base font-semibold leading-tight text-theme-text-primary"
              title={locationTitle}
            >
              {locationTitle}
            </h3>
            {config.location.type === 'city' && config.location.country ? (
              <p className="truncate text-[11px] text-theme-text-muted">
                {[config.location.region, config.location.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            ) : null}
          </div>

          {/* Stale data warning badge, Updating or Last updated time */}
          {error && fetchedAt ? (
            <button
              aria-label="Данные устарели. Нажмите для обновления."
              className="flex shrink-0 items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
              title={`${error}. ${formatRelativeUpdate(fetchedAt)}`}
              type="button"
              onClick={retry}
            >
              <RefreshCwIcon className="size-2.5" />
              <span>Устарело</span>
            </button>
          ) : loading ? (
            <span
              className="shrink-0 text-[10px] text-theme-text-muted"
              role="status"
            >
              Обновление…
            </span>
          ) : fetchedAt ? (
            <span className="shrink-0 text-[10px] text-theme-text-muted">
              {formatRelativeUpdate(fetchedAt)}
            </span>
          ) : null}
        </div>

        {/* Primary weather indicator: Temperature and Condition */}
        <div className="my-auto flex items-center justify-between gap-3 py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-theme-text-primary">
              {formatTemperature(current.temperature)}
            </span>
            {current.apparentTemperature !== null && !isSmall ? (
              <span
                className="text-xs text-theme-text-secondary"
                title="Ощущается как"
              >
                ощущается {formatTemperature(current.apparentTemperature)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col items-end">
            <WeatherConditionIcon
              className="size-8 text-theme-accent"
              code={current.code}
              isDay={current.isDay}
            />
            <span className="text-right text-xs font-medium text-theme-text-secondary">
              {condition.label}
            </span>
          </div>
        </div>

        {/* Secondary Parameters (Medium / Large view) */}
        {!isSmall && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 rounded-lg border border-theme-border/40 bg-theme-surface-elevated/20 p-2 text-[11px] sm:grid-cols-4">
            {/* Min / Max */}
            <div className="flex items-center gap-1.5 text-theme-text-secondary">
              <ThermometerIcon className="size-3.5 shrink-0 text-theme-text-muted" />
              <span className="truncate">
                {formatTemperature(todayDaily?.min)} /{' '}
                {formatTemperature(todayDaily?.max)}
              </span>
            </div>

            {/* Wind */}
            <div className="flex items-center gap-1.5 text-theme-text-secondary">
              <WindIcon className="size-3.5 shrink-0 text-theme-text-muted" />
              <span className="truncate">
                {formatWindSpeed(current.windSpeed)}{' '}
                {formatWindDirection(current.windDirection)}
              </span>
            </div>

            {/* Humidity */}
            <div className="flex items-center gap-1.5 text-theme-text-secondary">
              <DropletIcon className="size-3.5 shrink-0 text-theme-text-muted" />
              <span className="truncate">
                {formatHumidity(current.humidity)}
              </span>
            </div>

            {/* Pressure */}
            <div className="flex items-center gap-1.5 text-theme-text-secondary">
              <GaugeIcon className="size-3.5 shrink-0 text-theme-text-muted" />
              <span className="truncate">
                {formatPressure(current.pressure)}
              </span>
            </div>

            {/* UV Index (if space permits) */}
            {isLarge && (
              <>
                <div className="flex items-center gap-1.5 text-theme-text-secondary">
                  <SunMediumIcon className="size-3.5 shrink-0 text-theme-text-muted" />
                  <span className="truncate">
                    УФ {formatUvIndex(current.uv)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-theme-text-secondary">
                  <EyeIcon className="size-3.5 shrink-0 text-theme-text-muted" />
                  <span className="truncate">
                    {formatVisibility(current.visibility)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Large View: 12-hour hourly forecast */}
        {isLarge && hourly.length > 0 && (
          <div className="mt-2.5">
            <div className="mb-1 text-[11px] font-medium text-theme-text-muted">
              По часам
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {hourly.slice(0, 12).map((hour, idx) => (
                <div
                  key={idx}
                  className="flex min-w-[44px] shrink-0 flex-col items-center rounded-md border border-theme-border/30 bg-theme-surface/40 py-1.5 text-center"
                >
                  <span className="text-[10px] text-theme-text-muted">
                    {formatHourSlot(hour.time, timezone)}
                  </span>
                  <WeatherConditionIcon
                    className="my-1 size-4 text-theme-accent"
                    code={hour.code}
                    isDay={current.isDay}
                  />
                  <span className="text-[11px] font-medium">
                    {formatTemperature(hour.temperature)}
                  </span>
                  {hour.precipitationProbability !== null &&
                  hour.precipitationProbability > 0 ? (
                    <span className="text-[9px] text-blue-400">
                      {hour.precipitationProbability}%
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Large View: 5-day daily forecast */}
        {isLarge && daily.length > 0 && (
          <div className="mt-2">
            <div className="mb-1 text-[11px] font-medium text-theme-text-muted">
              На 5 дней
            </div>
            <div className="space-y-1">
              {daily.slice(0, 5).map((day, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border border-theme-border/20 bg-theme-surface/30 px-2 py-1 text-xs"
                >
                  <span className="w-16 truncate font-medium text-theme-text-secondary">
                    {formatDaySlot(day.date, timezone, idx)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <WeatherConditionIcon
                      className="size-3.5 text-theme-accent"
                      code={day.code}
                      isDay={true}
                    />
                    <span className="w-20 text-right text-[11px] tabular-nums">
                      <span className="text-theme-text-muted">
                        {formatTemperature(day.min)}
                      </span>{' '}
                      /{' '}
                      <span className="font-medium text-theme-text-primary">
                        {formatTemperature(day.max)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
