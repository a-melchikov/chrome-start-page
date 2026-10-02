import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

import {
  analyzeTaskContent,
  remarkTaskFilterPlugin,
} from '../../../widgets/markdown/task-filter';

describe('task filtering domain logic', () => {
  describe('analyzeTaskContent', () => {
    it('analyzes empty content', () => {
      expect(analyzeTaskContent('')).toEqual({
        totalTasks: 0,
        completedTasks: 0,
        hasOtherContent: false,
      });
    });

    it('counts tasks and detects other content', () => {
      const content = `## Мои дела
- [x] Сделано
- [X] Тоже сделано
- [ ] В процессе
Простой текст`;

      expect(analyzeTaskContent(content)).toEqual({
        totalTasks: 3,
        completedTasks: 2,
        hasOtherContent: true,
      });
    });

    it('reports hasOtherContent: false when only tasks and blank lines exist', () => {
      const content = `- [x] Задача 1\n\n- [x] Задача 2`;
      expect(analyzeTaskContent(content)).toEqual({
        totalTasks: 2,
        completedTasks: 2,
        hasOtherContent: false,
      });
    });
  });

  describe('remarkTaskFilterPlugin', () => {
    function processMarkdown(content: string, hideCompletedTasks: boolean) {
      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkTaskFilterPlugin, { hideCompletedTasks });

      const tree = processor.parse(content);
      return processor.runSync(tree);
    }

    it('preserves all items when hideCompletedTasks is false', () => {
      const content = `- [x] Завершено\n- [ ] Открыто`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tree = processMarkdown(content, false) as any;
      const list = tree.children[0];
      expect(list.children).toHaveLength(2);
    });

    it('filters completed tasks but keeps parent with incomplete child', () => {
      const content = `- [x] Завершена полностью
- [ ] Открыта
- [x] Родитель завершен
  - [ ] Но подзадача открыта
- [x] Родитель 2
  - [x] Подзадача 2`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tree = processMarkdown(content, true) as any;
      const list = tree.children[0];

      // Should keep:
      // 1. '- [ ] Открыта'
      // 2. '- [x] Родитель завершен' (because of incomplete subtask)
      expect(list.children).toHaveLength(2);
      expect(list.children[0].children[0].children[0].value).toBe('Открыта');
      expect(list.children[1].children[0].children[0].value).toBe(
        'Родитель завершен',
      );
      // The child of the parent should still be there
      const sublist = list.children[1].children[1];
      expect(sublist.children).toHaveLength(1);
      expect(sublist.children[0].children[0].children[0].value).toBe(
        'Но подзадача открыта',
      );
    });
  });
});
