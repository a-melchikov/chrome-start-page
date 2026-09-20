import { describe, expect, it } from 'vitest';
import {
  getThemeDefinition,
  resolveTheme,
  THEMES,
} from '../../themes/registry';
import type { ThemeId } from '../../themes/types';

describe('theme registry', () => {
  it('registers all 11 themes with complete tokens', () => {
    expect(THEMES.length).toBe(11);

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

  it('falls back to default theme for unknown id', () => {
    const fallback = getThemeDefinition('unknown' as ThemeId);
    expect(fallback.id).toBe('system');
  });
});
