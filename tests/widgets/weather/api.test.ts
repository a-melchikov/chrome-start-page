import { describe, expect, it } from 'vitest';

import {
  parseCityResults,
  parseWeatherForecast,
} from '../../../widgets/weather/api';

describe('weather API parser', () => {
  const validForecastPayload = {
    timezone: 'Europe/Moscow',
    current: {
      time: '2026-09-25T14:00',
      temperature_2m: 14.5,
      apparent_temperature: 13.2,
      weather_code: 3,
      is_day: 1,
      relative_humidity_2m: 75,
      wind_speed_10m: 4.2,
      wind_direction_10m: 210,
      pressure_msl: 1018.4,
      rain: 0,
      showers: 0,
      snowfall: 0,
      uv_index: 2.5,
      visibility: 25000,
    },
    hourly: {
      time: Array.from(
        { length: 24 },
        (_, i) => `2026-09-25T${String(i).padStart(2, '0')}:00`,
      ),
      temperature_2m: Array.from({ length: 24 }, () => 14),
      weather_code: Array.from({ length: 24 }, () => 3),
      precipitation_probability: Array.from({ length: 24 }, () => 15),
    },
    daily: {
      time: [
        '2026-09-25',
        '2026-09-26',
        '2026-09-27',
        '2026-09-28',
        '2026-09-29',
      ],
      temperature_2m_min: [8, 9, 7, 6, 8],
      temperature_2m_max: [16, 17, 15, 14, 15],
      weather_code: [3, 2, 61, 3, 1],
      sunrise: ['06:15', '06:17', '06:19', '06:21', '06:23'],
      sunset: ['18:45', '18:42', '18:40', '18:37', '18:35'],
    },
  };

  it('parses valid weather forecast response', () => {
    const forecast = parseWeatherForecast(validForecastPayload);
    expect(forecast.timezone).toBe('Europe/Moscow');
    expect(forecast.current.temperature).toBe(14.5);
    expect(forecast.current.apparentTemperature).toBe(13.2);
    expect(forecast.current.isDay).toBe(true);
    expect(forecast.current.code).toBe(3);
    expect(forecast.current.humidity).toBe(75);
    expect(forecast.current.pressure).toBe(1018.4);
    expect(forecast.hourly).toHaveLength(24);
    expect(forecast.daily).toHaveLength(5);
    expect(forecast.daily[0]?.min).toBe(8);
    expect(forecast.daily[0]?.max).toBe(16);
  });

  it('handles boolean is_day values correctly', () => {
    const payloadDay = {
      ...validForecastPayload,
      current: { ...validForecastPayload.current, is_day: true },
    };
    expect(parseWeatherForecast(payloadDay).current.isDay).toBe(true);

    const payloadNight = {
      ...validForecastPayload,
      current: { ...validForecastPayload.current, is_day: 0 },
    };
    expect(parseWeatherForecast(payloadNight).current.isDay).toBe(false);
  });

  it('rejects malformed payload, incomplete series or missing timezone', () => {
    expect(() => parseWeatherForecast(null)).toThrow();
    expect(() => parseWeatherForecast({})).toThrow();
    expect(() =>
      parseWeatherForecast({
        ...validForecastPayload,
        timezone: 'Invalid/Zone/12345',
      }),
    ).toThrow();
    expect(() =>
      parseWeatherForecast({
        ...validForecastPayload,
        daily: { ...validForecastPayload.daily, time: ['2026-09-25'] },
      }),
    ).toThrow();
  });

  it('parses geocoding search results and filters non-PPL feature codes', () => {
    const geocodingPayload = {
      results: [
        {
          id: 524901,
          name: 'Москва',
          latitude: 55.75222,
          longitude: 37.61556,
          feature_code: 'PPLC',
          country: 'Россия',
          admin1: 'Москва',
          timezone: 'Europe/Moscow',
        },
        {
          id: 999999,
          name: 'Река Москва',
          latitude: 55.5,
          longitude: 37.5,
          feature_code: 'STM', // River, should be filtered out
          country: 'Россия',
          admin1: 'Московская область',
          timezone: 'Europe/Moscow',
        },
      ],
    };

    const cities = parseCityResults(geocodingPayload);
    expect(cities).toHaveLength(1);
    expect(cities[0]).toEqual({
      type: 'city',
      id: 524901,
      name: 'Москва',
      region: 'Москва',
      country: 'Россия',
      latitude: 55.75222,
      longitude: 37.61556,
      timezone: 'Europe/Moscow',
    });
  });

  it('returns empty array when search returns no results or undefined', () => {
    expect(parseCityResults({})).toEqual([]);
    expect(parseCityResults({ results: [] })).toEqual([]);
  });
});
