import type { BaseWidgetConfig } from '../types';

export type ImageWidgetSource =
  | { type: 'none' }
  | { type: 'url'; url: string }
  | { type: 'local'; assetId: string };

export type ImageFitMode = 'cover' | 'contain';

export const IMAGE_OBJECT_POSITIONS = [
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

export type ImageObjectPositionPreset = (typeof IMAGE_OBJECT_POSITIONS)[number];

export type ImageObjectPosition = ImageObjectPositionPreset | (string & {});

export const IMAGE_OBJECT_POSITION_PERCENT_PATTERN =
  /^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/;

export function isImageObjectPosition(
  value: unknown,
): value is ImageObjectPosition {
  if (typeof value !== 'string') {
    return false;
  }

  if ((IMAGE_OBJECT_POSITIONS as readonly string[]).includes(value)) {
    return true;
  }

  const match = value.match(IMAGE_OBJECT_POSITION_PERCENT_PATTERN);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return false;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 0 &&
    x <= 100 &&
    y >= 0 &&
    y <= 100
  );
}

export interface ImageWidgetConfig extends BaseWidgetConfig<'image'> {
  type: 'image';
  source: ImageWidgetSource;
  objectPosition: ImageObjectPosition;
  fitMode?: ImageFitMode;
  zoom?: number;
  altText?: string;
}
