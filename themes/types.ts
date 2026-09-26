export type BuiltinThemeId =
  | 'system'
  | 'light'
  | 'dark'
  | 'tokyo-night'
  | 'rainy-tokyo'
  | 'cozy-lofi-night'
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'paper-sage'
  | 'apricot-noon'
  | 'nord'
  | 'synthwave-84'
  | 'solarized-dark';

export type ThemeId = BuiltinThemeId;

export type ThemeRef =
  { type: 'builtin'; id: BuiltinThemeId } | { type: 'custom'; id: string };

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  // Canvas & Surfaces
  canvasBg: string;
  surfaceBg: string;
  surfaceElevated: string;
  surfaceMuted: string;

  // Borders
  border: string;
  borderSubtle: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent & Interaction
  accent: string;
  accentHover: string;
  accentText: string;
  ring: string;

  // Danger
  danger: string;
  dangerBg: string;
  dangerHoverBg: string;
  dangerBorder: string;
  dangerText: string;

  // Markdown & Widgets
  codeBg: string;
  codeBorder: string;
  quoteBorder: string;
  link: string;
  linkHover: string;
  pomodoroTrack: string;
  pomodoroProgress: string;

  // Liquid Glass Tint & Shadows
  glassTintLight: string;
  glassTintDark: string;
  glassBorder: string;
  glassRim?: string;
  glassShadowColor: string;

  // Special Effects (e.g. SynthWave neon glow)
  glow?: string;
}

export interface ThemePreviewColors {
  bg: string;
  surface: string;
  accent: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  mode: ThemeMode | 'system';
  defaultBackgroundColor: string;
  previewColors: ThemePreviewColors;
  tokens: ThemeTokens;
}

export type BuiltinThemeDefinition = ThemeDefinition & {
  id: BuiltinThemeId;
};

export const PRIMARY_COLOR_KEYS = [
  'canvasBg',
  'surfaceBg',
  'textPrimary',
  'textSecondary',
  'accent',
  'accentText',
] as const;

export type PrimaryColorKey = (typeof PRIMARY_COLOR_KEYS)[number];

export const DERIVED_COLOR_KEYS = [
  'surfaceElevated',
  'surfaceMuted',
  'border',
  'borderSubtle',
  'textMuted',
  'accentHover',
  'ring',
  'danger',
  'dangerBg',
  'dangerHoverBg',
  'dangerBorder',
  'dangerText',
  'codeBg',
  'codeBorder',
  'quoteBorder',
  'link',
  'linkHover',
  'pomodoroTrack',
  'pomodoroProgress',
  'glassBorder',
  'glassRim',
  'glassShadowColor',
] as const;

export type DerivedColorKey = (typeof DERIVED_COLOR_KEYS)[number];

export const ALL_CUSTOM_THEME_COLOR_KEYS = [
  ...PRIMARY_COLOR_KEYS,
  ...DERIVED_COLOR_KEYS,
] as const;

export type CustomThemeColorKey = (typeof ALL_CUSTOM_THEME_COLOR_KEYS)[number];

export type CustomThemeColors = Record<CustomThemeColorKey, string>;

export interface CustomTheme {
  id: string;
  name: string;
  description?: string;
  mode: ThemeMode;
  baseThemeId?: BuiltinThemeId;
  colors: CustomThemeColors;
  manualOverrides: CustomThemeColorKey[];
  glow?: boolean;
}

export interface ContrastIssue {
  pairName: string;
  message: string;
  ratio: number;
  threshold: number;
  color1: string;
  color2: string;
}
