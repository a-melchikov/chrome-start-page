import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWebStorage } from '../../web/storage';

describe('standalone web storage', () => {
  let factory: IDBFactory;
  let databaseName: string;
  const instances: ReturnType<typeof createWebStorage>[] = [];
  const create = () => {
    const instance = createWebStorage(databaseName, factory);
    instances.push(instance);
    return instance;
  };

  beforeEach(() => {
    factory = new IDBFactory();
    databaseName = 'test-' + crypto.randomUUID();
  });
  afterEach(async () => {
    await Promise.all(instances.splice(0).map((instance) => instance.close()));
    vi.restoreAllMocks();
  });

  it('persists structured values and local assets across app instances', async () => {
    const first = create();
    const note = { content: 'Сохранённая заметка', layout: { x: 2, y: 4 } };
    const asset = { encoding: 'base64', data: 'AAAA'.repeat(1024 * 100) };
    await first.local.set({ 'dashboard-config': note, 'image-asset': asset });
    note.content = 'Изменение объекта вне хранилища';
    await first.close();
    const second = create();
    expect(await second.local.get('dashboard-config')).toEqual({
      'dashboard-config': {
        content: 'Сохранённая заметка',
        layout: { x: 2, y: 4 },
      },
    });
    expect(await second.local.get(['image-asset', 'missing'])).toEqual({
      'image-asset': asset,
    });
    expect(await second.local.get({ missing: 'fallback' })).toEqual({
      missing: 'fallback',
    });
  });

  it('notifies the source window and other windows only after writes commit', async () => {
    const first = create();
    const second = create();
    const localListener = vi.fn();
    const remoteListener = vi.fn();
    first.local.onChanged.addListener(localListener);
    second.local.onChanged.addListener(remoteListener);
    await first.local.set({ note: 'Один' });
    expect(localListener).toHaveBeenLastCalledWith({
      note: { oldValue: undefined, newValue: 'Один' },
    });
    await vi.waitFor(() => expect(remoteListener).toHaveBeenCalledTimes(1));
    expect(await second.local.get('note')).toEqual({ note: 'Один' });
    await first.local.set({ note: 'Два' });
    await vi.waitFor(() => expect(remoteListener).toHaveBeenCalledTimes(2));
    expect(remoteListener).toHaveBeenLastCalledWith({
      note: { oldValue: 'Один', newValue: 'Два' },
    });
    second.local.onChanged.removeListener(remoteListener);
    await first.local.remove('note');
    expect(localListener).toHaveBeenLastCalledWith({
      note: { oldValue: 'Два' },
    });
  });

  it('keeps session leases shared and isolated from persistent dashboard data', async () => {
    const first = create();
    const second = create();
    await first.local.set({ note: 'Сохраняется' });
    await first.session.set({ lease: ['image-a'] });
    expect(await second.session.get()).toEqual({ lease: ['image-a'] });
    await second.session.clear();
    expect(await first.session.get()).toEqual({});
    expect(await first.local.get()).toEqual({ note: 'Сохраняется' });
  });

  it('removes selected keys and clears snapshots with old-value notifications', async () => {
    const storage = create();
    await storage.local.set({ a: 1, b: 2, c: 3 });
    const listener = vi.fn();
    storage.local.onChanged.addListener(listener);
    await storage.local.remove(['a', 'missing']);
    expect(listener).toHaveBeenCalledExactlyOnceWith({ a: { oldValue: 1 } });
    await storage.local.clear();
    expect(listener).toHaveBeenLastCalledWith({
      b: { oldValue: 2 },
      c: { oldValue: 3 },
    });
    expect(await storage.local.get()).toEqual({});
  });

  it('rejects failed writes without changing saved data or announcing success', async () => {
    const storage = create();
    await storage.local.set({ note: 'Исходная версия' });
    const listener = vi.fn();
    storage.local.onChanged.addListener(listener);
    await expect(
      storage.local.set({ note: 'Не сохранять', invalid: () => undefined }),
    ).rejects.toThrow();
    expect(await storage.local.get()).toEqual({ note: 'Исходная версия' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('surfaces unavailable IndexedDB instead of falling back to ephemeral data', async () => {
    vi.spyOn(factory, 'open').mockImplementation(() => {
      throw new DOMException('Хранилище недоступно', 'SecurityError');
    });
    const storage = create();
    await expect(storage.local.get()).rejects.toThrow('Хранилище недоступно');
    // Avoid awaiting a deliberately rejected connection during teardown.
    instances.pop();
    await storage.close().catch(() => undefined);
  });
});
