import { describe, expect, it } from 'vitest';

import { extractMarkdownLinks } from '../../../widgets/markdown/extract-links';

describe('extractMarkdownLinks', () => {
  it('resolves full, collapsed and shortcut references while ignoring unused definitions', () => {
    expect(
      extractMarkdownLinks(
        [
          '[Полная][Docs] [Почта][] [tracker]',
          '[docs]: https://docs.example.com',
          '[почта]: https://mail.example.com',
          '[tracker]: https://tasks.example.com',
          '[unused]: https://unused.example.com',
        ].join('\n\n'),
      ),
    ).toEqual([
      { href: 'https://docs.example.com/', label: 'Полная' },
      { href: 'https://mail.example.com/', label: 'Почта' },
      { href: 'https://tasks.example.com/', label: 'tracker' },
    ]);
  });

  it('extracts Markdown, GFM and HTML links with their labels', () => {
    expect(
      extractMarkdownLinks(
        '[Работа](https://example.com)\n\n<https://openai.com>\n\n<a href="http://example.org">Пример</a>',
      ),
    ).toEqual([
      { href: 'https://example.com/', label: 'Работа' },
      { href: 'https://openai.com/', label: 'openai' },
      { href: 'http://example.org/', label: 'Пример' },
    ]);
  });

  it('uses short URL labels in extracted links and preserves custom names', () => {
    const url = 'https://mail.google.com/mail/u/0/#inbox';
    expect(
      extractMarkdownLinks(`${url}\n\n[${url}](${url})\n\n[Почта](${url})`),
    ).toEqual([
      { href: url, label: 'mail.google' },
      { href: url, label: 'mail.google' },
      { href: url, label: 'Почта' },
    ]);
  });

  it('ignores unsafe links and anchors', () => {
    expect(
      extractMarkdownLinks(
        '[Опасно](javascript:alert%281%29) [Раздел](#section) <a href="data:text/html,bad">Bad</a>',
      ),
    ).toEqual([]);
  });

  it('extracts local file links and absolute paths', () => {
    expect(
      extractMarkdownLinks(
        '[Sample document](file:///home/user/Downloads/sample.pdf)\n\n[Docs](/home/user/docs.pdf)',
      ),
    ).toEqual([
      {
        href: 'file:///home/user/Downloads/sample.pdf',
        label: 'Sample document',
      },
      {
        href: 'file:///home/user/docs.pdf',
        label: 'Docs',
      },
    ]);
  });
});
