import { describe, expect, it } from 'vitest';
import {
  formatClockDate,
  formatClockTime,
  formatDayOfWeek,
  formatTimezoneAbbreviation,
  formatTimezoneLabel,
  getAvailableTimezones,
  getResolvedTimezone,
} from '../../../widgets/clock/time-utils';

describe('time-utils', () => {
  const fixedDate = new Date('2026-09-22T14:35:42Z');

  describe('getResolvedTimezone', () => {
    it('returns system timezone when timezone is local', () => {
      const resolved = getResolvedTimezone('local');
      expect(typeof resolved).toBe('string');
      expect(resolved.length).toBeGreaterThan(0);
    });

    it('returns the same timezone when a specific timezone is provided', () => {
      expect(getResolvedTimezone('Europe/Moscow')).toBe('Europe/Moscow');
      expect(getResolvedTimezone('UTC')).toBe('UTC');
    });
  });

  describe('formatTimezoneLabel', () => {
    it('prioritizes customTitle if provided and non-empty', () => {
      expect(formatTimezoneLabel('Europe/Moscow', 'Мой офис')).toBe('Мой офис');
    });

    it('returns "Локальное время" for local', () => {
      expect(formatTimezoneLabel('local')).toBe('Локальное время');
    });

    it('returns Russian city name for popular timezones', () => {
      expect(formatTimezoneLabel('Europe/Moscow')).toBe('Москва');
      expect(formatTimezoneLabel('America/New_York')).toBe('Нью-Йорк');
      expect(formatTimezoneLabel('Asia/Tokyo')).toBe('Токио');
      expect(formatTimezoneLabel('UTC')).toBe('UTC');
    });

    it('falls back to formatted city name for other timezones', () => {
      expect(formatTimezoneLabel('America/Port-au-Prince')).toBe(
        'Port-au-Prince',
      );
    });
  });

  describe('formatClockTime', () => {
    it('formats 24h without seconds', () => {
      const result = formatClockTime(fixedDate, 'UTC', '24h', false);
      expect(result.timeString).toBe('14:35');
      expect(result.ampm).toBeUndefined();
    });

    it('formats 24h with seconds', () => {
      const result = formatClockTime(fixedDate, 'UTC', '24h', true);
      expect(result.timeString).toBe('14:35:42');
      expect(result.ampm).toBeUndefined();
    });

    it('formats 12h without seconds', () => {
      const result = formatClockTime(fixedDate, 'UTC', '12h', false);
      expect(result.timeString).toBe('2:35');
      expect(result.ampm).toBe('PM');
    });

    it('formats 12h with seconds', () => {
      const result = formatClockTime(fixedDate, 'UTC', '12h', true);
      expect(result.timeString).toBe('2:35:42');
      expect(result.ampm).toBe('PM');
    });

    it('formats 12h morning time with AM', () => {
      const morningDate = new Date('2026-09-22T09:05:01Z');
      const result = formatClockTime(morningDate, 'UTC', '12h', false);
      expect(result.timeString).toBe('9:05');
      expect(result.ampm).toBe('AM');
    });
  });

  describe('formatClockDate', () => {
    it('formats full date without trailing "г."', () => {
      const result = formatClockDate(fixedDate, 'UTC', 'full');
      expect(result).toBe('22 сентября 2026');
    });

    it('formats numeric date', () => {
      const result = formatClockDate(fixedDate, 'UTC', 'numeric');
      expect(result).toBe('22.09.2026');
    });

    it('formats shortWithYear date', () => {
      const result = formatClockDate(fixedDate, 'UTC', 'shortWithYear');
      expect(result).toBe('22 сент 2026');
    });

    it('formats short date without year', () => {
      const result = formatClockDate(fixedDate, 'UTC', 'short');
      expect(result).toBe('22 сент');
    });
  });

  describe('formatDayOfWeek', () => {
    it('formats capitalized day of week in Russian', () => {
      const result = formatDayOfWeek(fixedDate, 'UTC');
      expect(result).toBe('Вторник');
    });
  });

  describe('formatTimezoneAbbreviation', () => {
    it('returns a non-empty abbreviation or offset for UTC and Europe/Moscow', () => {
      const utcAbbr = formatTimezoneAbbreviation(fixedDate, 'UTC');
      expect(utcAbbr.length).toBeGreaterThan(0);

      const mskAbbr = formatTimezoneAbbreviation(fixedDate, 'Europe/Moscow');
      expect(mskAbbr.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableTimezones', () => {
    it('returns a non-empty array including UTC', () => {
      const zones = getAvailableTimezones();
      expect(Array.isArray(zones)).toBe(true);
      expect(zones).toContain('UTC');
    });
  });
});
