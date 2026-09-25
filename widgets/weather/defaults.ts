import type { WeatherWidgetConfig } from './types';

export const DEFAULT_WEATHER_WIDGET_LAYOUT = {
  w: 5,
  h: 5,
  minW: 3,
  minH: 3,
} as const;

export function createDefaultWeatherWidget(
  id: string,
  index: number,
): WeatherWidgetConfig {
  return {
    id,
    type: 'weather',
    mode: 'visual',
    location: { type: 'unset' },
    layout: {
      x: 0,
      y: index * DEFAULT_WEATHER_WIDGET_LAYOUT.h,
      w: DEFAULT_WEATHER_WIDGET_LAYOUT.w,
      h: DEFAULT_WEATHER_WIDGET_LAYOUT.h,
    },
  };
}
