import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  buildCaptureMenus,
  captureTargetMenuId,
  createCaptureMenuUpdater,
  handleCaptureMenuClick,
} from '../../capture/context-menus';
import {
  readStoredDashboardConfig,
  saveDashboardConfig,
} from '../../storage/dashboard-storage';
import { createDefaultDashboardConfig } from '../../storage/defaults';

describe('capture context menus', () => {
  beforeEach(() => fakeBrowser.reset());
  afterEach(() => vi.restoreAllMocks());

  it('offers a new note in every workspace and only Markdown as existing targets', () => {
    const config = createDefaultDashboardConfig();
    const menus = buildCaptureMenus(config);
    expect(menus.filter((menu) => menu.title === 'Новая заметка')).toHaveLength(
      2,
    );
    expect(menus.some((menu) => menu.title === 'Задачи')).toBe(true);
    expect(menus.some((menu) => menu.title === 'Помодоро')).toBe(false);
    expect(
      menus.every(
        (menu) =>
          menu.contexts?.includes('selection') &&
          menu.contexts.includes('link'),
      ),
    ).toBe(true);
  });

  it('updates targets after renames, skips content-only changes, and rebuilds on worker restart', async () => {
    const config = createDefaultDashboardConfig();
    await saveDashboardConfig(config);
    const remove = vi
      .spyOn(fakeBrowser.contextMenus, 'removeAll')
      .mockResolvedValue(undefined);
    vi.spyOn(fakeBrowser.contextMenus, 'create').mockImplementation(
      (item, callback) => {
        callback?.();
        return item.id ?? 'generated';
      },
    );
    const update = createCaptureMenuUpdater();
    await update();
    const note = config.workspaces[1]!.widgets.find(
      (widget) => widget.type === 'markdown',
    )!;
    note.content = 'Изменён только текст';
    await saveDashboardConfig(config);
    await update();
    expect(remove).toHaveBeenCalledTimes(1);
    note.title = 'Новое название';
    await saveDashboardConfig(config);
    await update();
    expect(remove).toHaveBeenCalledTimes(2);
    await createCaptureMenuUpdater()();
    expect(remove).toHaveBeenCalledTimes(3);
  });

  it('retries menu creation after a platform failure', async () => {
    await saveDashboardConfig(createDefaultDashboardConfig());
    vi.spyOn(fakeBrowser.contextMenus, 'removeAll')
      .mockResolvedValue(undefined)
      .mockRejectedValueOnce(new Error('Ошибка меню'));
    vi.spyOn(fakeBrowser.contextMenus, 'create').mockImplementation(
      (item, callback) => {
        callback?.();
        return item.id ?? 'generated';
      },
    );
    const update = createCaptureMenuUpdater();
    await expect(update()).rejects.toThrow('Ошибка меню');
    await expect(update()).resolves.toBeUndefined();
  });

  it('saves a clicked page and reports success only after persistence', async () => {
    const config = createDefaultDashboardConfig();
    await saveDashboardConfig(config);
    const notify = vi.spyOn(fakeBrowser.notifications, 'create');
    await handleCaptureMenuClick(
      {
        menuItemId: captureTargetMenuId({
          workspaceId: config.workspaces[0]!.id,
          widgetId: null,
        }),
        pageUrl: 'https://example.com/',
      },
      { title: 'Материал' },
    );
    expect(
      (await readStoredDashboardConfig())?.workspaces[0]?.widgets,
    ).toHaveLength(1);
    expect(notify).toHaveBeenCalledWith(
      'capture-result',
      expect.objectContaining({
        title: 'Сохранено в заметку',
        message: 'Основной · Материал',
      }),
    );
  });

  it('reports a stale target and ignores unrelated or malformed menu IDs', async () => {
    const config = createDefaultDashboardConfig();
    await saveDashboardConfig(config);
    const notify = vi.spyOn(fakeBrowser.notifications, 'create');
    await handleCaptureMenuClick({
      menuItemId: captureTargetMenuId({
        workspaceId: 'deleted',
        widgetId: null,
      }),
      selectionText: 'Текст',
    });
    expect(notify).toHaveBeenCalledWith(
      'capture-result',
      expect.objectContaining({
        title: 'Не удалось сохранить в заметку',
        message: expect.stringContaining('пространство удалено'),
      }),
    );
    notify.mockClear();
    await handleCaptureMenuClick({
      menuItemId: 'other',
      selectionText: 'Текст',
    });
    await handleCaptureMenuClick({
      menuItemId: 'capture:target:{broken',
      selectionText: 'Текст',
    });
    expect(notify).not.toHaveBeenCalled();
    expect(await readStoredDashboardConfig()).toEqual(config);
  });

  it('reports storage failure instead of announcing success', async () => {
    const config = createDefaultDashboardConfig();
    await saveDashboardConfig(config);
    vi.spyOn(fakeBrowser.storage.local, 'set').mockRejectedValueOnce(
      new Error('Хранилище недоступно'),
    );
    const notify = vi.spyOn(fakeBrowser.notifications, 'create');
    await handleCaptureMenuClick({
      menuItemId: captureTargetMenuId({
        workspaceId: config.workspaces[0]!.id,
        widgetId: null,
      }),
      selectionText: 'Текст',
    });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      'capture-result',
      expect.objectContaining({
        title: 'Не удалось сохранить в заметку',
        message: 'Хранилище недоступно',
      }),
    );
    expect(await readStoredDashboardConfig()).toEqual(config);
  });
});
