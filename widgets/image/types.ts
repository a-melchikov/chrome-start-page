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

export interface ImageWidgetConfig extends BaseWidgetConfig<'image'> {
  type: 'image';
  source: ImageWidgetSource;
  objectPosition: ImageObjectPosition;
  fitMode?: ImageFitMode;
  zoom?: number;
  altText?: string;
}
