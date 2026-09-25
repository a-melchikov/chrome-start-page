import type { ClockDateFormat, ClockTimeFormat } from './types';

const POPULAR_CITY_NAMES: Readonly<Record<string, string>> = {
  'Europe/Moscow': 'Москва',
  'Europe/Kaliningrad': 'Калининград',
  'Europe/Samara': 'Самара',
  'Asia/Yekaterinburg': 'Екатеринбург',
  'Asia/Omsk': 'Омск',
  'Asia/Novosibirsk': 'Новосибирск',
  'Asia/Krasnoyarsk': 'Красноярск',
  'Asia/Irkutsk': 'Иркутск',
  'Asia/Yakutsk': 'Якутск',
  'Asia/Vladivostok': 'Владивосток',
  'Asia/Magadan': 'Магадан',
  'Asia/Kamchatka': 'Камчатка',
  'Europe/London': 'Лондон',
  'Europe/Paris': 'Париж',
  'Europe/Berlin': 'Берлин',
  'Europe/Rome': 'Рим',
  'America/New_York': 'Нью-Йорк',
  'America/Los_Angeles': 'Лос-Анджелес',
  'America/Chicago': 'Чикаго',
  'Asia/Tokyo': 'Токио',
  'Asia/Shanghai': 'Шанхай',
  'Asia/Dubai': 'Дубай',
  'Asia/Singapore': 'Сингапур',
  'Asia/Hong_Kong': 'Гонконг',
  'Asia/Bangkok': 'Бангкок',
  'Asia/Almaty': 'Алматы',
  'Asia/Tashkent': 'Ташкент',
  'Asia/Tbilisi': 'Тбилиси',
  'Asia/Yerevan': 'Ереван',
  'Europe/Minsk': 'Минск',
  'Europe/Kyiv': 'Киев',
  'Europe/Warsaw': 'Варшава',
  'Europe/Prague': 'Прага',
  'Europe/Vienna': 'Вена',
  UTC: 'UTC',
};

export function getResolvedTimezone(timezone: string): string {
  if (timezone === 'local') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }
  return timezone;
}

export function formatTimezoneLabel(
  timezone: string,
  customTitle?: string,
): string {
  if (customTitle && customTitle.trim().length > 0) {
    return customTitle.trim();
  }

  if (timezone === 'local') {
    return 'Локальное время';
  }

  const popularCity = POPULAR_CITY_NAMES[timezone];
  if (popularCity) {
    return popularCity;
  }

  const cityName = timezone.split('/').pop()?.replace(/_/g, ' ');
  return cityName || timezone;
}

export function formatTimezoneAbbreviation(
  date: Date,
  timezone: string,
): string {
  const effectiveTz = getResolvedTimezone(timezone);
  try {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: effectiveTz,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((part) => part.type === 'timeZoneName');
    return tzPart?.value ?? '';
  } catch {
    return '';
  }
}

export function formatClockTime(
  date: Date,
  timezone: string,
  format: ClockTimeFormat,
  showSeconds: boolean,
): { timeString: string; ampm?: string } {
  const effectiveTz = getResolvedTimezone(timezone);

  if (format === '24h') {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: effectiveTz,
      hour: '2-digit',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: false,
    });
    return { timeString: formatter.format(date) };
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: effectiveTz,
    hour: 'numeric',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: true,
  });

  const parts = formatter.formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '12';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const second = parts.find((p) => p.type === 'second')?.value;
  const ampm = parts.find((p) => p.type === 'dayPeriod')?.value?.toUpperCase();

  const timeString = second
    ? `${hour}:${minute}:${second}`
    : `${hour}:${minute}`;

  return { timeString, ampm };
}

export function formatClockDate(
  date: Date,
  timezone: string,
  dateFormat: ClockDateFormat,
): string {
  const effectiveTz = getResolvedTimezone(timezone);

  if (dateFormat === 'numeric') {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: effectiveTz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return formatter.format(date);
  }

  if (dateFormat === 'full') {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: effectiveTz,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(date).replace(/\s*г\.?$/, '');
  }

  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: effectiveTz,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month =
    parts.find((p) => p.type === 'month')?.value?.replace(/\.$/, '') ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';

  if (dateFormat === 'shortWithYear') {
    return `${day} ${month} ${year}`;
  }

  // short
  return `${day} ${month}`;
}

export function formatDayOfWeek(date: Date, timezone: string): string {
  const effectiveTz = getResolvedTimezone(timezone);
  try {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: effectiveTz,
      weekday: 'long',
    });
    const weekday = formatter.format(date);
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  } catch {
    return '';
  }
}

let cachedAvailableTimezones: readonly string[] | null = null;

export function getAvailableTimezones(): readonly string[] {
  if (cachedAvailableTimezones) {
    return cachedAvailableTimezones;
  }

  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      const raw = Intl.supportedValuesOf('timeZone');
      const set = new Set(raw);
      set.add('UTC');
      cachedAvailableTimezones = Array.from(set).sort((a, b) =>
        a.localeCompare(b),
      );
      return cachedAvailableTimezones;
    } catch {
      // Fallback below
    }
  }

  cachedAvailableTimezones = [
    'UTC',
    ...Object.keys(POPULAR_CITY_NAMES).filter((tz) => tz !== 'UTC'),
  ];
  return cachedAvailableTimezones;
}
