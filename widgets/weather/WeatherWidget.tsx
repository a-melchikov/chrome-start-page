import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '../../components/ui';
import { useWeather } from './use-weather';
import { deriveWeatherScene } from './weather-scene';
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
  const observerRef = useRef<ResizeObserver | null>(null);
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

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const width = Math.round(entry.contentRect.width);
          const height = Math.round(entry.contentRect.height);
          setDimensions((previous) =>
            previous.width === width && previous.height === height
              ? previous
              : { width, height },
          );
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const locationTitle =
    config.location.type === 'city' ? config.location.name : 'Погода';

  const isCompactHeight = dimensions.height < 230;
  const isSmall = dimensions.height < 140 || dimensions.width < 200;
  const isVisual = config.mode === 'visual';
  const showMetrics = isVisual || !isSmall;
  const isLarge =
    dimensions.height >= (isVisual ? 430 : 340) && dimensions.width >= 260;
  const showDaily =
    dimensions.height >= (isVisual ? 650 : 440) && dimensions.width >= 260;

  // Unconfigured state
  if (config.location.type === 'unset') {
    return (
      <div
        ref={containerRef}
        aria-label="Погода не настроена"
        className="relative flex h-full w-full select-none flex-col items-center justify-center p-6 text-center"
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
        className="relative flex h-full w-full select-none flex-col items-center justify-center p-6 text-center"
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
        className="relative flex h-full w-full select-none flex-col items-center justify-center p-6 text-center"
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
        className="relative flex h-full w-full select-none flex-col items-center justify-center p-6 text-center"
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
  const todayDaily = daily[0];
  const scene = isVisual ? deriveWeatherScene(current) : null;
  const visualLocationDetail =
    config.location.type === 'city'
      ? [
          config.location.region.trim().toLocaleLowerCase('ru-RU') ===
          config.location.name.trim().toLocaleLowerCase('ru-RU')
            ? ''
            : config.location.region,
          config.location.country,
        ]
          .filter(Boolean)
          .join(', ')
      : '';
  const updateStatus =
    error && fetchedAt ? (
      <button
        aria-label="Данные устарели. Нажмите для обновления."
        className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${isVisual ? 'border-amber-200/40 bg-slate-950/45 text-amber-100 hover:bg-slate-950/65' : 'border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'}`}
        title={`${error}. ${formatRelativeUpdate(fetchedAt)}`}
        type="button"
        onClick={retry}
      >
        <RefreshCwIcon className="size-2.5" />
        <span>Устарело</span>
      </button>
    ) : loading ? (
      <span
        className={`shrink-0 text-[10px] ${isVisual ? 'text-white/85' : 'text-theme-text-muted'}`}
        role="status"
      >
        Обновление…
      </span>
    ) : fetchedAt ? (
      <span
        className={`shrink-0 text-[10px] ${isVisual ? 'text-white/85' : 'text-theme-text-muted'}`}
      >
        {isVisual
          ? formatRelativeUpdate(fetchedAt).toLocaleLowerCase('ru-RU')
          : formatRelativeUpdate(fetchedAt)}
      </span>
    ) : null;

  return (
    <div
      ref={containerRef}
      aria-label={`Погода в ${locationTitle}: ${formatTemperature(
        current.temperature,
      )}, ${condition.label}`}
      className={`relative flex h-full w-full select-none flex-col justify-between overflow-hidden rounded-xl ${isVisual ? 'weather-visual text-white' : 'p-4 text-theme-text-primary'}`}
    >
      {scene && (
        <>
          <WeatherVisualEffects scene={scene} height={dimensions.height} />
          <div aria-hidden="true" className="weather-text-scrim" />
        </>
      )}

      <div
        className={`relative z-1 flex h-full w-full flex-col justify-between overflow-hidden ${isVisual ? '' : 'p-3'}`}
      >
        {/* Header: Location & Stale status / Update time */}
        <div
          className={`flex shrink-0 items-start justify-between gap-2 ${isVisual ? `weather-visual-header ${isCompactHeight ? 'pl-3 pr-[72px] pt-3' : 'pl-4 pr-20 pt-4'}` : ''}`}
        >
          <div className="min-w-0 flex-1">
            <h3
              className={`truncate text-base font-semibold leading-tight ${isVisual ? 'text-white' : 'text-theme-text-primary'}`}
              title={locationTitle}
            >
              {locationTitle}
            </h3>
            {isVisual ? (
              <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] leading-tight text-white/85">
                {dimensions.width >= 280 && visualLocationDetail && (
                  <span className="min-w-0 truncate">
                    {visualLocationDetail}
                  </span>
                )}
                {dimensions.width >= 280 &&
                  visualLocationDetail &&
                  updateStatus && <span aria-hidden="true">·</span>}
                {updateStatus}
              </div>
            ) : config.location.type === 'city' && config.location.country ? (
              <p className="truncate text-[11px] leading-tight text-theme-text-muted">
                {[config.location.region, config.location.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            ) : null}
          </div>
          {!isVisual && updateStatus}
        </div>

        {/* Primary weather indicator: Temperature and Condition */}
        <div
          className={`flex min-h-0 flex-1 justify-between gap-3 ${isVisual ? `weather-visual-primary items-end pb-1 ${isCompactHeight ? 'px-3' : 'px-4'}` : 'items-center py-1'}`}
        >
          <div
            className={`min-w-0 ${isVisual ? 'flex flex-col' : 'flex items-baseline gap-2'}`}
          >
            <div className="flex items-baseline gap-2">
              <span
                className={`${isVisual ? (isCompactHeight ? 'text-4xl' : 'text-5xl') : isCompactHeight ? 'text-3xl' : 'text-4xl'} font-bold tracking-tight ${isVisual ? 'text-white' : 'text-theme-text-primary'}`}
              >
                {formatTemperature(current.temperature)}
              </span>
              {current.apparentTemperature !== null &&
              !isSmall &&
              (!isVisual || dimensions.width >= 280) ? (
                <span
                  className={`text-xs ${isVisual ? 'text-white/80' : 'text-theme-text-secondary'}`}
                  title="Ощущается как"
                >
                  ощущается {formatTemperature(current.apparentTemperature)}
                </span>
              ) : null}
            </div>
            {isVisual && (
              <span
                className={`${isCompactHeight ? 'text-xs' : 'text-sm'} truncate font-medium text-white/95`}
              >
                {condition.label}
              </span>
            )}
          </div>

          {!isVisual && (
            <div className="flex shrink-0 flex-col items-end">
              <WeatherConditionIcon
                className={`${isCompactHeight ? 'size-7' : 'size-8'} text-theme-accent`}
                code={current.code}
                isDay={current.isDay}
              />
              <span className="text-right text-xs font-medium text-theme-text-secondary">
                {condition.label}
              </span>
            </div>
          )}
        </div>

        {/* Secondary Parameters (Medium / Large view) */}
        {showMetrics && (
          <div
            data-weather-metrics={isVisual ? 'inline' : 'card'}
            className={`grid shrink-0 gap-x-2 gap-y-1 ${isVisual ? `weather-visual-metrics font-semibold text-white/95 ${isCompactHeight ? `mx-3 mb-2 ${dimensions.width < 280 ? 'text-[10px]' : 'text-[11px]'}` : 'mx-4 mb-4 text-xs'}` : 'rounded-lg border border-theme-border/40 bg-theme-surface-elevated/20 px-2.5 py-1.5 text-[11px]'} ${dimensions.width >= (isVisual ? 520 : 360) ? 'grid-cols-4' : 'grid-cols-2'}`}
          >
            {/* Min / Max */}
            <div
              className={`flex min-w-0 items-center gap-1 ${isVisual ? 'text-white/95' : 'text-theme-text-secondary'}`}
            >
              <ThermometerIcon
                className={`${isVisual ? (dimensions.width < 280 ? 'size-3.5' : 'size-4') : 'size-3.5'} shrink-0 ${isVisual ? 'text-white/80' : 'text-theme-text-muted'}`}
              />
              <span className={isVisual ? 'whitespace-nowrap' : 'truncate'}>
                {formatTemperature(todayDaily?.min)} /{' '}
                {formatTemperature(todayDaily?.max)}
              </span>
            </div>

            {/* Wind */}
            <div
              className={`flex min-w-0 items-center gap-1 ${isVisual ? 'text-white/95' : 'text-theme-text-secondary'}`}
            >
              <WindIcon
                className={`${isVisual ? (dimensions.width < 280 ? 'size-3.5' : 'size-4') : 'size-3.5'} shrink-0 ${isVisual ? 'text-white/80' : 'text-theme-text-muted'}`}
              />
              <span className={isVisual ? 'whitespace-nowrap' : 'truncate'}>
                {formatWindSpeed(current.windSpeed)}{' '}
                {formatWindDirection(current.windDirection)}
              </span>
            </div>

            {/* Humidity */}
            <div
              className={`flex min-w-0 items-center gap-1 ${isVisual ? 'text-white/95' : 'text-theme-text-secondary'}`}
            >
              <DropletIcon
                className={`${isVisual ? (dimensions.width < 280 ? 'size-3.5' : 'size-4') : 'size-3.5'} shrink-0 ${isVisual ? 'text-white/80' : 'text-theme-text-muted'}`}
              />
              <span className={isVisual ? 'whitespace-nowrap' : 'truncate'}>
                {formatHumidity(current.humidity)}
              </span>
            </div>

            {/* Pressure */}
            <div
              className={`flex min-w-0 items-center gap-1 ${isVisual ? 'text-white/95' : 'text-theme-text-secondary'}`}
            >
              <GaugeIcon
                className={`${isVisual ? (dimensions.width < 280 ? 'size-3.5' : 'size-4') : 'size-3.5'} shrink-0 ${isVisual ? 'text-white/80' : 'text-theme-text-muted'}`}
              />
              <span className={isVisual ? 'whitespace-nowrap' : 'truncate'}>
                {formatPressure(current.pressure)}
              </span>
            </div>

            {/* UV Index (if space permits) */}
            {isLarge && !isVisual && (
              <>
                <div
                  className={`flex min-w-0 items-center gap-1.5 ${isVisual ? 'text-white/85' : 'text-theme-text-secondary'}`}
                >
                  <SunMediumIcon
                    className={`size-3.5 shrink-0 ${isVisual ? 'text-white/65' : 'text-theme-text-muted'}`}
                  />
                  <span className="truncate">
                    УФ {formatUvIndex(current.uv)}
                  </span>
                </div>
                <div
                  className={`flex min-w-0 items-center gap-1.5 ${isVisual ? 'text-white/85' : 'text-theme-text-secondary'}`}
                >
                  <EyeIcon
                    className={`size-3.5 shrink-0 ${isVisual ? 'text-white/65' : 'text-theme-text-muted'}`}
                  />
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
          <div
            className={
              isVisual
                ? 'mx-4 mb-2 rounded-lg border border-white/10 bg-slate-950/40 p-2 backdrop-blur-sm'
                : 'mt-2.5'
            }
          >
            <div
              className={`mb-1 text-[11px] font-medium ${isVisual ? 'text-white/75' : 'text-theme-text-muted'}`}
            >
              По часам
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {hourly.slice(0, 12).map((hour, idx) => (
                <div
                  key={idx}
                  className={`flex min-w-[44px] shrink-0 flex-col items-center rounded-md border py-1.5 text-center ${isVisual ? 'border-white/15 bg-white/10' : 'border-theme-border/30 bg-theme-surface/40'}`}
                >
                  <span
                    className={`text-[10px] ${isVisual ? 'text-white/70' : 'text-theme-text-muted'}`}
                  >
                    {formatHourSlot(hour.time, timezone)}
                  </span>
                  <WeatherConditionIcon
                    className={`my-1 size-4 ${isVisual ? 'text-white' : 'text-theme-accent'}`}
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
        {showDaily && daily.length > 0 && (
          <div
            className={
              isVisual
                ? 'mx-4 mb-3 rounded-lg border border-white/10 bg-slate-950/40 p-2 backdrop-blur-sm'
                : 'mt-2'
            }
          >
            <div
              className={`mb-1 text-[11px] font-medium ${isVisual ? 'text-white/75' : 'text-theme-text-muted'}`}
            >
              На 5 дней
            </div>
            <div className="space-y-1">
              {daily.slice(0, 5).map((day, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-md border px-2 py-1 text-xs ${isVisual ? 'border-white/10 bg-white/10' : 'border-theme-border/20 bg-theme-surface/30'}`}
                >
                  <span
                    className={`w-16 truncate font-medium ${isVisual ? 'text-white/80' : 'text-theme-text-secondary'}`}
                  >
                    {formatDaySlot(day.date, timezone, idx)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <WeatherConditionIcon
                      className={`size-3.5 ${isVisual ? 'text-white' : 'text-theme-accent'}`}
                      code={day.code}
                      isDay={true}
                    />
                    <span className="w-20 text-right text-[11px] tabular-nums">
                      <span
                        className={
                          isVisual ? 'text-white/65' : 'text-theme-text-muted'
                        }
                      >
                        {formatTemperature(day.min)}
                      </span>{' '}
                      /{' '}
                      <span
                        className={`font-medium ${isVisual ? 'text-white' : 'text-theme-text-primary'}`}
                      >
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
