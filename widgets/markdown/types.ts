import type { BaseWidgetConfig } from '../types';

export type MarkdownTemplateId =
  'blank' | 'tasks' | 'daily-plan' | 'links' | 'draft';

export interface MarkdownWidgetConfig extends BaseWidgetConfig<'markdown'> {
  content: string;
  template: MarkdownTemplateId;
  quickAddEnabled: boolean;
  hideCompletedTasks: boolean;
  showWebsiteSetButton?: boolean;
}
