import {
  APRICOT_NOON_TOKENS,
  CATPPUCCIN_LATTE_TOKENS,
  CATPPUCCIN_MOCHA_TOKENS,
  CLASSIC_DARK_TOKENS,
  CLASSIC_LIGHT_TOKENS,
  COZY_LOFI_NIGHT_TOKENS,
  NORD_TOKENS,
  PAPER_SAGE_TOKENS,
  RAINY_TOKYO_TOKENS,
  SOLARIZED_DARK_TOKENS,
  SYNTHWAVE_84_TOKENS,
  TOKYO_NIGHT_TOKENS,
} from './palettes';
import type {
  BuiltinThemeDefinition,
  BuiltinThemeId,
  CustomTheme,
  ThemeDefinition,
  ThemeRef,
  ThemeTokens,
} from './types';
import { customThemeToTokens } from './color-derivation';

export const BUILTIN_THEME_IDS: readonly BuiltinThemeId[] = [
  'system',
  'light',
  'dark',
  'tokyo-night',
  'rainy-tokyo',
  'cozy-lofi-night',
  'catppuccin-mocha',
  'catppuccin-latte',
  'paper-sage',
  'apricot-noon',
  'nord',
  'synthwave-84',
  'solarized-dark',
] as const;

export function isBuiltinThemeId(value: unknown): value is BuiltinThemeId {
  return (
    typeof value === 'string' &&
    BUILTIN_THEME_IDS.includes(value as BuiltinThemeId)
  );
}

export const THEMES: readonly BuiltinThemeDefinition[] = [
  {
    id: 'system',
    name: 'Системная',
    description: 'Адаптируется под цветовую схему операционной системы',
    mode: 'system',
    defaultBackgroundColor: '#18181b',
    previewColors: {
      bg: '#18181b',
      surface: '#27272a',
      accent: '#f4f4f5',
    },
    tokens: CLASSIC_DARK_TOKENS,
  },
  {
    id: 'dark',
    name: 'Тёмная',
    description: 'Классическая тёмная нейтральная палитра',
    mode: 'dark',
    defaultBackgroundColor: '#18181b',
    previewColors: {
      bg: '#18181b',
      surface: '#27272a',
      accent: '#f4f4f5',
    },
    tokens: CLASSIC_DARK_TOKENS,
  },
  {
    id: 'light',
    name: 'Светлая',
    description: 'Классическая светлая нейтральная палитра',
    mode: 'light',
    defaultBackgroundColor: '#f4f4f5',
    previewColors: {
      bg: '#f4f4f5',
      surface: '#ffffff',
      accent: '#18181b',
    },
    tokens: CLASSIC_LIGHT_TOKENS,
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Глубокий индиго и неоновые огни ночного Токио',
    mode: 'dark',
    defaultBackgroundColor: '#1a1b26',
    previewColors: {
      bg: '#1a1b26',
      surface: '#24283b',
      accent: '#7aa2f7',
    },
    tokens: TOKYO_NIGHT_TOKENS,
  },
  {
    id: 'rainy-tokyo',
    name: 'Rainy Tokyo',
    description: 'Дождливый асфальт и бирюзовые неоновые огни',
    mode: 'dark',
    defaultBackgroundColor: '#1c202a',
    previewColors: {
      bg: '#1c202a',
      surface: '#252b37',
      accent: '#59c2c6',
    },
    tokens: RAINY_TOKYO_TOKENS,
  },
  {
    id: 'cozy-lofi-night',
    name: 'Cozy Lofi Night',
    description: 'Тёплые кофейные и персиковые тона ночного чиллаута',
    mode: 'dark',
    defaultBackgroundColor: '#1e1924',
    previewColors: {
      bg: '#1e1924',
      surface: '#292233',
      accent: '#f5a97f',
    },
    tokens: COZY_LOFI_NIGHT_TOKENS,
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    description: 'Тёмная гармоничная пастель с лавандовыми акцентами',
    mode: 'dark',
    defaultBackgroundColor: '#1e1e2e',
    previewColors: {
      bg: '#1e1e2e',
      surface: '#181825',
      accent: '#b4befe',
    },
    tokens: CATPPUCCIN_MOCHA_TOKENS,
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    description: 'Светлая мягкая пастель с сапфировым акцентом',
    mode: 'light',
    defaultBackgroundColor: '#eff1f5',
    previewColors: {
      bg: '#eff1f5',
      surface: '#ffffff',
      accent: '#1e66f5',
    },
    tokens: CATPPUCCIN_LATTE_TOKENS,
  },
  {
    id: 'paper-sage',
    name: 'Бумага и шалфей',
    description: 'Тёплая бумага и спокойные шалфейные акценты',
    mode: 'light',
    defaultBackgroundColor: '#f6f3eb',
    previewColors: {
      bg: '#f6f3eb',
      surface: '#fffefa',
      accent: '#276354',
    },
    tokens: PAPER_SAGE_TOKENS,
  },
  {
    id: 'apricot-noon',
    name: 'Абрикосовый полдень',
    description: 'Кремовые поверхности и мягкие терракотовые акценты',
    mode: 'light',
    defaultBackgroundColor: '#fff3e8',
    previewColors: {
      bg: '#fff3e8',
      surface: '#fffcf8',
      accent: '#b34f36',
    },
    tokens: APRICOT_NOON_TOKENS,
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Арктическая прохлада и ледяные бирюзовые тона',
    mode: 'dark',
    defaultBackgroundColor: '#2e3440',
    previewColors: {
      bg: '#2e3440',
      surface: '#3b4252',
      accent: '#88c0d0',
    },
    tokens: NORD_TOKENS,
  },
  {
    id: 'synthwave-84',
    name: "SynthWave '84",
    description: 'Ретровейв и киберпанк с неоновым пурпуром и цианом',
    mode: 'dark',
    defaultBackgroundColor: '#262335',
    previewColors: {
      bg: '#262335',
      surface: '#241b2f',
      accent: '#ff7edb',
    },
    tokens: SYNTHWAVE_84_TOKENS,
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    description: 'Каноническая тёмная палитра морской волны',
    mode: 'dark',
    defaultBackgroundColor: '#002b36',
    previewColors: {
      bg: '#002b36',
      surface: '#073642',
      accent: '#2aa198',
    },
    tokens: SOLARIZED_DARK_TOKENS,
  },
] as const;

