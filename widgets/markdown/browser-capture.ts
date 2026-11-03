import { escapeMarkdownSpecialChars } from './quick-add';
import { getShortLinkLabel } from './link-label';
import { normalizeLinkUrl } from './validation';

export interface BrowserCapture {
  selectionText?: string;
  linkUrl?: string;
  pageUrl?: string;
  pageTitle?: string;
}

function escapeText(text: string): string {
  return escapeMarkdownSpecialChars(text).replace(/([<>!|&])/g, '\\$1');
}

function captureLink(url: string | undefined, label?: string): string | null {
  if (!url) return null;
  const normalized = normalizeLinkUrl(url);
  if (!normalized.valid) return null;
  return (
    '[' +
    escapeText(label?.trim() || getShortLinkLabel(normalized.href)) +
    '](<' +
    normalized.href +
    '>)'
  );
}

export function formatBrowserCapture(capture: BrowserCapture): string {
  const selection = capture.selectionText?.trim();
  if (selection) {
    const quote = selection
      .split(/\r?\n/)
      .map((line) => '> ' + escapeText(line))
      .join('\n');
    const source = captureLink(capture.pageUrl, capture.pageTitle);
    return source ? quote + '\n\nИсточник: ' + source : quote;
  }

  const link = captureLink(capture.linkUrl ?? capture.pageUrl);
  if (!link) {
    throw new Error(
      'Можно сохранить текст, HTTP/HTTPS-ссылку или локальный файл',
    );
  }
  return '- ' + link;
}
