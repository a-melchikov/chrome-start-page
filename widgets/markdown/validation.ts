export type UrlValidationReason =
  'empty' | 'spaces' | 'invalid' | 'unsupported-protocol';

export type UrlValidationResult =
  | { valid: true; href: string }
  | { valid: false; reason: UrlValidationReason; message: string };

const explicitSchemePattern = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

export function normalizeLinkUrl(sourceUrl: string): UrlValidationResult {
  const value = sourceUrl.trim();

  if (!value) {
    return {
      valid: false,
      reason: 'empty',
      message: 'URL не должен быть пустым',
    };
  }

  if (/\s/.test(value)) {
    return {
      valid: false,
      reason: 'spaces',
      message: 'URL не должен содержать пробелы',
    };
  }

  const candidate = explicitSchemePattern.test(value)
    ? value
    : `https://${value}`;

  try {
    const url = new URL(candidate);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {
        valid: false,
        reason: 'unsupported-protocol',
        message: 'Разрешены только HTTP и HTTPS ссылки',
      };
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
