import { describe, expect, it } from 'vitest';

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
} from '../../../widgets/weather/weather-utils';

describe('weather-utils', () => {
  it('maps WMO codes to Russian labels and categories', () => {
    expect(getWeatherConditionInfo(0)).toEqual({
      label: 'Ясно',
      category: 'clear',
    });
    expect(getWeatherConditionInfo(3)).toEqual({
      label: 'Пасмурно',
      category: 'cloudy',
    });
    expect(getWeatherConditionInfo(63)).toEqual({
      label: 'Умеренный дождь',
      category: 'rain',
    });
    expect(getWeatherConditionInfo(73)).toEqual({
      label: 'Снегопад',
      category: 'snow',
    });
    expect(getWeatherConditionInfo(95)).toEqual({
      label: 'Гроза',
      category: 'thunder',
    });
    expect(getWeatherConditionInfo(45)).toEqual({
      label: 'Туман',
      category: 'fog',
    });
    expect(getWeatherConditionInfo(null)).toEqual({
      label: 'Нет данных',
      category: 'cloudy',
    });
  });

  it('formats temperature with sign and degree', () => {
    expect(formatTemperature(15.4)).toBe('+15°');
    expect(formatTemperature(-3.2)).toBe('-3°');
    expect(formatTemperature(0)).toBe('0°');
    expect(formatTemperature(null)).toBe('Нет данных');
    expect(formatTemperature(undefined)).toBe('Нет данных');
  });

  it('converts pressure from hPa to mm Hg accurately', () => {
    // 1013.25 hPa * 0.750061683 = 760.0 mm Hg
    expect(formatPressure(1013.25)).toBe('760 мм рт. ст.');
    expect(formatPressure(1000)).toBe('750 мм рт. ст.');
    expect(formatPressure(null)).toBe('Нет данных');
  });

  it('formats wind speed and compass directions', () => {
    expect(formatWindSpeed(4.56)).toBe('4.6 м/с');
    expect(formatWindSpeed(null)).toBe('Нет данных');

    expect(formatWindDirection(0)).toBe('С');
    expect(formatWindDirection(45)).toBe('СВ');
    expect(formatWindDirection(90)).toBe('В');
    expect(formatWindDirection(135)).toBe('ЮВ');
    expect(formatWindDirection(180)).toBe('Ю');
    expect(formatWindDirection(225)).toBe('ЮЗ');
    expect(formatWindDirection(270)).toBe('З');
    expect(formatWindDirection(315)).toBe('СЗ');
    expect(formatWindDirection(360)).toBe('С');
    expect(formatWindDirection(null)).toBe('');
  });

  it('formats humidity, uv, and visibility', () => {
    expect(formatHumidity(82)).toBe('82%');
    expect(formatHumidity(null)).toBe('Нет данных');

    expect(formatUvIndex(3.4)).toBe('3.4');
    expect(formatUvIndex(null)).toBe('Нет данных');

    expect(formatVisibility(10000)).toBe('10 км');
    expect(formatVisibility(2500)).toBe('2.5 км');
    expect(formatVisibility(800)).toBe('800 м');
    expect(formatVisibility(null)).toBe('Нет данных');
  });

  it('formats hour slots and day slots in timezone', () => {
    expect(formatHourSlot('2026-09-25T14:00', 'Europe/Moscow')).toBe('14:00');
    expect(formatDaySlot('2026-09-25', 'Europe/Moscow', 0)).toBe('Сегодня');
    expect(formatDaySlot('2026-09-26', 'Europe/Moscow', 1)).toBe('Завтра');
  });

  it('formats relative update time', () => {
    const timestamp = new Date('2026-09-25T12:30:00Z').getTime();
    expect(formatRelativeUpdate(timestamp)).toMatch(
      /Обновлено в \d{1,2}:\d{2}/,
    );
  });
});
