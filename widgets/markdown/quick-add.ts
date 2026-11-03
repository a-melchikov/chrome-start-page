import type { MarkdownTemplateId } from './types';
import { getShortLinkLabel } from './link-label';
import { normalizeLinkUrl } from './validation';

export function escapeMarkdownSpecialChars(text: string): string {
  // Escape backslash first
  let escaped = text.replace(/\\/g, '\\\\');
  // Escape markdown formatting characters
  escaped = escaped.replace(/([*_{}[\]()~`])/g, '\\$1');
  // Escape leading block-level markers (#, >, -, +, numbers followed by .)
  escaped = escaped.replace(/^(\s*)([#>\-+])/g, '$1\\$2');
  escaped = escaped.replace(/^(\s*)(\d+)\./g, '$1$2\\.');
  return escaped;
}

export interface QuickAddFormatResult {
  success: boolean;
  entry?: string;
  error?: string;
}

export function formatQuickAddEntry(
  template: MarkdownTemplateId,
  rawText: string,
): QuickAddFormatResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { success: false, error: 'Запись не должна быть пустой' };
  }

  if (template === 'tasks' || template === 'daily-plan') {
    return {
      success: true,
      entry: `- [ ] ${escapeMarkdownSpecialChars(trimmed)}`,
    };
  }

  if (template === 'links') {
    // Check if input has URL and optional label: e.g. "https://example.com Optional Title"
    const firstSpaceIndex = trimmed.search(/\s/);
    let urlPart: string;
    let labelPart: string | undefined;

    if (firstSpaceIndex !== -1) {
      urlPart = trimmed.slice(0, firstSpaceIndex).trim();
      labelPart = trimmed.slice(firstSpaceIndex + 1).trim();
    } else {
      urlPart = trimmed;
    }

    const normalized = normalizeLinkUrl(urlPart);
    if (!normalized.valid) {
      return { success: false, error: normalized.message };
    }

    const displayName = labelPart || getShortLinkLabel(normalized.href);

    return {
      success: true,
      entry: `[${escapeMarkdownSpecialChars(displayName)}](${normalized.href})`,
    };
  }

  return {
    success: true,
    entry: escapeMarkdownSpecialChars(trimmed),
  };
}

export function appendQuickAddEntry(content: string, entry: string): string {
  if (!content.trim()) {
    return `${entry}\n`;
  }

  if (content.endsWith('\n\n')) {
    return `${content}${entry}\n`;
  }

  if (content.endsWith('\n')) {
    return `${content}\n${entry}\n`;
  }

  return `${content}\n\n${entry}\n`;
}
