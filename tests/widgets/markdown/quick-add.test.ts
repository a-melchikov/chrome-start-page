import { describe, expect, it } from 'vitest';

import {
  appendQuickAddEntry,
  escapeMarkdownSpecialChars,
  formatQuickAddEntry,
} from '../../../widgets/markdown/quick-add';

describe('quick add domain logic', () => {
  describe('escapeMarkdownSpecialChars', () => {
    it('escapes formatting characters and backslashes', () => {
      expect(escapeMarkdownSpecialChars('test *bold* and _italic_')).toBe(
        'test \\*bold\\* and \\_italic\\_',
      );
      expect(escapeMarkdownSpecialChars('path\\to\\file')).toBe(
        'path\\\\to\\\\file',
      );
      expect(escapeMarkdownSpecialChars('[link](url)')).toBe(
        '\\[link\\]\\(url\\)',
      );
    });

    it('escapes leading block-level tokens', () => {
      expect(escapeMarkdownSpecialChars('# Заголовок')).toBe('\\# Заголовок');
      expect(escapeMarkdownSpecialChars('> Цитата')).toBe('\\> Цитата');
      expect(escapeMarkdownSpecialChars('- Элемент')).toBe('\\- Элемент');
      expect(escapeMarkdownSpecialChars('1. Список')).toBe('1\\. Список');
    });
  });

  describe('formatQuickAddEntry', () => {
    it('rejects empty or whitespace-only inputs', () => {
      expect(formatQuickAddEntry('blank', '')).toEqual({
        success: false,
        error: 'Запись не должна быть пустой',
      });
      expect(formatQuickAddEntry('tasks', '   ')).toEqual({
        success: false,
        error: 'Запись не должна быть пустой',
      });
    });

    it('formats checkbox tasks for tasks and daily-plan templates', () => {
      const taskResult = formatQuickAddEntry('tasks', 'Купить хлеб *срочно*');
      expect(taskResult).toEqual({
        success: true,
        entry: '- [ ] Купить хлеб \\*срочно\\*',
      });

      const planResult = formatQuickAddEntry('daily-plan', 'Созвон в 12:00');
      expect(planResult).toEqual({
        success: true,
        entry: '- [ ] Созвон в 12:00',
      });
    });

    it('formats normalized links with optional label or hostname fallback', () => {
      const withLabel = formatQuickAddEntry(
        'links',
        'https://github.com/a-melchikov GitHub Profile',
      );
      expect(withLabel).toEqual({
        success: true,
        entry: '[GitHub Profile](https://github.com/a-melchikov)',
      });

      const withoutLabel = formatQuickAddEntry(
        'links',
        'https://www.google.com/search',
      );
      expect(withoutLabel).toEqual({
        success: true,
        entry: '[www.google](https://www.google.com/search)',
      });

      const invalidUrl = formatQuickAddEntry('links', 'ftp://ftp.example.com');
      expect(invalidUrl.success).toBe(false);
    });

    it('uses the same short site label when quickly adding a bare URL', () => {
      expect(
        formatQuickAddEntry('links', 'https://mail.google.com/mail/u/0/#inbox'),
      ).toEqual({
        success: true,
        entry: '[mail.google](https://mail.google.com/mail/u/0/#inbox)',
      });
    });

    it('formats plain text for blank and draft templates', () => {
      const result = formatQuickAddEntry('blank', '# Новая заметка');
      expect(result).toEqual({
        success: true,
        entry: '\\# Новая заметка',
      });
    });
  });

  describe('appendQuickAddEntry', () => {
    it('appends to empty content', () => {
      expect(appendQuickAddEntry('', '- [ ] Задача')).toBe('- [ ] Задача\n');
      expect(appendQuickAddEntry('   ', '- [ ] Задача')).toBe('- [ ] Задача\n');
    });

    it('appends with double newline when content ends with text or single newline', () => {
      expect(appendQuickAddEntry('Привет', 'Мир')).toBe('Привет\n\nМир\n');
      expect(appendQuickAddEntry('Привет\n', 'Мир')).toBe('Привет\n\nМир\n');
    });

    it('appends cleanly when content already ends with two newlines', () => {
      expect(appendQuickAddEntry('Привет\n\n', 'Мир')).toBe('Привет\n\nМир\n');
    });
  });
});
