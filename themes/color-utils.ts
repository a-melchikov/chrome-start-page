export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const STRICT_HEX6_REGEX = /^#[0-9a-f]{6}$/i;

export function isValidHex(hex: unknown): boolean {
  return typeof hex === 'string' && HEX_REGEX.test(hex.trim());
}

export function isStrictHex6(hex: unknown): boolean {
  return typeof hex === 'string' && STRICT_HEX6_REGEX.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  const trimmed = hex.trim().toLowerCase();
  if (!HEX_REGEX.test(trimmed)) {
    return '#000000';
  }

  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return trimmed;
}

export function hexToRgb(hex: string): RgbColor {
  const normalized = normalizeHex(hex);
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
}

export function mixHex(color1: string, color2: string, weight: number): string {
  const w = Math.max(0, Math.min(1, weight));
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  return rgbToHex(
    rgb1.r * (1 - w) + rgb2.r * w,
    rgb1.g * (1 - w) + rgb2.g * w,
    rgb1.b * (1 - w) + rgb2.b * w,
  );
}

export function lighten(hex: string, amount: number): string {
  return mixHex(hex, '#ffffff', amount);
}

export function darken(hex: string, amount: number): string {
  return mixHex(hex, '#000000', amount);
}

export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4),
  );
  const [r = 0, g = 0, b = 0] = sRGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function extractHexFromColorString(
  color: string,
  fallback: string,
): string {
  if (isValidHex(color)) {
    return normalizeHex(color);
  }

  const rgbaMatch = color.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (rgbaMatch && rgbaMatch[1] && rgbaMatch[2] && rgbaMatch[3]) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    return rgbToHex(r, g, b);
  }

  return normalizeHex(fallback);
}
