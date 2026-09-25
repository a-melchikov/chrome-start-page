export type WeatherService = 'forecast' | 'geocoding';

export async function hasWeatherAccess(
  service?: WeatherService,
): Promise<boolean> {
  void service;
  return true;
}

export async function requestWeatherAccess(
  service?: WeatherService,
): Promise<boolean> {
  void service;
  return true;
}
