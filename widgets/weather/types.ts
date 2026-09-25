import type { BaseWidgetConfig } from '../types';

export type WeatherLocation =
  | { type: 'unset' }
  | {
      type: 'city';
      id: number;
      name: string;
      region: string;
      country: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };

export interface WeatherCoordinates {
  latitude: number;
  longitude: number;
}

export interface WeatherWidgetConfig extends BaseWidgetConfig<'weather'> {
  mode: 'visual' | 'compact';
  location: WeatherLocation;
}

export interface WeatherCurrent {
  time: string;
  temperature: number;
  apparentTemperature: number | null;
  code: number;
  isDay: boolean;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
  rain: number | null;
  showers: number | null;
  snowfall: number | null;
  uv: number | null;
  visibility: number | null;
}

export interface WeatherHour {
  time: string;
  temperature: number | null;
  code: number | null;
  precipitationProbability: number | null;
}

export interface WeatherDay {
  date: string;
  min: number | null;
  max: number | null;
  code: number | null;
  sunrise: string | null;
  sunset: string | null;
}

export interface WeatherForecast {
  timezone: string;
  current: WeatherCurrent;
  hourly: WeatherHour[];
  daily: WeatherDay[];
}
