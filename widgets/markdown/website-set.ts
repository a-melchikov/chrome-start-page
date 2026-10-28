import { browser } from 'wxt/browser';

import { extractMarkdownLinks } from './extract-links';
import { normalizeLinkUrl } from './validation';

function isWebsiteUrl(href: string): boolean {
  return href.startsWith('https://') || href.startsWith('http://');
}

export function getWebsiteSetUrls(content: string): string[] {
  return [
    ...new Set(
      extractMarkdownLinks(content)
        .map((link) => link.href)
        .filter(isWebsiteUrl),
    ),
  ];
}

export interface OpenWebsiteSetResult {
  opened: number;
  failedUrls: string[];
}

export async function openWebsiteSet(
  urls: readonly string[],
): Promise<OpenWebsiteSetResult> {
  const result: OpenWebsiteSetResult = { opened: 0, failedUrls: [] };
  const visited = new Set<string>();
  for (const source of urls) {
    const normalized = normalizeLinkUrl(source);
    if (!normalized.valid || !isWebsiteUrl(normalized.href)) {
      result.failedUrls.push(source);
      continue;
    }
    if (visited.has(normalized.href)) continue;
    visited.add(normalized.href);
    try {
      await browser.tabs.create({ url: normalized.href, active: false });
      result.opened++;
    } catch {
      result.failedUrls.push(normalized.href);
    }
  }
  return result;
}
