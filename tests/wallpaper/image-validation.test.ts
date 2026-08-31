import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InvalidWallpaperImageError,
  WallpaperValidationAbortedError,
  detectWallpaperMimeType,
  validateLocalWallpaper,
  validateWallpaperBytes,
  validateWallpaperUrl,
} from '../../wallpaper/image-validation';

type ImageBehavior = 'load' | 'error' | 'stall' | 'decode-error';

let imageBehavior: ImageBehavior;
let imageInstances: FakeImage[];

class FakeImage {
  alt = '';
  decoding: 'async' | 'auto' | 'sync' = 'auto';
  onerror: OnErrorEventHandler | null = null;
  onload: ((this: GlobalEventHandlers, event: Event) => unknown) | null = null;
  referrerPolicy = '';
  private source = '';

  constructor() {
    imageInstances.push(this);
  }

  get src() {
    return this.source;
  }

  set src(value: string) {
    this.source = value;

    if (!value || imageBehavior === 'stall') {
      return;
    }

    queueMicrotask(() => {
      if (imageBehavior === 'error') {
        this.onerror?.(new Event('error'));
      } else {
        this.onload?.call(
          this as unknown as GlobalEventHandlers,
          new Event('load'),
        );
      }
    });
  }

  async decode() {
    if (imageBehavior === 'decode-error') {
      throw new Error('decode failed');
    }
  }
}

const ascii = (value: string) => new TextEncoder().encode(value);

const formatFixtures = [
  {
    name: 'PNG',
    mimeType: 'image/png',
    bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
  },
  {
    name: 'JPEG',
    mimeType: 'image/jpeg',
    bytes: new Uint8Array([255, 216, 255, 224]),
  },
  {
    name: 'WebP',
    mimeType: 'image/webp',
    bytes: ascii('RIFF\0\0\0\0WEBP'),
  },
  {
    name: 'GIF87a',
    mimeType: 'image/gif',
    bytes: ascii('GIF87a'),
  },
  {
    name: 'GIF89a',
    mimeType: 'image/gif',
    bytes: ascii('GIF89a'),
  },
  {
    name: 'AVIF',
    mimeType: 'image/avif',
    bytes: new Uint8Array([
      0, 0, 0, 24, 102, 116, 121, 112, 97, 118, 105, 102, 0, 0, 0, 0, 109, 105,
      102, 49, 97, 118, 105, 102,
    ]),
  },
  {
    name: 'SVG',
    mimeType: 'image/svg+xml',
    bytes: ascii(
      '\uFEFF<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>',
    ),
  },
] as const;

describe('wallpaper image validation', () => {
  beforeEach(() => {
    imageBehavior = 'load';
    imageInstances = [];
    vi.stubGlobal('Image', FakeImage);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:wallpaper'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(formatFixtures)('detects $name bytes', ({ bytes, mimeType }) => {
    expect(detectWallpaperMimeType(bytes, mimeType)).toBe(mimeType);
  });

  it('detects a supported format when the declared MIME type is empty', () => {
    expect(detectWallpaperMimeType(formatFixtures[0].bytes, '')).toBe(
      'image/png',
    );
  });

  it('rejects a declared image whose bytes have another format', () => {
    expect(() =>
      detectWallpaperMimeType(formatFixtures[0].bytes, 'image/jpeg'),
    ).toThrow(InvalidWallpaperImageError);
  });

  it('rejects HTML presented as SVG', () => {
    expect(() =>
      detectWallpaperMimeType(
        ascii('<html><body>not svg</body></html>'),
        'image/svg+xml',
      ),
    ).toThrow(InvalidWallpaperImageError);
  });

  it('reads and validates a local file without changing its bytes', async () => {
    const bytes = formatFixtures[0].bytes;
    const file = new File([bytes], 'wallpaper.png', { type: 'image/png' });

    const result = await validateLocalWallpaper(file);

    expect(result.mimeType).toBe('image/png');
    expect(Array.from(result.bytes)).toEqual(Array.from(bytes));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wallpaper');
  });

  it('revokes a Blob URL when browser decoding fails', async () => {
    imageBehavior = 'error';

    await expect(
      validateWallpaperBytes(formatFixtures[0].bytes, 'image/png'),
    ).rejects.toThrow(InvalidWallpaperImageError);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wallpaper');
  });

  it('accepts and normalizes a decodable HTTPS URL without fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      validateWallpaperUrl('https://example.com/a b.png'),
    ).resolves.toBe('https://example.com/a%20b.png');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(imageInstances[0]).toMatchObject({
      decoding: 'async',
      referrerPolicy: 'no-referrer',
      src: 'https://example.com/a%20b.png',
    });
  });

  it.each([
    'http://example.com/a.png',
    'data:image/png;base64,AQ==',
    'bad url',
  ])('rejects a non-HTTPS URL: %s', async (url) => {
    await expect(validateWallpaperUrl(url)).rejects.toThrow(
      InvalidWallpaperImageError,
    );
    expect(imageInstances).toHaveLength(0);
  });

  it('rejects a URL that does not decode as an image', async () => {
    imageBehavior = 'decode-error';

    await expect(
      validateWallpaperUrl('https://example.com/not-image'),
    ).rejects.toThrow(InvalidWallpaperImageError);
  });

  it('rejects a stalled URL after ten seconds', async () => {
    vi.useFakeTimers();
    imageBehavior = 'stall';
    const validation = validateWallpaperUrl('https://example.com/slow.png');
    const rejection = expect(validation).rejects.toThrow('10 секунд');

    await vi.advanceTimersByTimeAsync(10_000);

    await rejection;
  });

  it('aborts an active validation without reporting an image error', async () => {
    imageBehavior = 'stall';
    const controller = new AbortController();
    const validation = validateWallpaperUrl(
      'https://example.com/slow.png',
      controller.signal,
    );

    controller.abort();

    await expect(validation).rejects.toBeInstanceOf(
      WallpaperValidationAbortedError,
    );
    expect(imageInstances[0]?.src).toBe('');
  });
});
