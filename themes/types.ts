export type ThemeId =
  | 'system'
  | 'light'
  | 'dark'
  | 'tokyo-night'
  | 'rainy-tokyo'
  | 'cozy-lofi-night'
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'nord'
  | 'synthwave-84'
  | 'solarized-dark';

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
  id: ThemeId;
  name: string;
  description: string;
  mode: ThemeMode | 'system';
  defaultBackgroundColor: string;
  previewColors: ThemePreviewColors;
  tokens: ThemeTokens;
}
