import type { BaseWidgetConfig } from '../types';
import type { MarkdownTypography } from './typography';

export type MarkdownTemplateId =
  'blank' | 'tasks' | 'daily-plan' | 'links' | 'draft';

export interface MarkdownWidgetConfig extends BaseWidgetConfig<'markdown'> {
  content: string;
  template: MarkdownTemplateId;
  quickAddEnabled: boolean;
  hideCompletedTasks: boolean;
  showWebsiteSetButton?: boolean;
  typography?: MarkdownTypography;
}
