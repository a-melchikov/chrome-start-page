import type { LinkUrlValidationReason } from './parser-types';

interface ValidNormalizedUrl {
  valid: true;
  href: string;
}

interface InvalidNormalizedUrl {
  valid: false;
  reason: LinkUrlValidationReason;
  message: string;
}

export type NormalizedUrlResult = ValidNormalizedUrl | InvalidNormalizedUrl;

const EXPLICIT_HTTP_PROTOCOL = /^https?:\/\//i;
const URI_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const HOST_WITH_PORT = /^[^/:?#]+:\d+(?:[/?#]|$)/;

function invalid(
  reason: LinkUrlValidationReason,
  message: string,
): InvalidNormalizedUrl {
  return { valid: false, reason, message };
}

function isUnambiguousHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.includes('.') ||
    (hostname.startsWith('[') && hostname.endsWith(']'))
  );
}

export function normalizeLinkUrl(sourceUrl: string): NormalizedUrlResult {
  const value = sourceUrl.trim();

  if (!value) {
    return invalid('empty-url', 'У ссылки не указан URL.');
  }

  if (/\s/.test(value)) {
    return invalid('invalid-url', 'URL не должен содержать пробелы.');
  }

  const hasExplicitHttpProtocol = EXPLICIT_HTTP_PROTOCOL.test(value);
  const looksLikeHostWithPort = HOST_WITH_PORT.test(value);

  if (
    !hasExplicitHttpProtocol &&
    !looksLikeHostWithPort &&
    URI_SCHEME.test(value)
  ) {
    return invalid(
      'unsupported-protocol',
      'Разрешены только ссылки с протоколом http или https.',
    );
  }

  const candidate = hasExplicitHttpProtocol ? value : `https://${value}`;

  try {
    const url = new URL(candidate);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return invalid(
        'unsupported-protocol',
        'Разрешены только ссылки с протоколом http или https.',
      );
    }

    if (!url.hostname) {
      return invalid('invalid-url', 'Не удалось определить адрес сайта.');
    }

    if (!hasExplicitHttpProtocol && !isUnambiguousHostname(url.hostname)) {
      return invalid(
        'ambiguous-url',
        'Добавьте полный адрес сайта или протокол https://.',
      );
    }

    return { valid: true, href: url.href };
  } catch {
    return invalid('invalid-url', 'Указан некорректный URL.');
  }
}
