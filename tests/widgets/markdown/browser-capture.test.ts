import { describe, expect, it } from 'vitest';

import { formatBrowserCapture } from '../../../widgets/markdown/browser-capture';
import { extractMarkdownLinks } from '../../../widgets/markdown/extract-links';
import {
  extractMarkdownSearchText,
  createSearchSnippet,
} from '../../../widgets/markdown/search-text';

describe('browser capture formatting', () => {
  it('uses a short site label instead of the page title and preserves the full URL', () => {
    const entry = formatBrowserCapture({
      pageUrl: 'https://example.com/wiki/(test)',
      pageTitle: 'Статья [важное]',
    });
    expect(extractMarkdownLinks(entry)).toEqual([
      {
        href: 'https://example.com/wiki/(test)',
        label: 'example',
      },
    ]);
  });

  it('uses the clicked link instead of the source page', () => {
    const entry = formatBrowserCapture({
      linkUrl: 'https://target.example.com/path',
      pageUrl: 'https://source.example.com/',
      pageTitle: 'Страница с чужой ссылкой',
    });
    expect(extractMarkdownLinks(entry)).toEqual([
      {
        href: 'https://target.example.com/path',
        label: 'target.example',
      },
    ]);
  });

  it('formats the requested site link while retaining its path and fragment', () => {
    expect(
      formatBrowserCapture({
        pageUrl: 'https://opentherank.com/ru/codex-reset/#cal-2026-10',
        pageTitle: 'Трекер и календарь Codex reset',
      }),
    ).toBe(
      '- [opentherank](<https://opentherank.com/ru/codex-reset/#cal-2026-10>)',
    );
  });

  it.each([
    ['https://docs.example.ru/path?q=1#part', 'docs.example'],
    ['http://www.docs.example.org:8080/path', 'www.docs.example'],
    ['https://example.com./path', 'example'],
    ['http://127.0.0.1:5173/path', '127.0.0.1'],
    ['http://[::1]:5173/path', '[::1]'],
    ['http://localhost:5173/path', 'localhost'],
    ['file:///tmp/example.md', 'file:///tmp/example.md'],
    [
      'file://server.example.com/shared/file.md',
      'file://server.example.com/shared/file.md',
    ],
    ['https://my_site.example.com/path', 'my_site.example'],
  ])('keeps subdomains and handles non-domain addresses: %s', (url, label) => {
    const entry = formatBrowserCapture({ linkUrl: url });
    expect(extractMarkdownLinks(entry)).toEqual([{ href: url, label }]);
  });

  it('quotes multiline selection as literal text and adds the source', () => {
    const selection =
      '# Заголовок\n- [ ] **задача**\n<img src=x onerror=alert(1)>';
    const entry = formatBrowserCapture({
      selectionText: selection,
      pageUrl: 'https://example.com/',
      pageTitle: 'Источник',
    });
    expect(
      entry
        .split('\n')
        .slice(0, 3)
        .every((line) => line.startsWith('> ')),
    ).toBe(true);
    expect(entry).toContain('\\<img');
    expect(extractMarkdownSearchText(entry)).toContain(
      '# Заголовок - [ ] **задача** <img src=x onerror=alert(1)>',
    );
    expect(extractMarkdownLinks(entry)).toEqual([
      {
        href: 'https://example.com/',
        label: 'Источник',
      },
    ]);
  });

  it('keeps selection without a supported source and rejects executable links', () => {
    expect(
      formatBrowserCapture({
        selectionText: 'Текст',
        pageUrl: 'chrome://settings/',
      }),
    ).toBe('> Текст');
    expect(() =>
      formatBrowserCapture({
        linkUrl: 'javascript:alert(1)',
        pageUrl: 'https://example.com/',
      }),
    ).toThrow('Можно сохранить');
    expect(() => formatBrowserCapture({ selectionText: '   ' })).toThrow(
      'Можно сохранить',
    );
    expect(
      extractMarkdownLinks(
        formatBrowserCapture({ linkUrl: 'file:///tmp/example.md' }),
      )[0]?.href,
    ).toBe('file:///tmp/example.md');
  });
});

describe('note search text', () => {
  it('finds formatted text, code, table cells and size directives as plain text', () => {
    const text = extractMarkdownSearchText(
      '# **Важная** заметка\n\n:large[Большой текст]\n\n| A | B |\n| - | - |\n| один | два |\n\n    const answer = 42;\n\n<b>Содержимое HTML</b>',
    );
    expect(text).toContain('Важная заметка');
    expect(text).toContain('Большой текст');
    expect(text).toContain('один два');
    expect(text).toContain('const answer = 42;');
    expect(text).toContain('Содержимое HTML');
    expect(text).not.toContain('<b>');
  });

  it('centers a bounded snippet around a match far into the note', () => {
    const snippet = createSearchSnippet(
      'Начало '.repeat(50) + 'искомая фраза' + ' конец'.repeat(50),
      'искомая фраза',
    );
    expect(snippet).toContain('искомая фраза');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(142);
    expect(createSearchSnippet('', 'test')).toBe('');
  });

  it('preserves word separation at explicit Markdown line breaks', () => {
    expect(extractMarkdownSearchText('Первая  \nстрока')).toBe('Первая строка');
  });
});
