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

export const MAX_WALLPAPER_FILE_BYTES = 32 * 1024 * 1024;
export const MAX_SVG_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SVG_TAG_DEPTH = 32;

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

export function hasExcessiveSvgNesting(
  xmlText: string,
  maxDepth = MAX_SVG_TAG_DEPTH,
): boolean {
  const stripped = xmlText
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');

  let depth = 0;
  const tagPattern = /<\/?([a-zA-Z0-9:-]+)[^>]*>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(stripped)) !== null) {
    const fullTag = match[0];
    const isClosing = fullTag.startsWith('</');
    const isSelfClosing =
      fullTag.endsWith('/>') ||
      fullTag.startsWith('<?') ||
      fullTag.startsWith('<!');

    if (isSelfClosing) {
      continue;
    }

    if (isClosing) {
      depth = Math.max(0, depth - 1);
    } else {
      depth += 1;
      if (depth > maxDepth) {
        return true;
      }
    }
  }

  return false;
}

function isSvg(bytes: Uint8Array) {
  if (bytes.length > MAX_SVG_FILE_BYTES) {
    return false;
  }

  try {
    const xmlText = textDecoder.decode(bytes);
    if (hasExcessiveSvgNesting(xmlText)) {
      return false;
    }

    const document = new DOMParser().parseFromString(
      xmlText,
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

export function isRestrictedHost(hostname: string): boolean {
  const host =
    hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;
  const lower = host.toLowerCase();

  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.lan') ||
    lower === '0.0.0.0'
  ) {
    return true;
  }

  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);
  if (ipv4Match) {
    const [, o1, o2, o3, o4] = ipv4Match.map(Number);
    if (
      o1 !== undefined &&
      o2 !== undefined &&
      o3 !== undefined &&
      o4 !== undefined &&
      o1 <= 255 &&
      o2 <= 255 &&
      o3 <= 255 &&
      o4 <= 255
    ) {
      if (o1 === 127) return true;
      if (o1 === 10) return true;
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
      if (o1 === 192 && o2 === 168) return true;
      if (o1 === 169 && o2 === 254) return true;
      if (o1 === 0) return true;
    }
  }

  if (lower === '::1' || lower === '::' || /^0*(:0*)*:1$/.test(lower)) {
    return true;
  }
  if (
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb')
  ) {
    return true;
  }
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  if (lower.startsWith('::ffff:')) {
    return isRestrictedHost(lower.slice(7));
  }

  return false;
}

export async function validateLocalWallpaper(
  file: File,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; mimeType: WallpaperMimeType }> {
  if (signal?.aborted) {
    throw new WallpaperValidationAbortedError();
  }

  if (file.size > MAX_WALLPAPER_FILE_BYTES) {
    throw new InvalidWallpaperImageError(
      'Размер файла превышает допустимый лимит (32 МБ)',
    );
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

  if (url.port && url.port !== '443') {
    throw new InvalidWallpaperImageError(
      'Разрешены только стандартные HTTPS-порты',
    );
  }

  if (isRestrictedHost(url.hostname)) {
    throw new InvalidWallpaperImageError(
      'Обращение к локальным и приватным адресам запрещено',
    );
  }

  await loadImage(url.href, signal);
  return url.href;
}
