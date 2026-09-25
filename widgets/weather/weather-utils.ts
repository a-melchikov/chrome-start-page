export interface WeatherConditionInfo {
  label: string;
  category: 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'thunder';
}

export function getWeatherConditionInfo(
  code: number | null | undefined,
): WeatherConditionInfo {
  if (code === null || code === undefined) {
    return { label: 'Нет данных', category: 'cloudy' };
  }
  switch (code) {
    case 0:
      return { label: 'Ясно', category: 'clear' };
    case 1:
      return { label: 'В основном ясно', category: 'clear' };
    case 2:
      return { label: 'Переменная облачность', category: 'cloudy' };
    case 3:
      return { label: 'Пасмурно', category: 'cloudy' };
    case 45:
      return { label: 'Туман', category: 'fog' };
    case 48:
      return { label: 'Изморозь', category: 'fog' };
    case 51:
      return { label: 'Лёгкая морось', category: 'rain' };
    case 53:
      return { label: 'Умеренная морось', category: 'rain' };
    case 55:
      return { label: 'Плотная морось', category: 'rain' };
    case 56:
      return { label: 'Лёгкая ледяная морось', category: 'rain' };
    case 57:
      return { label: 'Плотная ледяная морось', category: 'rain' };
    case 61:
      return { label: 'Небольшой дождь', category: 'rain' };
    case 63:
      return { label: 'Умеренный дождь', category: 'rain' };
    case 65:
      return { label: 'Сильный дождь', category: 'rain' };
    case 66:
      return { label: 'Ледяной дождь', category: 'rain' };
    case 67:
      return { label: 'Сильный ледяной дождь', category: 'rain' };
    case 71:
      return { label: 'Небольшой снег', category: 'snow' };
    case 73:
      return { label: 'Снегопад', category: 'snow' };
    case 75:
      return { label: 'Сильный снегопад', category: 'snow' };
    case 77:
      return { label: 'Снежные зёрна', category: 'snow' };
    case 80:
      return { label: 'Слабый ливень', category: 'rain' };
    case 81:
      return { label: 'Умеренный ливень', category: 'rain' };
    case 82:
      return { label: 'Сильный ливень', category: 'rain' };
    case 85:
      return { label: 'Небольшой снегопад', category: 'snow' };
    case 86:
      return { label: 'Сильный снегопад', category: 'snow' };
    case 95:
      return { label: 'Гроза', category: 'thunder' };
    case 96:
      return { label: 'Гроза с градом', category: 'thunder' };
    case 99:
      return { label: 'Сильная гроза с градом', category: 'thunder' };
    default:
      return { label: 'Неизвестно', category: 'cloudy' };
  }
}

export function formatTemperature(temp: number | null | undefined): string {
  if (temp === null || temp === undefined || !Number.isFinite(temp)) {
    return 'Нет данных';
  }
  const rounded = Math.round(temp);
  if (rounded > 0) return `+${rounded}°`;
  return `${rounded}°`;
}

export function formatPressure(hPa: number | null | undefined): string {
  if (hPa === null || hPa === undefined || !Number.isFinite(hPa)) {
    return 'Нет данных';
  }
  const mm = Math.round(hPa * 0.750061683);
  return `${mm} мм рт. ст.`;
}

export function formatWindSpeed(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || !Number.isFinite(speed)) {
    return 'Нет данных';
  }
  return `${Math.round(speed * 10) / 10} м/с`;
}

export function formatWindDirection(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || !Number.isFinite(deg)) {
    return '';
  }
  const normalized = ((deg % 360) + 360) % 360;
  const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index] ?? '';
}

export function formatHumidity(humidity: number | null | undefined): string {
  if (
    humidity === null ||
    humidity === undefined ||
    !Number.isFinite(humidity)
  ) {
    return 'Нет данных';
  }
  return `${Math.round(humidity)}%`;
}

export function formatUvIndex(uv: number | null | undefined): string {
  if (uv === null || uv === undefined || !Number.isFinite(uv)) {
    return 'Нет данных';
  }
  return `${Math.round(uv * 10) / 10}`;
}

export function formatVisibility(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return 'Нет данных';
  }
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km.toFixed(km % 1 === 0 ? 0 : 1)} км`;
  }
  return `${Math.round(meters)} м`;
}

export function formatHourSlot(timeIso: string, timezone: string): string {
  try {
    const date = new Date(timeIso);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return timeIso.slice(11, 16) || timeIso;
  }
}

export function formatDaySlot(
  dateStr: string,
  timezone: string,
  index: number,
): string {
  if (index === 0) return 'Сегодня';
  if (index === 1) return 'Завтра';
  try {
    const date = new Date(`${dateStr}T12:00:00Z`);
    const formatted = new Intl.DateTimeFormat('ru-RU', {
      timeZone: timezone,
      weekday: 'short',
    }).format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return dateStr;
  }
}

export function formatRelativeUpdate(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Обновлено в ${timeStr}`;
  } catch {
    return 'Обновлено недавно';
  }
}
