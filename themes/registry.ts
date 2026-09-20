import {
  CATPPUCCIN_LATTE_TOKENS,
  CATPPUCCIN_MOCHA_TOKENS,
  CLASSIC_DARK_TOKENS,
  CLASSIC_LIGHT_TOKENS,
  COZY_LOFI_NIGHT_TOKENS,
  NORD_TOKENS,
  RAINY_TOKYO_TOKENS,
  SOLARIZED_DARK_TOKENS,
  SYNTHWAVE_84_TOKENS,
  TOKYO_NIGHT_TOKENS,
} from './palettes';
import type { ThemeDefinition, ThemeId } from './types';

export const THEMES: readonly ThemeDefinition[] = [
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

export function getThemeDefinition(id: ThemeId): ThemeDefinition {
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

export function resolveTheme(
  id: ThemeId,
  systemDarkMode: boolean,
): { definition: ThemeDefinition; mode: 'light' | 'dark' } {
  if (id === 'system') {
    return {
      definition: getThemeDefinition(systemDarkMode ? 'dark' : 'light'),
      mode: systemDarkMode ? 'dark' : 'light',
    };
  }

  const definition = getThemeDefinition(id);
  const mode = definition.mode === 'light' ? 'light' : 'dark';
  return { definition, mode };
}
