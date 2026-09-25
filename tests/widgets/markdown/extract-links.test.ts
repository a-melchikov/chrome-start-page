import { describe, expect, it } from 'vitest';

import { extractMarkdownLinks } from '../../../widgets/markdown/extract-links';

describe('extractMarkdownLinks', () => {
  it('extracts Markdown, GFM and HTML links with their labels', () => {
    expect(
      extractMarkdownLinks(
        '[Работа](https://example.com)\n\n<https://openai.com>\n\n<a href="http://example.org">Пример</a>',
      ),
    ).toEqual([
      { href: 'https://example.com/', label: 'Работа' },
      { href: 'https://openai.com/', label: 'https://openai.com' },
      { href: 'http://example.org/', label: 'Пример' },
    ]);
  });

  it('ignores unsafe and local links', () => {
    expect(
      extractMarkdownLinks(
        '[Опасно](javascript:alert%281%29) [Раздел](#section) <a href="data:text/html,bad">Bad</a>',
      ),
    ).toEqual([]);
  });
});
