import { describe, expect, it } from 'vitest';

import {
  InvalidImageError,
  detectImageMimeType,
} from '../../../widgets/image/image-validation';

describe('image-validation', () => {
  const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10];
  const jpegHeader = [255, 216, 255, 224, 0, 16, 74, 70, 73, 70];
  const webpHeader = [
    82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32,
  ];
  const gifHeader = [71, 73, 70, 56, 57, 97];
  const avifHeader = [
    0, 0, 0, 28, 102, 116, 121, 112, 97, 118, 105, 102, 0, 0, 0, 0,
  ];

  it('detects PNG bytes', () => {
    const bytes = new Uint8Array([...pngHeader, 0, 0, 0, 0]);
    expect(detectImageMimeType(bytes, 'image/png')).toBe('image/png');
  });

  it('detects JPEG bytes', () => {
    const bytes = new Uint8Array([...jpegHeader, 0, 0, 0, 0]);
    expect(detectImageMimeType(bytes, 'image/jpeg')).toBe('image/jpeg');
  });

  it('detects WebP bytes', () => {
    const bytes = new Uint8Array([...webpHeader, 0, 0, 0, 0]);
    expect(detectImageMimeType(bytes, 'image/webp')).toBe('image/webp');
  });

  it('detects GIF bytes', () => {
    const bytes = new Uint8Array([...gifHeader, 0, 0, 0, 0]);
    expect(detectImageMimeType(bytes, 'image/gif')).toBe('image/gif');
  });

  it('detects AVIF bytes', () => {
    const bytes = new Uint8Array([...avifHeader, 0, 0, 0, 0]);
    expect(detectImageMimeType(bytes, 'image/avif')).toBe('image/avif');
  });

  it('accepts PNG files with embedded SVG metadata without false-positive rejection', () => {
    const embeddedSvg =
      'bfdb image/svg+xml   \twbidb<svg width="716" height="716" viewBox="0 0 716 716" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M508"/></svg>';
    const textBytes = Array.from(new TextEncoder().encode(embeddedSvg));
    const bytes = new Uint8Array([...pngHeader, ...textBytes]);

    expect(detectImageMimeType(bytes, 'image/png')).toBe('image/png');
    expect(detectImageMimeType(bytes)).toBe('image/png');
  });

  it('rejects SVG bytes with a clear message', () => {
    const svgBytes = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
    );

    expect(() => detectImageMimeType(svgBytes)).toThrow(
      'Формат SVG не поддерживается',
    );
  });

  it('rejects files with declared image/svg+xml MIME type', () => {
    const randomBytes = new Uint8Array([1, 2, 3, 4, 5]);

    expect(() => detectImageMimeType(randomBytes, 'image/svg+xml')).toThrow(
      'Формат SVG не поддерживается',
    );
  });

  it('rejects unknown binary data', () => {
    const randomBytes = new Uint8Array([1, 2, 3, 4, 5]);

    expect(() => detectImageMimeType(randomBytes)).toThrow(InvalidImageError);
  });

  it('rejects mismatched declared MIME types', () => {
    const bytes = new Uint8Array([...pngHeader, 0, 0, 0, 0]);

    expect(() => detectImageMimeType(bytes, 'image/jpeg')).toThrow(
      'Тип файла не совпадает с содержимым изображения',
    );
  });
});
