import type {
  WeatherCoordinates,
  WeatherDay,
  WeatherForecast,
  WeatherHour,
  WeatherLocation,
} from './types';

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Погодный сервис вернул неверный ответ');
  }
  return value as Record<string, unknown>;
}

function requiredNumber(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new Error('Погодный сервис вернул неверные данные');
  }
  return value;
}

function optionalNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  return value === null || value === undefined
    ? null
    : requiredNumber(value, min, max);
}

function requiredText(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 160) {
    throw new Error('Погодный сервис вернул неверные данные');
  }
  return value;
}

function optionalText(value: unknown): string | null {
  return value === null || value === undefined ? null : requiredText(value);
}

function series(value: unknown, length: number): unknown[] {
  if (!Array.isArray(value) || value.length !== length) {
    throw new Error('Погодный сервис вернул неполный прогноз');
  }
  return value;
}

function validTimezone(value: unknown): string {
  const zone = requiredText(value);
  try {
    Intl.DateTimeFormat('ru-RU', { timeZone: zone });
  } catch {
    throw new Error('Погодный сервис вернул неверный часовой пояс');
  }
  return zone;
}

export function parseWeatherForecast(value: unknown): WeatherForecast {
  const root = record(value);
  const current = record(root.current);
  const hourly = record(root.hourly);
  const daily = record(root.daily);
  const hourlyTimes = hourly.time;
  const dailyTimes = daily.time;
  if (
    !Array.isArray(hourlyTimes) ||
    !Array.isArray(dailyTimes) ||
    dailyTimes.length < 5 ||
    hourlyTimes.length < 12
  ) {
    throw new Error('Погодный сервис вернул неполный прогноз');
  }

  const hours: WeatherHour[] = hourlyTimes.map((time, index) => ({
    time: requiredText(time),
    temperature: optionalNumber(
      series(hourly.temperature_2m, hourlyTimes.length)[index],
      -100,
      70,
    ),
    code: optionalNumber(
      series(hourly.weather_code, hourlyTimes.length)[index],
      0,
      99,
    ),
    precipitationProbability: optionalNumber(
      series(hourly.precipitation_probability, hourlyTimes.length)[index],
      0,
      100,
    ),
  }));

  const days: WeatherDay[] = dailyTimes.slice(0, 5).map((date, index) => ({
    date: requiredText(date),
    min: optionalNumber(
      series(daily.temperature_2m_min, dailyTimes.length)[index],
      -100,
      70,
    ),
    max: optionalNumber(
      series(daily.temperature_2m_max, dailyTimes.length)[index],
      -100,
      70,
    ),
    code: optionalNumber(
      series(daily.weather_code, dailyTimes.length)[index],
      0,
      99,
    ),
    sunrise: optionalText(series(daily.sunrise, dailyTimes.length)[index]),
    sunset: optionalText(series(daily.sunset, dailyTimes.length)[index]),
  }));

  const isDayRaw = current.is_day;
  const isDay =
    isDayRaw === 1 || isDayRaw === true
      ? true
      : isDayRaw === 0 || isDayRaw === false
        ? false
        : (() => {
            throw new Error('Погодный сервис вернул неверные данные');
          })();

  return {
    timezone: validTimezone(root.timezone),
    current: {
      time: requiredText(current.time),
      temperature: requiredNumber(current.temperature_2m, -100, 70),
      apparentTemperature: optionalNumber(
        current.apparent_temperature,
        -120,
        80,
      ),
      code: requiredNumber(current.weather_code, 0, 99),
      isDay,
      humidity: optionalNumber(current.relative_humidity_2m, 0, 100),
      windSpeed: optionalNumber(current.wind_speed_10m, 0, 150),
      windDirection: optionalNumber(current.wind_direction_10m, 0, 360),
      pressure: optionalNumber(current.pressure_msl, 500, 1200),
      rain: optionalNumber(current.rain, 0, 1000),
      showers: optionalNumber(current.showers, 0, 1000),
      snowfall: optionalNumber(current.snowfall, 0, 1000),
      uv: optionalNumber(current.uv_index, 0, 30),
      visibility: optionalNumber(current.visibility, 0, 100000),
    },
    hourly: hours,
    daily: days,
  };
}

export function parseCityResults(
  value: unknown,
): Extract<WeatherLocation, { type: 'city' }>[] {
  const results = record(value).results;
  if (results === undefined) return [];
  if (!Array.isArray(results)) {
    throw new Error('Поиск городов вернул неверный ответ');
  }
  return results.flatMap(
    (raw): Extract<WeatherLocation, { type: 'city' }>[] => {
      try {
        const city = record(raw);
        if (
          typeof city.feature_code !== 'string' ||
          !city.feature_code.startsWith('PPL')
        ) {
          return [];
        }
        return [
          {
            type: 'city',
            id: requiredNumber(city.id, 1, Number.MAX_SAFE_INTEGER),
            name: requiredText(city.name),
            region: typeof city.admin1 === 'string' ? city.admin1 : '',
            country: requiredText(city.country),
            latitude: requiredNumber(city.latitude, -90, 90),
            longitude: requiredNumber(city.longitude, -180, 180),
            timezone: validTimezone(city.timezone),
          },
        ];
      } catch {
        return [];
      }
    },
  );
}

async function getJson(url: URL, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) {
    throw new Error(`Погодный сервис недоступен (${response.status})`);
  }
  return response.json() as Promise<unknown>;
}

export async function searchCities(
  query: string,
  signal?: AbortSignal,
): Promise<Extract<WeatherLocation, { type: 'city' }>[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query.trim());
  url.searchParams.set('count', '6');
  url.searchParams.set('language', 'ru');
  return parseCityResults(await getJson(url, signal));
}

export async function fetchWeather(
  coordinates: WeatherCoordinates,
  timezone?: string,
  signal?: AbortSignal,
): Promise<WeatherForecast> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(coordinates.latitude));
  url.searchParams.set('longitude', String(coordinates.longitude));
  url.searchParams.set(
    'timezone',
    timezone && timezone !== 'local' ? timezone : 'auto',
  );
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'ms');
  url.searchParams.set('forecast_hours', '24');
  url.searchParams.set('forecast_days', '5');
  url.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,rain,showers,snowfall,uv_index,visibility',
  );
  url.searchParams.set(
    'hourly',
    'temperature_2m,weather_code,precipitation_probability',
  );
  url.searchParams.set(
    'daily',
    'temperature_2m_min,temperature_2m_max,weather_code,sunrise,sunset',
  );
  return parseWeatherForecast(await getJson(url, signal));
}