export function getThemeDefinition(id: string): ThemeDefinition {
  const found = THEMES.find((theme) => theme.id === id);
  if (found) {
    return found;
  }
  const fallback = THEMES[0];
  if (!fallback) {
    throw new Error('No themes registered');
  }
  return fallback;
}

export function customThemeToDefinition(
  customTheme: CustomTheme,
): ThemeDefinition {
  const tokens = customThemeToTokens(customTheme);
  return {
    id: customTheme.id,
    name: customTheme.name,
    description: customTheme.description ?? '',
    mode: customTheme.mode,
    defaultBackgroundColor: customTheme.colors.canvasBg,
    previewColors: {
      bg: customTheme.colors.canvasBg,
      surface: customTheme.colors.surfaceBg,
      accent: customTheme.colors.accent,
    },
    tokens,
  };
}

export function resolveTheme(
  themeRef: ThemeRef | BuiltinThemeId,
  systemDarkMode: boolean,
  customThemes?: readonly CustomTheme[],
): { definition: ThemeDefinition; mode: 'light' | 'dark'; isCustom: boolean } {
  const normalizedRef: ThemeRef =
    typeof themeRef === 'string'
      ? { type: 'builtin', id: themeRef as BuiltinThemeId }
      : themeRef;

  if (normalizedRef.type === 'builtin') {
    if (normalizedRef.id === 'system') {
      const mode = systemDarkMode ? 'dark' : 'light';
      return {
        definition: getThemeDefinition(mode),
        mode,
        isCustom: false,
      };
    }

    const definition = getThemeDefinition(normalizedRef.id);
    const mode = definition.mode === 'light' ? 'light' : 'dark';
    return { definition, mode, isCustom: false };
  }

  // Custom theme
  const customTheme = customThemes?.find((t) => t.id === normalizedRef.id);
  if (customTheme) {
    return {
      definition: customThemeToDefinition(customTheme),
      mode: customTheme.mode,
      isCustom: true,
    };
  }

  // Fallback to system if custom theme not found
  const fallbackMode = systemDarkMode ? 'dark' : 'light';
  return {
    definition: getThemeDefinition(fallbackMode),
    mode: fallbackMode,
    isCustom: false,
  };
}

export const CSS_THEME_VARIABLES_MAP: Record<string, keyof ThemeTokens> = {
  '--theme-canvas-bg': 'canvasBg',
  '--theme-surface-bg': 'surfaceBg',
  '--theme-surface-elevated': 'surfaceElevated',
  '--theme-surface-muted': 'surfaceMuted',
  '--theme-border': 'border',
  '--theme-border-subtle': 'borderSubtle',
  '--theme-text-primary': 'textPrimary',
  '--theme-text-secondary': 'textSecondary',
  '--theme-text-muted': 'textMuted',
  '--theme-accent': 'accent',
  '--theme-accent-hover': 'accentHover',
  '--theme-accent-text': 'accentText',
  '--theme-ring': 'ring',
  '--theme-danger': 'danger',
  '--theme-danger-bg': 'dangerBg',
  '--theme-danger-hover-bg': 'dangerHoverBg',
  '--theme-danger-border': 'dangerBorder',
  '--theme-danger-text': 'dangerText',
  '--theme-code-bg': 'codeBg',
  '--theme-code-border': 'codeBorder',
  '--theme-quote-border': 'quoteBorder',
  '--theme-link': 'link',
  '--theme-link-hover': 'linkHover',
  '--theme-pomodoro-track': 'pomodoroTrack',
  '--theme-pomodoro-progress': 'pomodoroProgress',
  '--theme-glass-border': 'glassBorder',
  '--theme-glass-rim': 'glassRim',
  '--theme-glass-shadow-color': 'glassShadowColor',
  '--theme-glow': 'glow',
};

export function applyThemeVariables(
  target: HTMLElement,
  tokens: ThemeTokens | null,
): void {
  for (const [varName, tokenKey] of Object.entries(CSS_THEME_VARIABLES_MAP)) {
    if (tokens && tokens[tokenKey]) {
      target.style.setProperty(varName, tokens[tokenKey] as string);
    } else {
      target.style.removeProperty(varName);
    }
  }
}
