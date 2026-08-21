import { describe, expect, it } from 'vitest';

import { parseLinksContent } from '../../../widgets/links/parser';

describe('parseLinksContent', () => {
  it('parses a single link', () => {
    expect(parseLinksContent('[Mail](https://mail.example.com/)')).toEqual({
      model: {
        lines: [
          {
            lineNumber: 1,
            segments: [
              {
                type: 'link',
                label: 'Mail',
                href: 'https://mail.example.com/',
                sourceUrl: 'https://mail.example.com/',
              },
            ],
          },
        ],
      },
      validation: { isValid: true, issues: [] },
    });
  });

  it('keeps multiple links on the same logical line', () => {
    const result = parseLinksContent(
      '[Mail](https://mail.example.com/) [Docs](https://docs.example.com/)',
    );

    expect(result.model.lines).toHaveLength(1);
    expect(result.model.lines[0]?.segments).toEqual([
      {
        type: 'link',
        label: 'Mail',
        href: 'https://mail.example.com/',
        sourceUrl: 'https://mail.example.com/',
      },
      { type: 'text', text: ' ' },
      {
        type: 'link',
        label: 'Docs',
        href: 'https://docs.example.com/',
        sourceUrl: 'https://docs.example.com/',
      },
    ]);
  });

  it('preserves multiple lines and blank lines', () => {
    const result = parseLinksContent(
      'Рабочие ресурсы\n\n[Mail](https://mail.example.com/)\nПоследняя строка',
    );

    expect(result.model.lines).toEqual([
      {
        lineNumber: 1,
        segments: [{ type: 'text', text: 'Рабочие ресурсы' }],
      },
      { lineNumber: 2, segments: [] },
      {
        lineNumber: 3,
        segments: [
          {
            type: 'link',
            label: 'Mail',
            href: 'https://mail.example.com/',
            sourceUrl: 'https://mail.example.com/',
          },
        ],
      },
      {
        lineNumber: 4,
        segments: [{ type: 'text', text: 'Последняя строка' }],
      },
    ]);
  });

  it('keeps plain and unsupported Markdown as text', () => {
    const result = parseLinksContent('Обычный **жирный** текст');

    expect(result.model.lines[0]?.segments).toEqual([
      { type: 'text', text: 'Обычный **жирный** текст' },
    ]);
    expect(result.validation.isValid).toBe(true);
  });

  it('parses mixed text and links', () => {
    const result = parseLinksContent(
      'Открыть [GitHub](https://github.com/) или документацию',
    );

    expect(result.model.lines[0]?.segments).toEqual([
      { type: 'text', text: 'Открыть ' },
      {
        type: 'link',
        label: 'GitHub',
        href: 'https://github.com/',
        sourceUrl: 'https://github.com/',
      },
      { type: 'text', text: ' или документацию' },
    ]);
  });

  it('normalizes an unambiguous URL without a scheme', () => {
    const result = parseLinksContent('[GitHub](github.com)');

    expect(result.model.lines[0]?.segments[0]).toEqual({
      type: 'link',
      label: 'GitHub',
      href: 'https://github.com/',
      sourceUrl: 'github.com',
    });
    expect(result.validation.isValid).toBe(true);
  });

  it('reports a recognized link with an invalid URL', () => {
    const result = parseLinksContent('Ссылка: [Broken](not a url)');

    expect(result.model.lines[0]?.segments).toEqual([
      { type: 'text', text: 'Ссылка: ' },
      {
        type: 'invalid-link',
        label: 'Broken',
        source: '[Broken](not a url)',
        sourceUrl: 'not a url',
      },
    ]);
    expect(result.validation).toEqual({
      isValid: false,
      issues: [
        {
          code: 'invalid-link-url',
          reason: 'invalid-url',
          line: 1,
          column: 9,
          label: 'Broken',
          sourceUrl: 'not a url',
          message: 'URL не должен содержать пробелы.',
        },
      ],
    });
  });

  it('returns an empty model for empty content', () => {
    expect(parseLinksContent('')).toEqual({
      model: { lines: [] },
      validation: { isValid: true, issues: [] },
    });
  });

  it('supports escaped and special characters in a link', () => {
    const result = parseLinksContent(
      String.raw`[Docs \[API\]](https://example.com/a_\(b\)?x=1&y=2)`,
    );

    expect(result.model.lines[0]?.segments[0]).toEqual({
      type: 'link',
      label: 'Docs [API]',
      href: 'https://example.com/a_(b)?x=1&y=2',
      sourceUrl: 'https://example.com/a_(b)?x=1&y=2',
    });
  });

  it('keeps HTML-like input as text and rejects script protocols', () => {
    const result = parseLinksContent(
      '<script>alert("xss")</script> [Run](javascript:alert(1))',
    );

    expect(result.model.lines[0]?.segments[0]).toEqual({
      type: 'text',
      text: '<script>alert("xss")</script> ',
    });
    expect(result.model.lines[0]?.segments[1]).toEqual({
      type: 'invalid-link',
      label: 'Run',
      source: '[Run](javascript:alert(1))',
      sourceUrl: 'javascript:alert(1)',
    });
    expect(result.validation.issues[0]?.reason).toBe('unsupported-protocol');
    expect(
      result.model.lines
        .flatMap((line) => line.segments)
        .some(
          (segment) =>
            segment.type === 'link' && segment.href.startsWith('javascript:'),
        ),
    ).toBe(false);
  });

  it('does not crash on malformed Markdown around a valid link', () => {
    const result = parseLinksContent(
      '[unfinished]( text [Docs](https://docs.example.com/)',
    );

    expect(result.model.lines[0]?.segments).toEqual([
      { type: 'text', text: '[unfinished]( text ' },
      {
        type: 'link',
        label: 'Docs',
        href: 'https://docs.example.com/',
        sourceUrl: 'https://docs.example.com/',
      },
    ]);
  });
});
