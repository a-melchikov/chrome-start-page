import { describe, expect, it } from 'vitest';

import {
  MARKDOWN_TEMPLATES,
  MARKDOWN_TEMPLATE_IDS,
  createMarkdownWidgetWithTemplate,
  getMarkdownTemplateDefinition,
  isMarkdownTemplateId,
} from '../../../widgets/markdown/templates';
import type { MarkdownTemplateId } from '../../../widgets/markdown/types';

describe('markdown templates', () => {
  it('defines 5 unique templates', () => {
    expect(MARKDOWN_TEMPLATES).toHaveLength(5);
    const ids = MARKDOWN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(5);
    expect(MARKDOWN_TEMPLATE_IDS).toEqual([
      'blank',
      'tasks',
      'daily-plan',
      'links',
      'draft',
    ]);
  });

  it('validates template IDs with type guard', () => {
    expect(isMarkdownTemplateId('blank')).toBe(true);
    expect(isMarkdownTemplateId('tasks')).toBe(true);
    expect(isMarkdownTemplateId('daily-plan')).toBe(true);
    expect(isMarkdownTemplateId('links')).toBe(true);
    expect(isMarkdownTemplateId('draft')).toBe(true);
    expect(isMarkdownTemplateId('unknown')).toBe(false);
    expect(isMarkdownTemplateId(null)).toBe(false);
    expect(isMarkdownTemplateId(123)).toBe(false);
  });

  it('retrieves definitions and falls back to blank for unknown ID', () => {
    const tasksDef = getMarkdownTemplateDefinition('tasks');
    expect(tasksDef.name).toBe('Задачи');
    expect(tasksDef.defaultQuickAdd).toBe(true);

    const fallbackDef = getMarkdownTemplateDefinition(
      'nonexistent' as MarkdownTemplateId,
    );
    expect(fallbackDef.id).toBe('blank');
  });

  it('creates widget config with template defaults and index layout', () => {
    const widget = createMarkdownWidgetWithTemplate('test-id', 2, 'daily-plan');
    expect(widget).toEqual({
      id: 'test-id',
      type: 'markdown',
      title: 'План дня',
      content: '## Главное\n\n## Заметки\n\n## Задачи\n',
      template: 'daily-plan',
      quickAddEnabled: true,
      hideCompletedTasks: false,
      showWebsiteSetButton: false,
      layout: {
        x: 0,
        y: 6,
        w: 4,
        h: 3,
      },
    });
  });
});
