import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  readStoredDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';
import { saveBrowserCapture } from '../../storage/markdown-capture';
import { createMarkdownWidgetWithTemplate } from '../../widgets/markdown/templates';

describe('markdown browser capture repository', () => {
  beforeEach(() => fakeBrowser.reset());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('serializes simultaneous captures under the shared dashboard write lock', async () => {
    const config = createDefaultDashboardConfig();
    config.workspaces[0]!.widgets = [
      createMarkdownWidgetWithTemplate('target', 0),
    ];
    await saveDashboardConfig(config);
    let queue = Promise.resolve();
    const request = vi.fn(
      (_name: string, operation: () => Promise<unknown>) => {
        const next = queue.then(operation);
        queue = next.then(() => undefined);
        return next;
      },
    );
    vi.stubGlobal('navigator', { locks: { request } });
    const target = {
      workspaceId: config.workspaces[0]!.id,
      widgetId: 'target',
    };
    await Promise.all([
      saveBrowserCapture(target, { selectionText: 'Первый' }),
      saveBrowserCapture(target, { selectionText: 'Второй' }),
    ]);
    const note = (await readStoredDashboardConfig())?.workspaces[0]?.widgets[0];
    expect(note?.type === 'markdown' && note.content).toContain('Первый');
    expect(note?.type === 'markdown' && note.content).toContain('Второй');
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0]?.[0]).toBe(
      'chrome-start-page-dashboard-write',
    );
  });

  it('appends to the latest saved note in an inactive workspace without switching it', async () => {
    const config = createDefaultDashboardConfig();
    const workspace = config.workspaces[1]!;
    workspace.widgets.push({
      ...createMarkdownWidgetWithTemplate('target', 0),
      title: 'Материалы',
      content: 'Существующие записи\n',
    });
    await saveDashboardConfig(config);
    await saveBrowserCapture(
      { workspaceId: workspace.id, widgetId: 'target' },
      {
        selectionText: 'Первый фрагмент',
        pageUrl: 'https://example.com/',
      },
    );
    await saveBrowserCapture(
      { workspaceId: workspace.id, widgetId: 'target' },
      {
        selectionText: 'Второй фрагмент',
      },
    );
    const saved = await readStoredDashboardConfig();
    expect(saved?.activeWorkspaceId).toBe(config.activeWorkspaceId);
    expect(saved?.workspaces[0]).toEqual(config.workspaces[0]);
    const note = saved?.workspaces[1]?.widgets.find(
      (widget) => widget.id === 'target',
    );
    expect(note?.type === 'markdown' && note.content).toContain(
      'Существующие записи\n\n> Первый фрагмент',
    );
    expect(note?.type === 'markdown' && note.content).toContain(
      '> Второй фрагмент',
    );
    expect(saved?.workspaces[1]?.appearance).toEqual(workspace.appearance);
  });

  it('creates a note below existing widgets, preserving layout and settings', async () => {
    const config = createDefaultDashboardConfig();
    const workspace = config.workspaces[1]!;
    await saveDashboardConfig(config);
    const result = await saveBrowserCapture(
      { workspaceId: workspace.id, widgetId: null },
      {
        pageUrl: 'https://example.com/',
        pageTitle: 'Новая статья',
      },
    );
    const saved = await readStoredDashboardConfig();
    expect(result).toEqual({
      workspaceName: 'Работа',
      noteTitle: 'Новая статья',
    });
    const note = saved?.workspaces[1]?.widgets.at(-1);
    expect(note).toMatchObject({
      type: 'markdown',
      title: 'Новая статья',
      layout: { x: 0, y: 5, w: 4, h: 3 },
    });
    expect(saved?.workspaces[1]?.widgets.slice(0, -1)).toEqual(
      workspace.widgets,
    );
  });

  it('does not replace data when a menu points to a deleted note or workspace', async () => {
    const config = createDefaultDashboardConfig();
    await saveDashboardConfig(config);
    await expect(
      saveBrowserCapture(
        { workspaceId: config.workspaces[0]!.id, widgetId: 'deleted' },
        { selectionText: 'Текст' },
      ),
    ).rejects.toThrow('Заметка удалена');
    await expect(
      saveBrowserCapture(
        { workspaceId: 'deleted', widgetId: null },
        { selectionText: 'Текст' },
      ),
    ).rejects.toThrow('пространство удалено');
    expect(await readStoredDashboardConfig()).toEqual(config);
  });

  it('reports a failed write without changing the previous note', async () => {
    const config = createDefaultDashboardConfig();
    await saveDashboardConfig(config);
    vi.spyOn(fakeBrowser.storage.local, 'set').mockRejectedValueOnce(
      new Error('Запись недоступна'),
    );
    await expect(
      saveBrowserCapture(
        { workspaceId: config.workspaces[0]!.id, widgetId: null },
        { selectionText: 'Текст' },
      ),
    ).rejects.toThrow('Запись недоступна');
    expect(await readStoredDashboardConfig()).toEqual(config);
  });
});
