import { describe, expect, it } from 'vitest';

import { toggleMarkdownTask } from '../../../widgets/markdown/task-list';

describe('toggleMarkdownTask', () => {
  it('toggles the marker at the supplied source offset', () => {
    const content = '- [ ] Одинаково\n- [ ] Одинаково';
    const secondItemOffset = content.lastIndexOf('- [ ]');

    expect(toggleMarkdownTask(content, secondItemOffset)).toBe(
      '- [ ] Одинаково\n- [x] Одинаково',
    );
  });

  it('supports checked, ordered, and nested task items', () => {
    expect(toggleMarkdownTask('1. [X] Готово', 0)).toBe('1. [ ] Готово');

    const nested = '- Родитель\n  - [ ] Вложенная';
    expect(toggleMarkdownTask(nested, nested.indexOf('  -'))).toBe(
      '- Родитель\n  - [x] Вложенная',
    );
  });

  it('does not alter task-like text inside fenced code or unrelated lines', () => {
    const content = '```md\n- [ ] Это код\n```\n\n- [ ] Настоящая задача';
    const codeOffset = content.indexOf('- [ ]');
    const realOffset = content.lastIndexOf('- [ ]');

    expect(toggleMarkdownTask(content, 0)).toBe(content);
    expect(toggleMarkdownTask(content, realOffset)).toBe(
      '```md\n- [ ] Это код\n```\n\n- [x] Настоящая задача',
    );
    expect(codeOffset).not.toBe(realOffset);
  });
});
