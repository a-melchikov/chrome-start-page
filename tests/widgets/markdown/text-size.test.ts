import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';

import {
  applyTextSize,
  canApplyTextSize,
  remarkTextSizeDirectivePlugin,
} from '../../../widgets/markdown/text-size';

describe('text size formatting domain logic', () => {
  describe('canApplyTextSize', () => {
    it('rejects collapsed selection / caret', () => {
      const result = canApplyTextSize('Привет мир', 3, 3);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(
        'Сначала выделите слово или фразу в редакторе',
      );
    });

    it('rejects multiline selection', () => {
      const text = 'Первая строка\nВторая строка';
      const result = canApplyTextSize(text, 5, 20);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe(
        'Действие доступно только для однострочного фрагмента',
      );
    });

    it('rejects selection inside fenced code block', () => {
      const text = 'Заголовок\n```js\nconst x = 1;\n```\nТекст';
      const start = text.indexOf('const');
      const end = start + 5;
      const result = canApplyTextSize(text, start, end);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Недоступно внутри блока кода');
    });

    it('rejects selection inside inline code or with backticks', () => {
      const text = 'Используйте `console.log` в коде';
      const start = text.indexOf('console');
      const end = start + 7;
      const result = canApplyTextSize(text, start, end);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Недоступно для фрагментов с кодом');
    });

    it('rejects selection inside markdown links', () => {
      const text = 'Ссылка [Документация](https://example.com) здесь';
      const start = text.indexOf('Документ');
      const end = start + 8;
      const result = canApplyTextSize(text, start, end);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Недоступно внутри ссылок');
    });

    it('allows valid single-line phrase', () => {
      const text = 'Обычный текст для заголовка';
      const start = text.indexOf('текст для');
      const end = start + 9;
      expect(canApplyTextSize(text, start, end)).toEqual({ allowed: true });
    });
  });

  describe('applyTextSize', () => {
    it('wraps unformatted selection with directive', () => {
      const text = 'Привет мир!';
      const res = applyTextSize(text, 7, 10, 'large');
      expect(res.newText).toBe('Привет :large[мир]!');
      expect(res.newStart).toBe(7);
      expect(res.newEnd).toBe(18);
    });

    it('wraps with xlarge directive', () => {
      const text = 'Заголовок статьи';
      const res = applyTextSize(text, 0, 9, 'xlarge');
      expect(res.newText).toBe(':xlarge[Заголовок] статьи');
    });

    it('removes directive when normal size is chosen', () => {
      const text = 'Привет :large[мир]!';
      // Selection covering the full directive (indices 7 to 18)
      const res1 = applyTextSize(text, 7, 18, 'normal');
      expect(res1.newText).toBe('Привет мир!');

      // Selection inside directive (indices 14 to 17)
      const res2 = applyTextSize(text, 14, 17, 'normal');
      expect(res2.newText).toBe('Привет мир!');
    });

    it('switches directive size from large to xlarge', () => {
      const text = 'Привет :large[мир]!';
      const res = applyTextSize(text, 7, 18, 'xlarge');
      expect(res.newText).toBe('Привет :xlarge[мир]!');
    });
  });

  describe('remarkTextSizeDirectivePlugin', () => {
    it('transforms text directives to span with data-size in AST', () => {
      const processor = unified()
        .use(remarkParse)
        .use(remarkDirective)
        .use(remarkTextSizeDirectivePlugin);

      const tree = processor.parse(':large[Большой] и :xlarge[Огромный]');
      processor.runSync(tree);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paragraph = (tree as any).children[0];
      expect(paragraph.children[0]).toMatchObject({
        type: 'textDirective',
        name: 'large',
        data: {
          hName: 'span',
          hProperties: {
            'data-size': 'large',
          },
        },
      });
      expect(paragraph.children[2]).toMatchObject({
        type: 'textDirective',
        name: 'xlarge',
        data: {
          hName: 'span',
          hProperties: {
            'data-size': 'xlarge',
          },
        },
      });
    });
  });
});
