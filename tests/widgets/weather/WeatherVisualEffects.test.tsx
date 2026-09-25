import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WeatherVisualEffects } from '../../../widgets/weather/WeatherVisualEffects';
import { deriveWeatherScene } from '../../../widgets/weather/weather-scene';
import type { WeatherCurrent } from '../../../widgets/weather/types';

const current: WeatherCurrent = {
  time: '2026-09-25T14:00',
  temperature: 15,
  apparentTemperature: 14,
  code: 61,
  isDay: true,
  humidity: 80,
  windSpeed: 1,
  windDirection: 90,
  pressure: 1010,
  rain: 0,
  showers: 0,
  snowfall: 0,
  uv: 1,
  visibility: 8000,
};

describe('WeatherVisualEffects', () => {
  it('shows sparse rain and denser wind-driven rain in the same scene', () => {
    const { container, rerender } = render(
      <WeatherVisualEffects scene={deriveWeatherScene(current)} height={272} />,
    );
    expect(container.querySelectorAll('.weather-rain span')).toHaveLength(9);

    rerender(
      <WeatherVisualEffects
        scene={deriveWeatherScene({
          ...current,
          code: 65,
          windSpeed: 12,
        })}
        height={272}
      />,
    );
    expect(container.querySelectorAll('.weather-rain span')).toHaveLength(30);
    expect(container.querySelector('.weather-scene')).toHaveStyle({
      '--weather-tilt': '-24deg',
    });
  });
});
