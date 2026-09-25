import { describe, expect, it } from 'vitest';

import { deriveWeatherScene } from '../../../widgets/weather/weather-scene';
import type { WeatherCurrent } from '../../../widgets/weather/types';

const baseCurrent: WeatherCurrent = {
  time: '2026-09-25T14:00',
  temperature: 20,
  apparentTemperature: 20,
  code: 0,
  isDay: true,
  humidity: 55,
  windSpeed: 2,
  windDirection: 180,
  pressure: 1015,
  rain: 0,
  showers: 0,
  snowfall: 0,
  uv: 3,
  visibility: 15000,
};

function sceneWith(changes: Partial<WeatherCurrent>) {
  return deriveWeatherScene({ ...baseCurrent, ...changes });
}

describe('deriveWeatherScene', () => {
  it('uses visible sun by day, stronger light in heat or high UV, and moon by night', () => {
    expect(sceneWith({}).sunLevel).toBe(1);
    expect(sceneWith({ apparentTemperature: 29 }).sunLevel).toBe(2);
    expect(sceneWith({ uv: 9 }).sunLevel).toBe(3);
    expect(sceneWith({ isDay: false }).sunLevel).toBe(0);
    expect(sceneWith({ code: 3, apparentTemperature: 38 }).sunLevel).toBe(0);
  });

  it('separates clouds, fog, snow, thunder and unknown conditions', () => {
    expect(sceneWith({ code: 2 }).cloudLevel).toBe(1);
    expect(sceneWith({ code: 3 }).cloudLevel).toBe(2);
    expect(sceneWith({ code: 45 }).category).toBe('fog');
    expect(sceneWith({ code: 75 }).snowLevel).toBe(3);
    expect(sceneWith({ code: 95 }).category).toBe('thunder');
    expect(sceneWith({ code: 12 }).category).toBe('unknown');
  });

  it('keeps code-based rain when measured amounts are zero and intensifies with showers', () => {
    expect(sceneWith({ code: 51 }).rainLevel).toBe(1);
    expect(sceneWith({ code: 51 }).isDrizzle).toBe(true);
    expect(sceneWith({ code: 63 }).rainLevel).toBe(2);
    expect(sceneWith({ code: 65 }).rainLevel).toBe(3);
    expect(sceneWith({ code: 61, showers: 5.2 }).rainLevel).toBe(3);
    expect(sceneWith({ code: 0, rain: 10 }).rainLevel).toBe(0);
  });

  it('tilts precipitation downwind and caps the angle', () => {
    expect(
      sceneWith({ code: 61, windSpeed: 12, windDirection: 90 }).windTiltDeg,
    ).toBe(-24);
    expect(
      sceneWith({ code: 61, windSpeed: 12, windDirection: 270 }).windTiltDeg,
    ).toBe(24);
    expect(sceneWith({ code: 61, windDirection: null }).windTiltDeg).toBe(0);
    expect(sceneWith({ code: 61, windSpeed: 0 }).windTiltDeg).toBe(0);
  });
});
