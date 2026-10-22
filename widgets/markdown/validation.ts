export type UrlValidationReason =
  'empty' | 'spaces' | 'invalid' | 'unsupported-protocol';

export type UrlValidationResult =
  | { valid: true; href: string }
  | { valid: false; reason: UrlValidationReason; message: string };

const explicitSchemePattern = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const windowsPathPattern = /^[a-zA-Z]:[/\\]/;

export function normalizeLinkUrl(sourceUrl: string): UrlValidationResult {
  const value = sourceUrl.trim();

  if (!value) {
    return {
      valid: false,
      reason: 'empty',
      message: 'URL не должен быть пустым',
    };
  }

  const isLocalPath = value.startsWith('/') || windowsPathPattern.test(value);
  const isFileUrl = value.startsWith('file:');

  if (!isLocalPath && !isFileUrl && /\s/.test(value)) {
    return {
      valid: false,
      reason: 'spaces',
      message: 'URL не должен содержать пробелы',
    };
  }

  let candidate = value;

  if (isLocalPath) {
    if (value.startsWith('/')) {
      candidate = `file://${encodeURI(value)}`;
    } else {
      const normalizedWin = value.replace(/\\/g, '/');
      candidate = `file:///${encodeURI(normalizedWin)}`;
    }
  } else if (isFileUrl) {
    try {
      candidate = encodeURI(decodeURI(candidate));
    } catch {
      candidate = encodeURI(candidate);
    }
  } else {
    candidate = explicitSchemePattern.test(value) ? value : `https://${value}`;
  }

  try {
    const url = new URL(candidate);

    if (
      url.protocol !== 'http:' &&
      url.protocol !== 'https:' &&
      url.protocol !== 'file:'
    ) {
      return {
        valid: false,
        reason: 'unsupported-protocol',
        message: 'Разрешены только HTTP, HTTPS и локальные file:// ссылки',
      };
    }

    if (url.protocol === 'file:') {
      if (!url.pathname || url.pathname === '/' || url.pathname === '//') {
        return {
          valid: false,
          reason: 'invalid',
          message: 'Укажите корректный путь к файлу',
        };
      }
      return { valid: true, href: url.href };
    }

    if (!url.hostname) {
      return {
        valid: false,
        reason: 'invalid',
        message: 'Введите корректный адрес сайта',
      };
    }

    return { valid: true, href: url.href };
  } catch {
    return {
      valid: false,
      reason: 'invalid',
      message: 'Введите корректный адрес сайта',
    };
  }
}

export function normalizeImageUrl(sourceUrl: string): string | null {
  const value = sourceUrl.trim();

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
