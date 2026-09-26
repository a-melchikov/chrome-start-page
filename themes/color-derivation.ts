import {
  darken,
  extractHexFromColorString,
  getContrastRatio,
  hexToRgba,
  lighten,
  mixHex,
  normalizeHex,
} from './color-utils';
import { THEMES } from './registry';
import {
  ALL_CUSTOM_THEME_COLOR_KEYS,
  DERIVED_COLOR_KEYS,
  PRIMARY_COLOR_KEYS,
  type BuiltinThemeId,
  type ContrastIssue,
  type CustomTheme,
  type CustomThemeColorKey,
  type CustomThemeColors,
  type DerivedColorKey,
  type PrimaryColorKey,
  type ThemeMode,
  type ThemeTokens,
} from './types';

export function deriveDependentColors(
  primary: Record<PrimaryColorKey, string>,
  mode: ThemeMode,
): Record<DerivedColorKey, string> {
  const normPrimary: Record<PrimaryColorKey, string> = {
    canvasBg: normalizeHex(primary.canvasBg),
    surfaceBg: normalizeHex(primary.surfaceBg),
    textPrimary: normalizeHex(primary.textPrimary),
    textSecondary: normalizeHex(primary.textSecondary),
    accent: normalizeHex(primary.accent),
    accentText: normalizeHex(primary.accentText),
  };

  if (mode === 'light') {
    const surfaceElevated = mixHex(
      normPrimary.surfaceBg,
      normPrimary.canvasBg,
      0.4,
    );
    const surfaceMuted = mixHex(
      normPrimary.surfaceBg,
      normPrimary.canvasBg,
      0.6,
    );
    const border = mixHex(
      normPrimary.surfaceBg,
      normPrimary.textSecondary,
      0.22,
    );
    const borderSubtle = mixHex(
      normPrimary.surfaceBg,
      normPrimary.textSecondary,
      0.12,
    );
    const textMuted = mixHex(
      normPrimary.textSecondary,
      normPrimary.surfaceBg,
      0.35,
    );
    const accentHover = darken(normPrimary.accent, 0.1);
    const ring = normPrimary.accent;
    const danger = '#dc2626';
    const dangerBg = mixHex(normPrimary.surfaceBg, '#dc2626', 0.08);
    const dangerHoverBg = mixHex(normPrimary.surfaceBg, '#dc2626', 0.15);
    const dangerBorder = mixHex(normPrimary.surfaceBg, '#dc2626', 0.25);
    const dangerText = '#b91c1c';
    const codeBg = mixHex(normPrimary.surfaceBg, normPrimary.canvasBg, 0.5);
    const codeBorder = mixHex(
      normPrimary.surfaceBg,
      normPrimary.textSecondary,
      0.18,
    );
    const quoteBorder = normPrimary.accent;
    const link = mixHex(normPrimary.accent, '#1d4ed8', 0.5);
    const linkHover = darken(link, 0.12);
    const pomodoroTrack = mixHex(
      normPrimary.surfaceBg,
      normPrimary.textSecondary,
      0.2,
    );
    const pomodoroProgress = normPrimary.accent;
    const glassBorder = mixHex(normPrimary.surfaceBg, normPrimary.accent, 0.2);
    const glassRim = '#ffffff';
    const glassShadowColor = '#18181b';

    return {
      surfaceElevated,
      surfaceMuted,
      border,
      borderSubtle,
      textMuted,
      accentHover,
      ring,
      danger,
      dangerBg,
      dangerHoverBg,
      dangerBorder,
      dangerText,
      codeBg,
      codeBorder,
      quoteBorder,
      link,
      linkHover,
      pomodoroTrack,
      pomodoroProgress,
      glassBorder,
      glassRim,
      glassShadowColor,
    };
  }

  // Dark mode
  const surfaceElevated = lighten(normPrimary.surfaceBg, 0.08);
  const surfaceMuted = darken(normPrimary.surfaceBg, 0.1);
  const border = mixHex(normPrimary.surfaceBg, normPrimary.textSecondary, 0.3);
  const borderSubtle = mixHex(
    normPrimary.surfaceBg,
    normPrimary.textSecondary,
    0.18,
  );
  const textMuted = mixHex(
    normPrimary.textSecondary,
    normPrimary.surfaceBg,
    0.4,
  );
  const accentHover = lighten(normPrimary.accent, 0.12);
  const ring = normPrimary.accent;
  const danger = '#ef4444';
  const dangerBg = mixHex(normPrimary.surfaceBg, '#ef4444', 0.15);
  const dangerHoverBg = mixHex(normPrimary.surfaceBg, '#ef4444', 0.25);
  const dangerBorder = mixHex(normPrimary.surfaceBg, '#ef4444', 0.35);
  const dangerText = '#fca5a5';
  const codeBg = darken(normPrimary.surfaceBg, 0.15);
  const codeBorder = mixHex(
    normPrimary.surfaceBg,
    normPrimary.textSecondary,
    0.2,
  );
  const quoteBorder = normPrimary.accent;
  const link = mixHex(normPrimary.accent, '#93c5fd', 0.5);
  const linkHover = lighten(link, 0.15);
  const pomodoroTrack = mixHex(
    normPrimary.surfaceBg,
    normPrimary.textSecondary,
    0.25,
  );
  const pomodoroProgress = normPrimary.accent;
  const glassBorder = mixHex(normPrimary.surfaceBg, normPrimary.accent, 0.2);
  const glassRim = '#ffffff';
  const glassShadowColor = '#000000';

  return {
    surfaceElevated,
    surfaceMuted,
    border,
    borderSubtle,
    textMuted,
    accentHover,
    ring,
    danger,
    dangerBg,
    dangerHoverBg,
    dangerBorder,
    dangerText,
    codeBg,
    codeBorder,
    quoteBorder,
    link,
    linkHover,
    pomodoroTrack,
    pomodoroProgress,
    glassBorder,
    glassRim,
    glassShadowColor,
  };
}

