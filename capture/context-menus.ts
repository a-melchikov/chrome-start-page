import { browser } from 'wxt/browser';

import {
  loadDashboardConfig,
  readStoredDashboardConfig,
  watchDashboardConfig,
  withDashboardWriteLock,
} from '../storage/dashboard-storage';
import {
  saveBrowserCapture,
  type CaptureTarget,
} from '../storage/markdown-capture';
import type { DashboardConfig } from '../storage/schema';
import type { BrowserCapture } from '../widgets/markdown/browser-capture';

const ROOT_MENU_ID = 'capture:root';
const TARGET_PREFIX = 'capture:target:';
type MenuItem = Parameters<typeof browser.contextMenus.create>[0];

export function captureTargetMenuId(target: CaptureTarget): string {
  return TARGET_PREFIX + JSON.stringify(target);
}

function parseCaptureTarget(menuItemId: string | number): CaptureTarget | null {
  if (typeof menuItemId !== 'string' || !menuItemId.startsWith(TARGET_PREFIX))
    return null;
  try {
    const target: unknown = JSON.parse(menuItemId.slice(TARGET_PREFIX.length));
    if (
      target &&
      typeof target === 'object' &&
      'workspaceId' in target &&
      typeof target.workspaceId === 'string' &&
      'widgetId' in target &&
      (target.widgetId === null || typeof target.widgetId === 'string')
    ) {
      return { workspaceId: target.workspaceId, widgetId: target.widgetId };
    }
  } catch {
    // Ignore unrelated or obsolete menu IDs.
  }
  return null;
}

export function buildCaptureMenus(config: DashboardConfig): MenuItem[] {
  const items: MenuItem[] = [
    {
      id: ROOT_MENU_ID,
      title: 'Сохранить в Chrome Start Page',
      contexts: ['page', 'link', 'selection'],
    },
  ];
  for (const workspace of config.workspaces) {
    const parentId = 'capture:workspace:' + workspace.id;
    items.push(
      { id: parentId, parentId: ROOT_MENU_ID, title: workspace.name },
      {
        id: captureTargetMenuId({ workspaceId: workspace.id, widgetId: null }),
        parentId,
        title: 'Новая заметка',
      },
    );
    for (const widget of workspace.widgets) {
      if (widget.type !== 'markdown') continue;
      items.push({
        id: captureTargetMenuId({
          workspaceId: workspace.id,
          widgetId: widget.id,
        }),
        parentId,
        title: widget.title?.trim() || 'Заметка без названия',
      });
    }
  }
  return items.map((item) => ({
    ...item,
    contexts: ['page', 'link', 'selection'],
  }));
}

function createMenu(item: MenuItem): Promise<void> {
  return new Promise((resolve, reject) => {
    browser.contextMenus.create(item, () => {
      const error = browser.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

export function createCaptureMenuUpdater(): () => Promise<void> {
  let signature: string | null = null;
  let queue = Promise.resolve();
  return () => {
    const next = queue
      .catch(() => undefined)
      .then(async () => {
        const config = await withDashboardWriteLock(
          async () =>
            (await readStoredDashboardConfig()) ??
            (await loadDashboardConfig()),
        );
        const items = buildCaptureMenus(config);
        const nextSignature = JSON.stringify(items);
        if (signature === nextSignature) return;
        signature = null;
        await browser.contextMenus.removeAll();
        for (const item of items) await createMenu(item);
        signature = nextSignature;
      });
    queue = next;
    return next;
  };
}

async function showCaptureNotification(
  title: string,
  message: string,
): Promise<void> {
  try {
    await browser.notifications.create('capture-result', {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icons/icon-128.png'),
      title,
      message,
    });
  } catch (error) {
    console.warn('Failed to display capture notification:', error);
  }
}

export async function handleCaptureMenuClick(
  info: Omit<BrowserCapture, 'pageTitle'> & { menuItemId: string | number },
  tab?: { title?: string },
): Promise<void> {
  const target = parseCaptureTarget(info.menuItemId);
  if (!target) return;
  try {
    const saved = await saveBrowserCapture(target, {
      ...info,
      pageTitle: tab?.title,
    });
    await showCaptureNotification(
      'Сохранено в заметку',
      saved.workspaceName + ' · ' + saved.noteTitle,
    );
  } catch (error) {
    await showCaptureNotification(
      'Не удалось сохранить в заметку',
      error instanceof Error
        ? error.message
        : 'Ошибка записи. Попробуйте ещё раз',
    );
  }
}

export function registerCaptureContextMenus(): void {
  const update = createCaptureMenuUpdater();
  const refresh = () => {
    void update().catch((error: unknown) => {
      console.warn('Failed to update capture menus:', error);
    });
  };
  browser.contextMenus.onClicked.addListener((info, tab) => {
    void handleCaptureMenuClick(info, tab);
  });
  browser.runtime.onInstalled.addListener(refresh);
  browser.runtime.onStartup.addListener(refresh);
  watchDashboardConfig(refresh, (error) => {
    console.warn('Failed to read capture targets:', error);
  });
  refresh();
}
