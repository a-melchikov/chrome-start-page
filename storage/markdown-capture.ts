import {
  formatBrowserCapture,
  type BrowserCapture,
} from '../widgets/markdown/browser-capture';
import { appendQuickAddEntry } from '../widgets/markdown/quick-add';
import { createMarkdownWidgetWithTemplate } from '../widgets/markdown/templates';
import {
  loadDashboardConfig,
  saveDashboardConfig,
  withDashboardWriteLock,
} from './dashboard-storage';

export interface CaptureTarget {
  workspaceId: string;
  widgetId: string | null;
}

export async function saveBrowserCapture(
  target: CaptureTarget,
  capture: BrowserCapture,
): Promise<{ workspaceName: string; noteTitle: string }> {
  const entry = formatBrowserCapture(capture);

  return withDashboardWriteLock(async () => {
    const config = await loadDashboardConfig();
    const workspace = config.workspaces.find(
      (item) => item.id === target.workspaceId,
    );
    if (!workspace)
      throw new Error('Рабочее пространство удалено. Откройте меню заново');

    const existing = workspace.widgets.find(
      (item) => item.id === target.widgetId,
    );
    if (target.widgetId && existing?.type !== 'markdown') {
      throw new Error('Заметка удалена. Выберите другую заметку в меню');
    }

    const note =
      existing?.type === 'markdown'
        ? { ...existing, content: appendQuickAddEntry(existing.content, entry) }
        : {
            ...createMarkdownWidgetWithTemplate(crypto.randomUUID(), 0),
            title: capture.pageTitle?.trim().slice(0, 120) || 'Сохранённое',
            content: appendQuickAddEntry('', entry),
            layout: {
              x: 0,
              y: workspace.widgets.reduce(
                (bottom, widget) =>
                  Math.max(bottom, widget.layout.y + widget.layout.h),
                0,
              ),
              w: 4,
              h: 3,
            },
          };

    await saveDashboardConfig({
      ...config,
      workspaces: config.workspaces.map((item) =>
        item.id === workspace.id
          ? {
              ...item,
              widgets: existing
                ? item.widgets.map((widget) =>
                    widget.id === note.id ? note : widget,
                  )
                : [...item.widgets, note],
            }
          : item,
      ),
    });
    return {
      workspaceName: workspace.name,
      noteTitle: note.title?.trim() || 'Заметка без названия',
    };
  });
}
