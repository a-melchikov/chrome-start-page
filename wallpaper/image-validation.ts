import {
  WALLPAPER_MIME_TYPES,
  type WallpaperMimeType,
} from '../storage/wallpaper-codec';

export class InvalidWallpaperImageError extends Error {
  constructor(message = 'Файл не является поддерживаемым изображением') {
    super(message);
    this.name = 'InvalidWallpaperImageError';
  }
}

export class WallpaperValidationAbortedError extends Error {
  constructor() {
    super('Проверка обоев отменена');
    this.name = 'WallpaperValidationAbortedError';
  }
}

const IMAGE_LOAD_TIMEOUT_MS = 10_000;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const textDecoder = new TextDecoder('utf-8', { fatal: true });

function hasBytes(bytes: Uint8Array, offset: number, expected: number[]) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function isPng(bytes: Uint8Array) {
  return hasBytes(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10]);
}

function isJpeg(bytes: Uint8Array) {
  return hasBytes(bytes, 0, [255, 216, 255]);
}

function isWebP(bytes: Uint8Array) {
  return (
    bytes.length >= 12 &&
    readAscii(bytes, 0, 4) === 'RIFF' &&
    readAscii(bytes, 8, 4) === 'WEBP'
  );
}

function isGif(bytes: Uint8Array) {
  if (bytes.length < 6) {
    return false;
  }

  const signature = readAscii(bytes, 0, 6);
  return signature === 'GIF87a' || signature === 'GIF89a';
}

function isAvif(bytes: Uint8Array) {
  if (bytes.length < 12 || readAscii(bytes, 4, 4) !== 'ftyp') {
    return false;
  }

  for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
    const brand = readAscii(bytes, offset, 4);

    if (brand === 'avif' || brand === 'avis') {
      return true;
    }
  }

  return false;
}

function isSvg(bytes: Uint8Array) {
  try {
    const document = new DOMParser().parseFromString(
      textDecoder.decode(bytes),
      'application/xml',
    );
    const root = document.documentElement;

    return root.localName === 'svg' && root.namespaceURI === SVG_NAMESPACE;
  } catch {
    return false;
  }
}

function detectMimeType(bytes: Uint8Array): WallpaperMimeType | null {
  if (isPng(bytes)) return 'image/png';
  if (isJpeg(bytes)) return 'image/jpeg';
  if (isWebP(bytes)) return 'image/webp';
  if (isGif(bytes)) return 'image/gif';
  if (isAvif(bytes)) return 'image/avif';
  if (isSvg(bytes)) return 'image/svg+xml';
  return null;
}

function isWallpaperMimeType(value: string): value is WallpaperMimeType {
  return WALLPAPER_MIME_TYPES.some((mimeType) => mimeType === value);
}

export function detectWallpaperMimeType(
  bytes: Uint8Array,
  declaredMimeType: string,
): WallpaperMimeType {
  const detectedMimeType = detectMimeType(bytes);

  if (!detectedMimeType) {
    throw new InvalidWallpaperImageError();
  }

  const normalizedDeclaredType = declaredMimeType.trim().toLowerCase();

  if (
    normalizedDeclaredType &&
    (!isWallpaperMimeType(normalizedDeclaredType) ||
      normalizedDeclaredType !== detectedMimeType)
  ) {
    throw new InvalidWallpaperImageError(
      'Тип файла не совпадает с содержимым изображения',
    );
  }

  return detectedMimeType;
}

function loadImage(src: string, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new WallpaperValidationAbortedError());
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    let isSettled = false;
    const timeoutId = window.setTimeout(() => {
      finish(
        new InvalidWallpaperImageError(
          'Изображение не загрузилось за 10 секунд',
        ),
      );
    }, IMAGE_LOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abort);
      image.onload = null;
      image.onerror = null;
    };

    const finish = (error?: Error) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      cleanup();

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const abort = () => {
      image.src = '';
      finish(new WallpaperValidationAbortedError());
    };

    image.referrerPolicy = 'no-referrer';
    image.decoding = 'async';
    image.onerror = () => {
      finish(
        new InvalidWallpaperImageError('Не удалось загрузить изображение'),
      );
    };
    image.onload = () => {
      void image.decode().then(
        () => finish(),
        () =>
          finish(
            new InvalidWallpaperImageError(
              'Ресурс не декодируется как изображение',
            ),
          ),
      );
    };
    signal?.addEventListener('abort', abort, { once: true });
    image.src = src;
  });
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export async function validateWallpaperBytes(
  bytes: Uint8Array,
  mimeType: WallpaperMimeType,
  signal?: AbortSignal,
): Promise<void> {
  detectWallpaperMimeType(bytes, mimeType);

  const objectUrl = URL.createObjectURL(
    new Blob([copyBytes(bytes)], { type: mimeType }),
  );

  try {
    await loadImage(objectUrl, signal);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function validateLocalWallpaper(
  file: File,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; mimeType: WallpaperMimeType }> {
  if (signal?.aborted) {
    throw new WallpaperValidationAbortedError();
  }

  let bytes: Uint8Array;

  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new InvalidWallpaperImageError('Не удалось прочитать файл');
  }

  if (signal?.aborted) {
    throw new WallpaperValidationAbortedError();
  }

  const mimeType = detectWallpaperMimeType(bytes, file.type);
  await validateWallpaperBytes(bytes, mimeType, signal);

  return { bytes, mimeType };
}

export async function validateWallpaperUrl(
  value: string,
  signal?: AbortSignal,
): Promise<string> {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new InvalidWallpaperImageError('Введите корректную HTTPS-ссылку');
  }

  if (url.protocol !== 'https:' || !url.hostname) {
    throw new InvalidWallpaperImageError('Разрешены только HTTPS-ссылки');
  }

  await loadImage(url.href, signal);
  return url.href;
}
