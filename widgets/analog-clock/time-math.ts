import {
  formatClockDate,
  formatClockTime,
  formatTimezoneAbbreviation,
  formatTimezoneLabel,
  getResolvedTimezone,
} from '../clock/time-utils';

export interface HandAngles {
  hourAngle: number;
  minuteAngle: number;
  secondAngle: number;
}

export function getHandAngles(date: Date, timezone: string): HandAngles {
  const effectiveTz = getResolvedTimezone(timezone);

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: effectiveTz,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    let hour = 0;
    let minute = 0;
    let second = 0;

    for (const part of parts) {
      if (part.type === 'hour') {
        const val = Number.parseInt(part.value, 10);
        hour = Number.isNaN(val) ? 0 : val % 24;
      } else if (part.type === 'minute') {
        const val = Number.parseInt(part.value, 10);
        minute = Number.isNaN(val) ? 0 : val % 60;
      } else if (part.type === 'second') {
        const val = Number.parseInt(part.value, 10);
        second = Number.isNaN(val) ? 0 : val % 60;
      }
    }

    const secondAngle = second * 6;
    const minuteAngle = (minute + second / 60) * 6;
    const hourAngle = ((hour % 12) + minute / 60 + second / 3600) * 30;

    return {
      hourAngle: Math.round(hourAngle * 100) / 100,
      minuteAngle: Math.round(minuteAngle * 100) / 100,
      secondAngle: Math.round(secondAngle * 100) / 100,
    };
  } catch {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();

    return {
      hourAngle: ((hour % 12) + minute / 60 + second / 3600) * 30,
      minuteAngle: (minute + second / 60) * 6,
      secondAngle: second * 6,
    };
  }
}

export function getDateWindowText(date: Date, timezone: string): string {
  const effectiveTz = getResolvedTimezone(timezone);
  try {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: effectiveTz,
      day: '2-digit',
      month: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    let day = '';
    let month = '';
    for (const part of parts) {
      if (part.type === 'day') day = part.value;
      if (part.type === 'month') month = part.value;
    }
    if (day && month) {
      return `${day}.${month}`;
    }
    return formatter.format(date);
  } catch {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  }
}

export function getAnalogTimezoneText(date: Date, timezone: string): string {
  if (timezone === 'local') {
    return '';
  }
  const abbr = formatTimezoneAbbreviation(date, timezone);
  if (abbr && abbr.length <= 6) {
    return abbr;
  }
  return formatTimezoneLabel(timezone);
}

export function getAnalogClockAccessibleLabel(
  date: Date,
  timezone: string,
  showSeconds: boolean,
  showDate: boolean,
  showTimezone: boolean,
): string {
  const { timeString } = formatClockTime(date, timezone, '24h', showSeconds);

  const parts = [`Аналоговые часы: ${timeString}`];

  if (showDate) {
    const dateFormatted = formatClockDate(date, timezone, 'full');
    parts.push(dateFormatted);
  }

  if (showTimezone) {
    const tzLabel = formatTimezoneLabel(timezone);
    parts.push(tzLabel);
  }

  return parts.join(', ');
}
