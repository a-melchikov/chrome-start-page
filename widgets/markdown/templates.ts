import type { MarkdownTemplateId, MarkdownWidgetConfig } from './types';

export interface MarkdownTemplateDefinition {
  id: MarkdownTemplateId;
  name: string;
  description: string;
  defaultTitle: string;
  defaultContent: string;
  defaultQuickAdd: boolean;
}

export const MARKDOWN_TEMPLATES: readonly MarkdownTemplateDefinition[] = [
  {
    id: 'blank',
    name: 'Пустой лист',
    description: 'Пустой заголовок и содержимое; быстрый ввод выключен.',
    defaultTitle: '',
    defaultContent: '',
    defaultQuickAdd: false,
  },
  {
    id: 'tasks',
    name: 'Задачи',
    description:
      'Заголовок «Задачи», пустой список, быстрый ввод задач включён.',
    defaultTitle: 'Задачи',
    defaultContent: '',
    defaultQuickAdd: true,
  },
  {
    id: 'daily-plan',
    name: 'План дня',
    description:
      'Статические разделы «Главное», «Заметки», «Задачи»; быстрый ввод задач включён.',
    defaultTitle: 'План дня',
    defaultContent: '## Главное\n\n## Заметки\n\n## Задачи\n',
    defaultQuickAdd: true,
  },
  {
    id: 'links',
    name: 'Ссылки',
    description: 'Заголовок «Ссылки», быстрый ввод ссылок включён.',
    defaultTitle: 'Ссылки',
    defaultContent: '',
    defaultQuickAdd: true,
  },
  {
    id: 'draft',
    name: 'Черновик',
    description:
      'Разделы «Идеи», «Материалы», «Следующие шаги», «Быстрые заметки»; быстрый ввод выключен.',
    defaultTitle: 'Черновик',
    defaultContent:
      '## Идеи\n\n## Материалы\n\n## Следующие шаги\n\n## Быстрые заметки\n',
    defaultQuickAdd: false,
  },
];

export const MARKDOWN_TEMPLATE_IDS = MARKDOWN_TEMPLATES.map((t) => t.id);

export function isMarkdownTemplateId(
  value: unknown,
): value is MarkdownTemplateId {
  return (
    typeof value === 'string' &&
    MARKDOWN_TEMPLATES.some((template) => template.id === value)
  );
}

export function getMarkdownTemplateDefinition(
  id: MarkdownTemplateId,
): MarkdownTemplateDefinition {
  const found = MARKDOWN_TEMPLATES.find((template) => template.id === id);
  return found ?? MARKDOWN_TEMPLATES[0]!;
}

const DEFAULT_MARKDOWN_WIDGET_WIDTH = 4;
const DEFAULT_MARKDOWN_WIDGET_HEIGHT = 3;

export function createMarkdownWidgetWithTemplate(
  id: string,
  index: number,
  templateId: MarkdownTemplateId = 'blank',
): MarkdownWidgetConfig {
  const template = getMarkdownTemplateDefinition(templateId);

  return {
    id,
    type: 'markdown',
    title: template.defaultTitle,
    content: template.defaultContent,
    template: template.id,
    quickAddEnabled: template.defaultQuickAdd,
    hideCompletedTasks: false,
    layout: {
      x: 0,
      y: index * DEFAULT_MARKDOWN_WIDGET_HEIGHT,
      w: DEFAULT_MARKDOWN_WIDGET_WIDTH,
      h: DEFAULT_MARKDOWN_WIDGET_HEIGHT,
    },
  };
}