export function deriveSingleColor(
  key: DerivedColorKey,
  primary: Record<PrimaryColorKey, string>,
  mode: ThemeMode,
): string {
  const derived = deriveDependentColors(primary, mode);
  return derived[key];
}

export function calculateContrastIssues(
  colors: CustomThemeColors,
): ContrastIssue[] {
  const issues: ContrastIssue[] = [];

  const check = (
    color1Key: CustomThemeColorKey,
    color2Key: CustomThemeColorKey,
    pairName: string,
    message: string,
    threshold: number,
  ) => {
    const c1 = colors[color1Key];
    const c2 = colors[color2Key];
    if (!c1 || !c2) return;
    const ratio = getContrastRatio(c1, c2);
    if (ratio < threshold) {
      issues.push({
        pairName,
        message,
        ratio: Math.round(ratio * 10) / 10,
        threshold,
        color1: c1,
        color2: c2,
      });
    }
  };

  check(
    'textPrimary',
    'surfaceBg',
    'Основной текст на карточке',
    'Основной текст может сливаться с фоном карточки',
    4.5,
  );
  check(
    'textSecondary',
    'surfaceBg',
    'Дополнительный текст на карточке',
    'Дополнительный текст может быть плохо различим на карточке',
    3.0,
  );
  check(
    'textPrimary',
    'canvasBg',
    'Основной текст на фоне страницы',
    'Текст может сливаться с общим фоном страницы',
    4.5,
  );
  check(
    'accentText',
    'accent',
    'Текст кнопки на акценте',
    'Текст кнопки трудно прочесть на акцентном фоне',
    4.5,
  );
  check(
    'link',
    'surfaceBg',
    'Ссылки на карточке',
    'Ссылки могут быть плохо различимы на карточке',
    3.0,
  );
  check(
    'dangerText',
    'dangerBg',
    'Текст ошибки на фоне ошибки',
    'Текст предупреждения трудно различим на фоне ошибки',
    4.5,
  );

  return issues;
}

