import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WeatherWidget } from '../../../widgets/weather/WeatherWidget';
import type {
  WeatherForecast,
  WeatherWidgetConfig,
} from '../../../widgets/weather/types';
import * as useWeatherModule from '../../../widgets/weather/use-weather';

const mockForecast: WeatherForecast = {
  timezone: 'Europe/Moscow',
  current: {
    time: '2026-09-25T14:00',
    temperature: 16.2,
    apparentTemperature: 15.0,
    code: 0,
    isDay: true,
    humidity: 55,
    windSpeed: 3.1,
    windDirection: 180,
    pressure: 1015,
    rain: 0,
    showers: 0,
    snowfall: 0,
    uv: 4,
    visibility: 15000,
  },
  hourly: [
    {
      time: '2026-09-25T14:00',
      temperature: 16,
      code: 0,
      precipitationProbability: 0,
    },
    {
      time: '2026-09-25T15:00',
      temperature: 17,
      code: 0,
      precipitationProbability: 0,
    },
  ],
  daily: [
    {
      date: '2026-09-25',
      min: 10,
      max: 18,
      code: 0,
      sunrise: '06:15',
      sunset: '18:45',
    },
  ],
};

const cityLocation = {
  type: 'city' as const,
  id: 524901,
  name: 'Москва',
  region: 'Москва',
  country: 'Россия',
  latitude: 55.75,
  longitude: 37.62,
  timezone: 'Europe/Moscow',
};

describe('WeatherWidget component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders unconfigured placeholder when location is unset', () => {
    const config: WeatherWidgetConfig = {
      id: 'weather-test',
      type: 'weather',
      mode: 'visual',
      location: { type: 'unset' },
      layout: { x: 0, y: 0, w: 5, h: 5 },
    };

    render(<WeatherWidget config={config} />);
    expect(screen.getByText('Погода не настроена')).toBeInTheDocument();
  });

  it('renders permission prompt when permission is required', () => {
    vi.spyOn(useWeatherModule, 'useWeather').mockReturnValue({
      forecast: null,
      fetchedAt: null,
      loading: false,
      error: 'Разрешите доступ к прогнозу погоды',
      accessRequired: true,
      retry: vi.fn(),
      grantAccess: vi.fn(),
    });

    const config: WeatherWidgetConfig = {
      id: 'weather-test',
      type: 'weather',
      mode: 'visual',
      location: cityLocation,
      layout: { x: 0, y: 0, w: 5, h: 5 },
    };

    render(<WeatherWidget config={config} />);
    expect(
      screen.getByText('Требуется доступ к сервису погоды'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Разрешить доступ' }),
    ).toBeInTheDocument();
  });

  it('renders forecast data with temperature and city name', () => {
    vi.spyOn(useWeatherModule, 'useWeather').mockReturnValue({
      forecast: mockForecast,
      fetchedAt: Date.now(),
      loading: false,
      error: null,
      accessRequired: false,
      retry: vi.fn(),
      grantAccess: vi.fn(),
    });

    const config: WeatherWidgetConfig = {
      id: 'weather-test',
      type: 'weather',
      mode: 'visual',
      location: cityLocation,
      layout: { x: 0, y: 0, w: 5, h: 5 },
    };

    render(<WeatherWidget config={config} />);
    expect(screen.getByText('Москва')).toBeInTheDocument();
    expect(screen.getByText('+16°')).toBeInTheDocument();
    expect(screen.getByText('Ясно')).toBeInTheDocument();
    expect(screen.getByText(/Обновлено в/)).toBeInTheDocument();
    expect(screen.getByText(/3\.1 м\/с/)).toBeInTheDocument();
    expect(screen.getByText(/55%/)).toBeInTheDocument();
    expect(screen.getByText(/мм рт\. ст\./)).toBeInTheDocument();
    expect(screen.getByText('+10° / +18°')).toBeInTheDocument();
  });

  it('shows stale cache warning badge when error occurs with existing forecast', () => {
    vi.spyOn(useWeatherModule, 'useWeather').mockReturnValue({
      forecast: mockForecast,
      fetchedAt: Date.now() - 3600000,
      loading: false,
      error: 'Сеть недоступна',
      accessRequired: false,
      retry: vi.fn(),
      grantAccess: vi.fn(),
    });

    const config: WeatherWidgetConfig = {
      id: 'weather-test',
      type: 'weather',
      mode: 'compact',
      location: cityLocation,
      layout: { x: 0, y: 0, w: 5, h: 5 },
    };

    render(<WeatherWidget config={config} />);
    expect(screen.getByText('Устарело')).toBeInTheDocument();
    expect(screen.getByText('+16°')).toBeInTheDocument();
  });
});
