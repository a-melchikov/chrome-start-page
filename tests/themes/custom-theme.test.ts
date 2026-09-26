import { describe, expect, it } from 'vitest';

import {
  calculateContrastIssues,
  createCustomThemeSnapshot,
  customThemeToTokens,
  deriveDependentColors,
  deriveSingleColor,
} from '../../themes/color-derivation';
import {
  getContrastRatio,
  getLuminance,
  hexToRgb,
  isValidHex,
  rgbToHex,
} from '../../themes/color-utils';
import { resolveTheme } from '../../themes/registry';
import type { CustomTheme } from '../../themes/types';

describe('color-utils', () => {
  it('converts hex to rgb and rgb to hex correctly', () => {
    expect(hexToRgb('#18181b')).toEqual({ r: 24, g: 24, b: 27 });
    expect(rgbToHex(24, 24, 27)).toBe('#18181b');
  });

  it('validates hex codes correctly', () => {
    expect(isValidHex('#fff')).toBe(true);
    expect(isValidHex('#18181b')).toBe(true);
    expect(isValidHex('18181b')).toBe(false);
    expect(isValidHex('#gggggg')).toBe(false);
  });

  it('calculates contrast ratio according to WCAG formula', () => {
    const blackLuminance = getLuminance('#000000');
    const whiteLuminance = getLuminance('#ffffff');
    expect(blackLuminance).toBeCloseTo(0, 4);
    expect(whiteLuminance).toBeCloseTo(1, 4);

    const contrast = getContrastRatio('#000000', '#ffffff');
    expect(contrast).toBeCloseTo(21, 0);
  });
});

describe('custom-theme color derivation and tokens', () => {
  it('creates custom theme snapshot from dark preset with all 28 colors', () => {
    const theme = createCustomThemeSnapshot(
      'dark',
      'dark',
      'Моя тёмная тема',
      '11111111-2222-3333-4444-555555555555',
    );

    expect(theme.id).toBe('11111111-2222-3333-4444-555555555555');
    expect(theme.name).toBe('Моя тёмная тема');
    expect(theme.mode).toBe('dark');
    expect(Object.keys(theme.colors)).toHaveLength(28);
    expect(theme.manualOverrides).toEqual([]);
  });

  it('derives dependent colors based on primary colors', () => {
    const theme = createCustomThemeSnapshot('dark', 'dark', 'Тест авто-цветов');
    const derived = deriveDependentColors(theme.colors, 'dark');

    expect(derived.surfaceElevated).toBeDefined();
    expect(derived.border).toBeDefined();
    expect(derived.accentHover).toBeDefined();
  });

  it('recalculates single dependent color', () => {
    const theme = createCustomThemeSnapshot('light', 'light', 'Светлый тест');
    const derivedBorder = deriveSingleColor('border', theme.colors, 'light');
    expect(isValidHex(derivedBorder)).toBe(true);
  });

  it('identifies contrast issues between text and backgrounds', () => {
    const theme = createCustomThemeSnapshot('dark', 'dark', 'Контраст тест');
    // Set text to be almost the same color as background
    theme.colors.canvasBg = '#18181b';
    theme.colors.textPrimary = '#202022';

    const issues = calculateContrastIssues(theme.colors);
    expect(issues.length).toBeGreaterThan(0);
    const canvasIssue = issues.find(
      (i) => i.pairName === 'Основной текст на фоне страницы',
    );
    expect(canvasIssue).toBeDefined();
    expect(canvasIssue?.ratio).toBeLessThan(4.5);
    expect(canvasIssue?.message).toBe(
      'Текст может сливаться с общим фоном страницы',
    );
  });

  it('transforms custom theme to full CSS ThemeTokens', () => {
    const theme = createCustomThemeSnapshot('dark', 'dark', 'Токены тест');
    theme.glow = true;
    const tokens = customThemeToTokens(theme);

    expect(tokens.canvasBg).toBe(theme.colors.canvasBg);
    expect(tokens.surfaceBg).toBe(theme.colors.surfaceBg);
    expect(tokens.glow).toContain('0 0 8px');
  });
});

describe('theme registry with custom themes', () => {
  it('resolves active custom theme when found', () => {
    const customTheme: CustomTheme = createCustomThemeSnapshot(
      'dark',
      'dark',
      'Пользовательская',
      '12345678-1234-1234-1234-123456789abc',
    );

    const resolved = resolveTheme(
      { type: 'custom', id: customTheme.id },
      true,
      [customTheme],
    );

    expect(resolved.definition.id).toBe(customTheme.id);
    expect(resolved.definition.name).toBe('Пользовательская');
    expect(resolved.isCustom).toBe(true);
  });

  it('falls back to dark/system theme if custom theme is not found', () => {
    const resolved = resolveTheme(
      { type: 'custom', id: 'non-existent-uuid' },
      true,
      [],
    );

    expect(resolved.definition.id).toBe('dark');
    expect(resolved.isCustom).toBe(false);
  });
});