export function createCustomThemeSnapshot(
  basePresetId: BuiltinThemeId,
  mode: ThemeMode,
  name: string,
  id: string = crypto.randomUUID(),
): CustomTheme {
  const targetId =
    basePresetId === 'system'
      ? mode === 'dark'
        ? 'dark'
        : 'light'
      : basePresetId;
  const baseDef = (THEMES.find((t) => t.id === targetId) ?? THEMES[0])!;
  const t = baseDef.tokens;

  const colors: CustomThemeColors = {
    canvasBg: extractHexFromColorString(
      t.canvasBg,
      mode === 'light' ? '#f4f4f5' : '#18181b',
    ),
    surfaceBg: extractHexFromColorString(
      t.surfaceBg,
      mode === 'light' ? '#ffffff' : '#18181b',
    ),
    surfaceElevated: extractHexFromColorString(
      t.surfaceElevated,
      mode === 'light' ? '#f4f4f5' : '#27272a',
    ),
    surfaceMuted: extractHexFromColorString(
      t.surfaceMuted,
      mode === 'light' ? '#f4f4f5' : '#27272a',
    ),
    border: extractHexFromColorString(
      t.border,
      mode === 'light' ? '#e4e4e7' : '#3f3f46',
    ),
    borderSubtle: extractHexFromColorString(
      t.borderSubtle,
      mode === 'light' ? '#f4f4f5' : '#27272a',
    ),
    textPrimary: extractHexFromColorString(
      t.textPrimary,
      mode === 'light' ? '#09090b' : '#f4f4f5',
    ),
    textSecondary: extractHexFromColorString(
      t.textSecondary,
      mode === 'light' ? '#52525b' : '#a1a1aa',
    ),
    textMuted: extractHexFromColorString(
      t.textMuted,
      mode === 'light' ? '#a1a1aa' : '#71717a',
    ),
    accent: extractHexFromColorString(
      t.accent,
      mode === 'light' ? '#18181b' : '#f4f4f5',
    ),
    accentHover: extractHexFromColorString(
      t.accentHover,
      mode === 'light' ? '#27272a' : '#ffffff',
    ),
    accentText: extractHexFromColorString(
      t.accentText,
      mode === 'light' ? '#ffffff' : '#09090b',
    ),
    ring: extractHexFromColorString(
      t.ring,
      mode === 'light' ? '#71717a' : '#71717a',
    ),
    danger: extractHexFromColorString(
      t.danger,
      mode === 'light' ? '#dc2626' : '#ef4444',
    ),
    dangerBg: extractHexFromColorString(
      t.dangerBg,
      mode === 'light' ? '#fef2f2' : '#2d1519',
    ),
    dangerHoverBg: extractHexFromColorString(
      t.dangerHoverBg,
      mode === 'light' ? '#fee2e2' : '#3b1c22',
    ),
    dangerBorder: extractHexFromColorString(
      t.dangerBorder,
      mode === 'light' ? '#fecaca' : '#57222c',
    ),
    dangerText: extractHexFromColorString(
      t.dangerText,
      mode === 'light' ? '#b91c1c' : '#fca5a5',
    ),
    codeBg: extractHexFromColorString(
      t.codeBg,
      mode === 'light' ? '#f4f4f5' : '#09090b',
    ),
    codeBorder: extractHexFromColorString(
      t.codeBorder,
      mode === 'light' ? '#e4e4e7' : '#27272a',
    ),
    quoteBorder: extractHexFromColorString(
      t.quoteBorder,
      mode === 'light' ? '#d4d4d8' : '#52525b',
    ),
    link: extractHexFromColorString(
      t.link,
      mode === 'light' ? '#1d4ed8' : '#93c5fd',
    ),
    linkHover: extractHexFromColorString(
      t.linkHover,
      mode === 'light' ? '#1e40af' : '#bfdbfe',
    ),
    pomodoroTrack: extractHexFromColorString(
      t.pomodoroTrack,
      mode === 'light' ? '#e4e4e7' : '#3f3f46',
    ),
    pomodoroProgress: extractHexFromColorString(
      t.pomodoroProgress,
      mode === 'light' ? '#18181b' : '#f4f4f5',
    ),
    glassBorder: extractHexFromColorString(
      t.glassBorder,
      mode === 'light' ? '#e4e4e7' : '#3f3f46',
    ),
    glassRim: extractHexFromColorString(t.glassRim ?? '#ffffff', '#ffffff'),
    glassShadowColor: extractHexFromColorString(
      t.glassShadowColor,
      mode === 'light' ? '#18181b' : '#000000',
    ),
  };

  return {
    id,
    name: name.trim(),
    mode,
    baseThemeId: basePresetId,
    colors,
    manualOverrides: [],
    glow: basePresetId === 'synthwave-84',
  };
}

export function customThemeToTokens(theme: CustomTheme): ThemeTokens {
  const c = theme.colors;
  const isLight = theme.mode === 'light';

  let glowValue = 'none';
  if (theme.glow) {
    glowValue = `0 0 8px ${hexToRgba(c.accent, 0.55)}, 0 0 16px ${hexToRgba(c.link, 0.25)}`;
  }

  return {
    canvasBg: c.canvasBg,
    surfaceBg: c.surfaceBg,
    surfaceElevated: c.surfaceElevated,
    surfaceMuted: c.surfaceMuted,
    border: c.border,
    borderSubtle: c.borderSubtle,
    textPrimary: c.textPrimary,
    textSecondary: c.textSecondary,
    textMuted: c.textMuted,
    accent: c.accent,
    accentHover: c.accentHover,
    accentText: c.accentText,
    ring: c.ring,
    danger: c.danger,
    dangerBg: c.dangerBg,
    dangerHoverBg: c.dangerHoverBg,
    dangerBorder: c.dangerBorder,
    dangerText: c.dangerText,
    codeBg: c.codeBg,
    codeBorder: c.codeBorder,
    quoteBorder: c.quoteBorder,
    link: c.link,
    linkHover: c.linkHover,
    pomodoroTrack: c.pomodoroTrack,
    pomodoroProgress: c.pomodoroProgress,
    glassTintLight: hexToRgba(c.surfaceBg, 0.85),
    glassTintDark: hexToRgba(c.surfaceBg, 0.92),
    glassBorder: isLight ? hexToRgba(c.border, 0.5) : hexToRgba(c.border, 0.3),
    glassRim: isLight
      ? 'rgba(255, 255, 255, 0.8)'
      : 'rgba(255, 255, 255, 0.16)',
    glassShadowColor: hexToRgba(c.glassShadowColor, isLight ? 0.28 : 0.56),
    glow: glowValue,
  };
}

export function isCustomThemeColorKey(
  key: unknown,
): key is CustomThemeColorKey {
  return (
    typeof key === 'string' &&
    ALL_CUSTOM_THEME_COLOR_KEYS.includes(key as CustomThemeColorKey)
  );
}

export function isPrimaryColorKey(key: unknown): key is PrimaryColorKey {
  return (
    typeof key === 'string' &&
    PRIMARY_COLOR_KEYS.includes(key as PrimaryColorKey)
  );
}

export function isDerivedColorKey(key: unknown): key is DerivedColorKey {
  return (
    typeof key === 'string' &&
    DERIVED_COLOR_KEYS.includes(key as DerivedColorKey)
  );
}
