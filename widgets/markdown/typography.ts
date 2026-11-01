import type { CSSProperties } from 'react';

export interface MarkdownTypography {
  fontSize: number;
  lineSpacing: 'compact' | 'normal' | 'relaxed';
  readerWidth: number;
  titleSize: number;
  titleAlign: 'left' | 'center' | 'right';
}

export const DEFAULT_MARKDOWN_TYPOGRAPHY: Readonly<MarkdownTypography> = {
  fontSize: 14,
  lineSpacing: 'normal',
  readerWidth: 75,
  titleSize: 20,
  titleAlign: 'left',
};

export function isMarkdownTypography(
  value: unknown,
): value is MarkdownTypography {
  if (typeof value !== 'object' || value === null) return false;
  const fields = value as Record<string, unknown>;
  return (
    Number.isInteger(fields.fontSize) &&
    Number(fields.fontSize) >= 12 &&
    Number(fields.fontSize) <= 28 &&
    (fields.lineSpacing === 'compact' ||
      fields.lineSpacing === 'normal' ||
      fields.lineSpacing === 'relaxed') &&
    Number.isInteger(fields.readerWidth) &&
    Number(fields.readerWidth) >= 45 &&
    Number(fields.readerWidth) <= 100 &&
    Number.isInteger(fields.titleSize) &&
    Number(fields.titleSize) >= 14 &&
    Number(fields.titleSize) <= 36 &&
    (fields.titleAlign === 'left' ||
      fields.titleAlign === 'center' ||
      fields.titleAlign === 'right')
  );
}

export function getMarkdownTitleStyle(
  typography = DEFAULT_MARKDOWN_TYPOGRAPHY,
): CSSProperties {
  return { fontSize: typography.titleSize, textAlign: typography.titleAlign };
}

export function getMarkdownTextStyle(
  typography = DEFAULT_MARKDOWN_TYPOGRAPHY,
): CSSProperties {
  const spacing = { compact: 1.4, normal: 24 / 14, relaxed: 2 };
  return {
    fontSize: typography.fontSize,
    lineHeight: spacing[typography.lineSpacing],
  };
}
