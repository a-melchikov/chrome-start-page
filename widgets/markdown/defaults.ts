import { createMarkdownWidgetWithTemplate } from './templates';
import type { MarkdownWidgetConfig } from './types';

export function createDefaultMarkdownWidget(
  id: string,
  index: number,
): MarkdownWidgetConfig {
  return createMarkdownWidgetWithTemplate(id, index, 'blank');
}
