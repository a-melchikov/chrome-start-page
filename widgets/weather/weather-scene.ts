import type { WeatherCurrent } from './types';
import { getWeatherConditionInfo } from './weather-utils';

export interface WeatherScene {
  category: ReturnType<typeof getWeatherConditionInfo>['category'] | 'unknown';
  cloudLevel: 0 | 1 | 2;
  rainLevel: 0 | 1 | 2 | 3;
  snowLevel: 0 | 1 | 2 | 3;
  sunLevel: 0 | 1 | 2 | 3;
  windTiltDeg: number;
  cloudDurationSec: number;
  isDay: boolean;
  isDrizzle: boolean;
}

function rainLevelFromCode(code: number): 0 | 1 | 2 | 3 {
  if ([55, 57, 65, 67, 82, 96, 99].includes(code)) return 3;
  if ([53, 63, 81, 95].includes(code)) return 2;
  if ([51, 56, 61, 66, 80].includes(code)) return 1;
  return 0;
}

function snowLevelFromCode(code: number): 0 | 1 | 2 | 3 {
  if ([75, 86].includes(code)) return 3;
  if (code === 73) return 2;
  if ([71, 77, 85].includes(code)) return 1;
  return 0;
}

function measuredRainLevel(rain: number, showers: number): 0 | 1 | 2 | 3 {
  const amount = rain + showers;
  if (amount >= 5) return 3;
  if (amount >= 1.5) return 2;
  if (amount > 0) return 1;
  return 0;
}

export function deriveWeatherScene(
  current: Pick<
    WeatherCurrent,
    | 'code'
    | 'isDay'
    | 'apparentTemperature'
    | 'uv'
    | 'rain'
    | 'showers'
    | 'snowfall'
    | 'windSpeed'
    | 'windDirection'
  >,
): WeatherScene {
  const info = getWeatherConditionInfo(current.code);
  const category =
    info.label === 'Неизвестно' || info.label === 'Нет данных'
      ? 'unknown'
      : info.category;
  const code = current.code;
  const windSpeed = Math.max(0, current.windSpeed ?? 0);
  // Meteorological direction names the source of wind, so the scene drifts away.
  const windRadians = ((current.windDirection ?? 0) * Math.PI) / 180;
  const windTiltDeg =
    current.windDirection === null
      ? 0
      : Math.round(-Math.sin(windRadians) * Math.min(windSpeed * 2.2, 24)) || 0;
  const cloudDurationSec = Math.max(11, Math.round(38 - windSpeed * 1.5));

  const measuredRain = measuredRainLevel(
    current.rain ?? 0,
    current.showers ?? 0,
  );
  const rainLevel =
    category === 'rain' || category === 'thunder'
      ? (Math.max(rainLevelFromCode(code), measuredRain) as 1 | 2 | 3)
      : 0;
  const measuredSnow = current.snowfall ?? 0;
  const snowLevel =
    category === 'snow'
      ? (Math.max(
          snowLevelFromCode(code),
          measuredSnow >= 3 ? 3 : measuredSnow >= 1 ? 2 : 1,
        ) as 1 | 2 | 3)
      : 0;

  const apparent = current.apparentTemperature ?? -Infinity;
  const uv = current.uv ?? 0;
  const sunLevel =
    current.isDay && (category === 'clear' || code === 2)
      ? apparent >= 34 || uv >= 9
        ? 3
        : apparent >= 28 || uv >= 6
          ? 2
          : 1
      : 0;

  return {
    category,
    cloudLevel: code === 2 || code === 1 ? 1 : category === 'clear' ? 0 : 2,
    rainLevel,
    snowLevel,
    sunLevel,
    windTiltDeg,
    cloudDurationSec,
    isDay: current.isDay,
    isDrizzle: [51, 53, 55, 56, 57].includes(code),
  };
}
