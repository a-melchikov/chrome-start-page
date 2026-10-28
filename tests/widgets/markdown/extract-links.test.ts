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
      { href: 'https://openai.com/', label: 'https://openai.com' },
      { href: 'http://example.org/', label: 'Пример' },
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
        '[Go Handbook](file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf)\n\n[Docs](/home/andrey/docs.pdf)',
      ),
    ).toEqual([
      {
        href: 'file:///home/andrey/Downloads/Go_Backend_Engineering_2026_Expanded_A4.pdf',
        label: 'Go Handbook',
      },
      {
        href: 'file:///home/andrey/docs.pdf',
        label: 'Docs',
      },
    ]);
  });
});
