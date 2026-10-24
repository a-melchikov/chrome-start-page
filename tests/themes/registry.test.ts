import { describe, expect, it } from 'vitest';
import {
  getThemeDefinition,
  resolveTheme,
  THEMES,
} from '../../themes/registry';
import type { ThemeId } from '../../themes/types';

function luminance(color: string): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return (
    linear(parseInt(color.slice(1, 3), 16)) * 0.2126 +
    linear(parseInt(color.slice(3, 5), 16)) * 0.7152 +
    linear(parseInt(color.slice(5, 7), 16)) * 0.0722
  );
}

function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme registry', () => {
  it('keeps meaningful small text readable on every built-in opaque surface', () => {
    for (const theme of THEMES) {
      for (const text of [
        theme.tokens.textPrimary,
        theme.tokens.textSecondary,
      ]) {
        for (const surface of [
          theme.tokens.canvasBg,
          theme.tokens.surfaceBg,
          theme.tokens.surfaceElevated,
          theme.tokens.surfaceMuted,
        ]) {
          expect(
            contrastRatio(text, surface),
            `${theme.id}: ${text} on ${surface}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('registers all 14 themes with complete tokens', () => {
    expect(THEMES.length).toBe(14);

    for (const theme of THEMES) {
      expect(theme.id).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.description).toBeDefined();
      expect(theme.defaultBackgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(theme.previewColors.bg).toBeDefined();
      expect(theme.previewColors.surface).toBeDefined();
      expect(theme.previewColors.accent).toBeDefined();

      const { tokens } = theme;
      expect(tokens.canvasBg).toBeDefined();
      expect(tokens.surfaceBg).toBeDefined();
      expect(tokens.surfaceElevated).toBeDefined();
      expect(tokens.surfaceMuted).toBeDefined();
      expect(tokens.border).toBeDefined();
      expect(tokens.borderSubtle).toBeDefined();
      expect(tokens.textPrimary).toBeDefined();
      expect(tokens.textSecondary).toBeDefined();
      expect(tokens.textMuted).toBeDefined();
      expect(tokens.accent).toBeDefined();
      expect(tokens.accentHover).toBeDefined();
      expect(tokens.accentText).toBeDefined();
      expect(tokens.ring).toBeDefined();
      expect(tokens.danger).toBeDefined();
      expect(tokens.codeBg).toBeDefined();
      expect(tokens.codeBorder).toBeDefined();
      expect(tokens.quoteBorder).toBeDefined();
      expect(tokens.link).toBeDefined();
      expect(tokens.linkHover).toBeDefined();
      expect(tokens.pomodoroTrack).toBeDefined();
      expect(tokens.pomodoroProgress).toBeDefined();
      expect(tokens.glassTintLight).toBeDefined();
      expect(tokens.glassTintDark).toBeDefined();
      expect(tokens.glassBorder).toBeDefined();
      expect(tokens.glassShadowColor).toBeDefined();
    }
  });

  it('resolves system theme based on system dark mode', () => {
    const darkResolved = resolveTheme('system', true);
    expect(darkResolved.mode).toBe('dark');
    expect(darkResolved.definition.id).toBe('dark');

    const lightResolved = resolveTheme('system', false);
    expect(lightResolved.mode).toBe('light');
    expect(lightResolved.definition.id).toBe('light');
  });

  it('resolves explicit dark and light themes independently of systemDarkMode', () => {
    const tokyoResolved = resolveTheme('tokyo-night', false);
    expect(tokyoResolved.mode).toBe('dark');
    expect(tokyoResolved.definition.id).toBe('tokyo-night');

    const latteResolved = resolveTheme('catppuccin-latte', true);
    expect(latteResolved.mode).toBe('light');
    expect(latteResolved.definition.id).toBe('catppuccin-latte');
  });

  it('defines graphite-mint with the reference colors in either system mode', () => {
    const theme = getThemeDefinition('graphite-mint');
    expect(theme.name).toBe('Графит и мята');
    expect(theme.defaultBackgroundColor).toBe('#151d1f');
    expect(theme.previewColors).toEqual({
      bg: '#151d1f',
      surface: '#242b2d',
      accent: '#42c7b4',
    });
    expect(theme.tokens.canvasBg).toBe('#151d1f');
    expect(theme.tokens.surfaceBg).toBe('#242b2d');
    expect(theme.tokens.textPrimary).toBe('#e1eae8');
    expect(theme.tokens.accent).toBe('#42c7b4');
    for (const systemDarkMode of [true, false]) {
      const resolved = resolveTheme(
        { type: 'builtin', id: 'graphite-mint' },
        systemDarkMode,
      );
      expect(resolved.definition.id).toBe('graphite-mint');
      expect(resolved.mode).toBe('dark');
      expect(resolved.isCustom).toBe(false);
    }
  });

  it.each([
    ['paper-sage', '#f6f3eb', '#fffefa', '#276354'],
    ['apricot-noon', '#fff3e8', '#fffcf8', '#b34f36'],
  ] as const)(
    'defines %s as a light preset with its intended palette',
    (id, background, surface, accent) => {
      const theme = getThemeDefinition(id);
      expect(theme.mode).toBe('light');
      expect(theme.defaultBackgroundColor).toBe(background);
      expect(theme.previewColors).toEqual({ bg: background, surface, accent });
      expect(theme.tokens.canvasBg).toBe(background);
      expect(theme.tokens.surfaceBg).toBe(surface);
      expect(theme.tokens.accent).toBe(accent);
      expect(resolveTheme(id, true).mode).toBe('light');
    },
  );

  it.each(['paper-sage', 'apricot-noon', 'graphite-mint'] as const)(
    'keeps text and controls readable in %s',
    (id) => {
      const tokens = getThemeDefinition(id).tokens;
      for (const surface of [
        tokens.canvasBg,
        tokens.surfaceBg,
        tokens.surfaceElevated,
        tokens.surfaceMuted,
      ]) {
        for (const foreground of [
          tokens.textPrimary,
          tokens.textSecondary,
          tokens.textMuted,
          tokens.accent,
          tokens.link,
        ]) {
          expect(contrastRatio(foreground, surface)).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      }
      expect(
        contrastRatio(tokens.accentText, tokens.accent),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(tokens.dangerText, tokens.dangerBg),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('falls back to default theme for unknown id', () => {
    const fallback = getThemeDefinition('unknown' as ThemeId);
    expect(fallback.id).toBe('system');
  });
});
