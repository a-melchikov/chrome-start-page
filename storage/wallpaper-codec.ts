import { isWallpaperAssetId } from './schema';

export const WALLPAPER_COMPRESSION_THRESHOLD_BYTES = 6 * 1024 * 1024;

export const WALLPAPER_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
] as const;

export type WallpaperMimeType = (typeof WALLPAPER_MIME_TYPES)[number];

export interface LocalWallpaperAssetV1 {
  version: 1;
  assetId: string;
  mimeType: WallpaperMimeType;
  encoding: 'base64' | 'gzip-base64';
  originalByteLength: number;
  storedByteLength: number;
  data: string;
}

export class InvalidWallpaperAssetError extends Error {
  constructor(message = 'Wallpaper asset has an invalid structure') {
    super(message);
    this.name = 'InvalidWallpaperAssetError';
  }
}

const BASE64_CHUNK_SIZE = 0x8000;
const BASE64_PATTERN =
  /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWallpaperMimeType(value: unknown): value is WallpaperMimeType {
  return WALLPAPER_MIME_TYPES.some((mimeType) => mimeType === value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + BASE64_CHUNK_SIZE),
    );
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) {
    throw new InvalidWallpaperAssetError('Wallpaper data is not valid base64');
  }

  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch (error) {
    throw new InvalidWallpaperAssetError(
      error instanceof Error ? error.message : 'Wallpaper base64 decode failed',
    );
  }
}

function createByteStream(bytes: Uint8Array): ReadableStream<BufferSource> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  return new ReadableStream({
    start(controller) {
      controller.enqueue(copy);
      controller.close();
    },
  });
}

async function collectStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    chunks.push(value);
    length += value.byteLength;
  }

  const result = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

async function gzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  return collectStream(
    createByteStream(bytes).pipeThrough(new CompressionStream('gzip')),
  );
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new InvalidWallpaperAssetError(
      'This browser cannot decompress the wallpaper',
    );
  }

  try {
    return await collectStream(
      createByteStream(bytes).pipeThrough(new DecompressionStream('gzip')),
    );
  } catch (error) {
    throw new InvalidWallpaperAssetError(
      error instanceof Error
        ? error.message
        : 'Wallpaper gzip decompression failed',
    );
  }
}

export function parseWallpaperAsset(value: unknown): LocalWallpaperAssetV1 {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isWallpaperAssetId(value.assetId) ||
    !isWallpaperMimeType(value.mimeType) ||
    (value.encoding !== 'base64' && value.encoding !== 'gzip-base64') ||
    !Number.isInteger(value.originalByteLength) ||
    (value.originalByteLength as number) < 0 ||
    !Number.isInteger(value.storedByteLength) ||
    (value.storedByteLength as number) < 0 ||
    typeof value.data !== 'string'
  ) {
    throw new InvalidWallpaperAssetError();
  }

  return value as unknown as LocalWallpaperAssetV1;
}

export async function encodeWallpaperAsset(
  assetId: string,
  mimeType: WallpaperMimeType,
  bytes: Uint8Array,
  thresholdBytes = WALLPAPER_COMPRESSION_THRESHOLD_BYTES,
): Promise<LocalWallpaperAssetV1> {
  if (
    !isWallpaperAssetId(assetId) ||
    !isWallpaperMimeType(mimeType) ||
    !Number.isInteger(thresholdBytes) ||
    thresholdBytes < 0
  ) {
    throw new InvalidWallpaperAssetError();
  }

  let storedBytes = bytes;
  let encoding: LocalWallpaperAssetV1['encoding'] = 'base64';

  if (
    bytes.byteLength > thresholdBytes &&
    typeof CompressionStream !== 'undefined'
  ) {
    try {
      const compressedBytes = await gzipBytes(bytes);

      if (compressedBytes.byteLength <= thresholdBytes) {
        storedBytes = compressedBytes;
        encoding = 'gzip-base64';
      }
    } catch {
      storedBytes = bytes;
    }
  }

  return {
    version: 1,
    assetId,
    mimeType,
    encoding,
    originalByteLength: bytes.byteLength,
    storedByteLength: storedBytes.byteLength,
    data: bytesToBase64(storedBytes),
  };
}

export async function decodeWallpaperAsset(
  value: LocalWallpaperAssetV1,
): Promise<Uint8Array> {
  const asset = parseWallpaperAsset(value);
  const storedBytes = base64ToBytes(asset.data);

  if (storedBytes.byteLength !== asset.storedByteLength) {
    throw new InvalidWallpaperAssetError(
      'Wallpaper stored byte length does not match its data',
    );
  }

  const originalBytes =
    asset.encoding === 'gzip-base64'
      ? await gunzipBytes(storedBytes)
      : storedBytes;

  if (originalBytes.byteLength !== asset.originalByteLength) {
    throw new InvalidWallpaperAssetError(
      'Wallpaper original byte length does not match its data',
    );
  }

  return originalBytes;
}
