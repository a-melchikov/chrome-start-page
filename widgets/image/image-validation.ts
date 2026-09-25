import { isRestrictedHost, isSvg } from '../../wallpaper/image-validation';

export const IMAGE_WIDGET_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export type ImageWidgetMimeType = (typeof IMAGE_WIDGET_MIME_TYPES)[number];

export class InvalidImageError extends Error {
  constructor(message = 'Файл не является поддерживаемым изображением') {
    super(message);
    this.name = 'InvalidImageError';
  }
}

export class ImageValidationAbortedError extends Error {
  constructor() {
    super('Проверка изображения отменена');
    this.name = 'ImageValidationAbortedError';
  }
}

export const MAX_IMAGE_FILE_BYTES = 32 * 1024 * 1024;
const IMAGE_LOAD_TIMEOUT_MS = 10_000;

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

function isSvgContent(bytes: Uint8Array): boolean {
  if (isSvg(bytes)) {
    return true;
  }
  try {
    const head = readAscii(bytes, 0, Math.min(bytes.length, 512))
      .trim()
      .toLowerCase();
    return (
      head.includes('<svg') ||
      head.startsWith('<?xml') ||
      head.includes('<!doctype svg')
    );
  } catch {
    return false;
  }
}

export function isImageWidgetMimeType(
  value: string,
): value is ImageWidgetMimeType {
  return IMAGE_WIDGET_MIME_TYPES.some((mimeType) => mimeType === value);
}

function normalizeDeclaredMimeType(mime?: string): string | undefined {
  if (!mime) {
    return undefined;
  }

  const normalized = mime.trim().toLowerCase();
  if (normalized === 'image/x-png') {
    return 'image/png';
  }
  if (normalized === 'image/pjpeg') {
    return 'image/jpeg';
  }

  return normalized;
}

export function detectImageMimeType(
  bytes: Uint8Array,
  declaredMimeType?: string,
): ImageWidgetMimeType {
  let detected: ImageWidgetMimeType | null = null;
  if (isPng(bytes)) detected = 'image/png';
  else if (isJpeg(bytes)) detected = 'image/jpeg';
  else if (isWebP(bytes)) detected = 'image/webp';
  else if (isGif(bytes)) detected = 'image/gif';
  else if (isAvif(bytes)) detected = 'image/avif';

  if (!detected) {
    if (
      isSvgContent(bytes) ||
      declaredMimeType?.toLowerCase() === 'image/svg+xml'
    ) {
      throw new InvalidImageError('Формат SVG не поддерживается');
    }
    throw new InvalidImageError();
  }

  const normalizedDeclaredType = normalizeDeclaredMimeType(declaredMimeType);
  if (
    normalizedDeclaredType &&
    normalizedDeclaredType !== 'application/octet-stream' &&
    normalizedDeclaredType !== 'application/x-download' &&
    normalizedDeclaredType !== 'binary/octet-stream' &&
    (!isImageWidgetMimeType(normalizedDeclaredType) ||
      normalizedDeclaredType !== detected)
  ) {
    throw new InvalidImageError(
      'Тип файла не совпадает с содержимым изображения',
    );
  }

  return detected;
}

export function loadImage(
  src: string,
  signal?: AbortSignal,
): Promise<{ width: number; height: number }> {
  if (signal?.aborted) {
    return Promise.reject(new ImageValidationAbortedError());
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    let isSettled = false;
    const timeoutId = window.setTimeout(() => {
      finish(new InvalidImageError('Изображение не загрузилось за 10 секунд'));
    }, IMAGE_LOAD_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abort);
      image.onload = null;
      image.onerror = null;
    };

    const finish = (
      error?: Error,
      dimensions?: { width: number; height: number },
    ) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      cleanup();

      if (error) {
        reject(error);
      } else if (dimensions) {
        resolve(dimensions);
      } else {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      }
    };

    const abort = () => {
      image.src = '';
      finish(new ImageValidationAbortedError());
    };

    image.referrerPolicy = 'no-referrer';
    image.decoding = 'async';
    image.onerror = () => {
      finish(new InvalidImageError('Не удалось загрузить изображение'));
    };
    image.onload = () => {
      const finishWithDimensions = () => {
        finish(undefined, {
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };

      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        if (typeof image.decode === 'function') {
          void image.decode().then(finishWithDimensions, finishWithDimensions);
        } else {
          finishWithDimensions();
        }
        return;
      }

      if (typeof image.decode === 'function') {
        void image
          .decode()
          .then(finishWithDimensions, () =>
            finish(
              new InvalidImageError('Ресурс не декодируется как изображение'),
            ),
          );
      } else {
        finish(new InvalidImageError('Не удалось загрузить изображение'));
      }
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

export async function validateImageBytes(
  bytes: Uint8Array,
  mimeType: ImageWidgetMimeType,
  signal?: AbortSignal,
): Promise<{ width: number; height: number }> {
  detectImageMimeType(bytes, mimeType);

  const objectUrl = URL.createObjectURL(
    new Blob([copyBytes(bytes)], { type: mimeType }),
  );

  try {
    return await loadImage(objectUrl, signal);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function validateLocalImageFile(
  file: File,
  signal?: AbortSignal,
): Promise<{
  bytes: Uint8Array;
  mimeType: ImageWidgetMimeType;
  width: number;
  height: number;
}> {
  if (signal?.aborted) {
    throw new ImageValidationAbortedError();
  }

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new InvalidImageError(
      'Размер файла превышает допустимый лимит (32 МБ)',
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new InvalidImageError('Не удалось прочитать файл');
  }

  if (signal?.aborted) {
    throw new ImageValidationAbortedError();
  }

  const mimeType = detectImageMimeType(bytes, file.type);
  const { width, height } = await validateImageBytes(bytes, mimeType, signal);

  return { bytes, mimeType, width, height };
}

export async function validateImageUrl(
  value: string,
  signal?: AbortSignal,
): Promise<{ url: string; width: number; height: number }> {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new InvalidImageError('Введите корректную HTTPS-ссылку');
  }

  if (url.protocol !== 'https:' || !url.hostname) {
    throw new InvalidImageError('Разрешены только HTTPS-ссылки');
  }

  if (url.port && url.port !== '443') {
    throw new InvalidImageError('Разрешены только стандартные HTTPS-порты');
  }

  if (isRestrictedHost(url.hostname)) {
    throw new InvalidImageError(
      'Обращение к локальным и приватным адресам запрещено',
    );
  }

  const { width, height } = await loadImage(url.href, signal);
  return { url: url.href, width, height };
}
