import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { storage } from 'wxt/utils/storage';

import {
  chooseMusicSource,
  createMusicCoordinator,
  registerMusicIntegration,
} from '../../../widgets/yandex-music/background';
import {
  MUSIC_MATCH,
  MUSIC_PROTOCOL_VERSION,
  MUSIC_SCRIPT_FILE,
  isMusicContentRequest,
  type MusicSelection,
} from '../../../widgets/yandex-music/types';
import { player } from './fixtures';

describe('Yandex Music coordinator', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.spyOn(fakeBrowser.permissions, 'contains').mockImplementation(
      async () => true,
    );
    vi.spyOn(
      fakeBrowser.scripting,
      'getRegisteredContentScripts',
    ).mockImplementation(async () => []);
    vi.spyOn(
      fakeBrowser.scripting,
      'registerContentScripts',
    ).mockResolvedValue();
    vi.spyOn(
      fakeBrowser.scripting,
      'unregisterContentScripts',
    ).mockResolvedValue();
    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockResolvedValue(undefined);
    vi.spyOn(fakeBrowser.tabs, 'sendMessage').mockImplementation(async () => ({
      protocolVersion: MUSIC_PROTOCOL_VERSION,
      player: player(),
      error: null,
    }));
    vi.spyOn(fakeBrowser.permissions.onAdded, 'addListener').mockImplementation(
      () => {},
    );
    vi.spyOn(
      fakeBrowser.permissions.onRemoved,
      'addListener',
    ).mockImplementation(() => {});
  });

  async function addTab(label = 'Музыка') {
    const tab = await fakeBrowser.tabs.create({
      url: 'https://music.yandex.ru/',
    });
    return { ...tab, title: label, lastAccessed: 1 };
  }

  it('does not query or inject without optional permission', async () => {
    vi.mocked(fakeBrowser.permissions.contains).mockImplementation(
      async () => false,
    );
    const query = vi.spyOn(fakeBrowser.tabs, 'query');
    expect((await createMusicCoordinator().getState()).status).toBe(
      'permission-required',
    );
    expect(query).not.toHaveBeenCalled();
    expect(fakeBrowser.scripting.registerContentScripts).not.toHaveBeenCalled();
  });

  it('selects playing, then recently active, then stable ID and honours a manual source', () => {
    const candidates = [
      {
        id: 2,
        label: 'A',
        lastAccessed: 10,
        player: player({ playing: false }),
        error: null,
      },
      { id: 3, label: 'B', lastAccessed: 1, player: player(), error: null },
    ];
    expect(chooseMusicSource(candidates, { mode: 'auto' })?.id).toBe(3);
    expect(
      chooseMusicSource(candidates, { mode: 'manual', tabId: 2 })?.id,
    ).toBe(2);
    candidates[1]!.player.playing = false;
    expect(chooseMusicSource(candidates, { mode: 'auto' })?.id).toBe(2);
    candidates[1]!.lastAccessed = 10;
    expect(chooseMusicSource(candidates.reverse(), { mode: 'auto' })?.id).toBe(
      2,
    );
  });

  it('restores manual selection in a new coordinator and resets a closed source to auto', async () => {
    const a = await addTab();
    const b = await addTab();
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [a, b]);
    const coordinator = createMusicCoordinator();
    await coordinator.handle({
      type: 'yandex-music',
      action: 'select',
      selection: { mode: 'manual', tabId: b.id! },
    });
    expect((await createMusicCoordinator().getState()).sourceId).toBe(b.id);
    vi.mocked(fakeBrowser.tabs.query).mockImplementation(async () => [a]);
    const state = await coordinator.getState();
    expect(state.selection).toEqual({ mode: 'auto' });
    expect(state.sourceId).toBe(a.id);
    expect(
      await storage.getItem<MusicSelection>('session:yandex-music-selection'),
    ).toEqual({ mode: 'auto' });
    expect(await storage.getItem('local:dashboard-config')).toBeNull();
  });

  it('injects into an already open tab once when no receiver exists', async () => {
    const tab = await addTab();
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [tab]);
    const inject = vi
      .spyOn(fakeBrowser.scripting, 'executeScript')
      .mockImplementation(async () => []);
    vi.mocked(fakeBrowser.tabs.sendMessage).mockRejectedValueOnce(
      new Error('no receiver'),
    );
    expect((await createMusicCoordinator().getState()).status).toBe('ready');
    expect(inject).toHaveBeenCalledWith({
      target: { tabId: tab.id, frameIds: [0] },
      files: [MUSIC_SCRIPT_FILE],
      world: 'ISOLATED',
    });
    expect(fakeBrowser.scripting.registerContentScripts).toHaveBeenCalledWith([
      expect.objectContaining({
        matches: [MUSIC_MATCH],
        world: 'ISOLATED',
        allFrames: false,
      }),
    ]);
  });

  it('upgrades a still-responsive legacy receiver and restores reaction capabilities without reloading the tab', async () => {
    const tab = await addTab();
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [tab]);
    const legacyPlayer = player();
    delete legacyPlayer.liked;
    delete legacyPlayer.disliked;
    delete legacyPlayer.capabilities.like;
    delete legacyPlayer.capabilities.dislike;
    let upgraded = false;
    vi.mocked(fakeBrowser.tabs.sendMessage).mockImplementation(async () =>
      upgraded
        ? {
            protocolVersion: MUSIC_PROTOCOL_VERSION,
            player: player(),
            error: null,
          }
        : { player: legacyPlayer, error: null },
    );
    const inject = vi
      .spyOn(fakeBrowser.scripting, 'executeScript')
      .mockImplementation(async () => {
        upgraded = true;
        return [];
      });
    const coordinator = createMusicCoordinator();
    const state = await coordinator.getState();
    expect(state.status).toBe('ready');
    expect(state.player).toMatchObject({
      liked: false,
      disliked: false,
      capabilities: { like: true, dislike: true },
    });
    expect(inject).toHaveBeenCalledOnce();
    await coordinator.getState();
    expect(inject).toHaveBeenCalledOnce();
    expect(
      vi
        .mocked(fakeBrowser.tabs.sendMessage)
        .mock.calls.every(
          (call) => isMusicContentRequest(call[1]) && call[1].action === 'read',
        ),
    ).toBe(true);
  });

  it('reports unavailable if reinjection still returns an obsolete receiver', async () => {
    const tab = await addTab();
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [tab]);
    vi.mocked(fakeBrowser.tabs.sendMessage).mockImplementation(async () => ({
      player: player(),
      error: null,
    }));
    const inject = vi
      .spyOn(fakeBrowser.scripting, 'executeScript')
      .mockImplementation(async () => []);
    expect((await createMusicCoordinator().getState()).status).toBe(
      'unavailable',
    );
    expect(inject).toHaveBeenCalledOnce();
    expect(fakeBrowser.tabs.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('does not reinject a receiver with the current protocol', async () => {
    const tab = await addTab();
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [tab]);
    const inject = vi.spyOn(fakeBrowser.scripting, 'executeScript');
    expect((await createMusicCoordinator().getState()).status).toBe('ready');
    expect(inject).not.toHaveBeenCalled();
  });

  it('rejects unsafe source changes and never retries a playback command', async () => {
    const tab = await addTab();
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [tab]);
    const coordinator = createMusicCoordinator();
    const mismatch = await coordinator.handle({
      type: 'yandex-music',
      action: 'command',
      sourceId: tab.id! + 1,
      command: { type: 'next' },
    });
    expect(mismatch.error).toContain('Источник изменился');
    vi.mocked(fakeBrowser.tabs.sendMessage).mockImplementation(
      async (_tabId, message) => {
        if (isMusicContentRequest(message) && message.action === 'command')
          throw new Error('reply lost');
        return {
          protocolVersion: MUSIC_PROTOCOL_VERSION,
          player: player(),
          error: null,
        };
      },
    );
    const failed = await coordinator.handle({
      type: 'yandex-music',
      action: 'command',
      sourceId: tab.id!,
      command: { type: 'next' },
    });
    expect(failed.error).toContain('reply lost');
    expect(
      vi
        .mocked(fakeBrowser.tabs.sendMessage)
        .mock.calls.filter(
          (call) =>
            isMusicContentRequest(call[1]) && call[1].action === 'command',
        ),
    ).toHaveLength(1);
  });

  it('opens one active music tab for concurrent requests and then reuses it', async () => {
    // fake-browser compares URL patterns literally; Chrome supports match patterns.
    const listTabs = fakeBrowser.tabs.query.bind(fakeBrowser.tabs);
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () =>
      listTabs({}),
    );
    const coordinator = createMusicCoordinator();
    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    await Promise.all([
      coordinator.handle({ type: 'yandex-music', action: 'open' }),
      coordinator.handle({ type: 'yandex-music', action: 'open' }),
    ]);
    expect(create).toHaveBeenCalledTimes(1);
    await coordinator.handle({ type: 'yandex-music', action: 'open' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('stops observation, unregisters and removes access on disconnect', async () => {
    const tab = await addTab();
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [tab]);
    vi.spyOn(fakeBrowser.permissions, 'remove').mockImplementation(async () => {
      vi.mocked(fakeBrowser.permissions.contains).mockImplementation(
        async () => false,
      );
      return true;
    });
    const state = await createMusicCoordinator().handle({
      type: 'yandex-music',
      action: 'disconnect',
    });
    expect(fakeBrowser.tabs.sendMessage).toHaveBeenCalledWith(
      tab.id,
      { type: 'yandex-music:content', action: 'stop' },
      { frameId: 0 },
    );
    expect(fakeBrowser.scripting.unregisterContentScripts).toHaveBeenCalled();
    expect(fakeBrowser.permissions.remove).toHaveBeenCalledWith({
      permissions: ['scripting'],
      origins: [MUSIC_MATCH],
    });
    expect(state.status).toBe('permission-required');
  });

  it('exposes unsupported markup and corrupted replies as unavailable', async () => {
    const tab = await addTab();
    vi.spyOn(fakeBrowser.tabs, 'query').mockImplementation(async () => [tab]);
    vi.mocked(fakeBrowser.tabs.sendMessage).mockImplementation(async () => ({
      protocolVersion: MUSIC_PROTOCOL_VERSION,
      player: null,
      error: null,
    }));
    expect((await createMusicCoordinator().getState()).status).toBe(
      'unavailable',
    );
    vi.mocked(fakeBrowser.tabs.sendMessage).mockImplementation(async () => ({
      player: { title: 'bad' },
      error: null,
    }));
    vi.spyOn(fakeBrowser.scripting, 'executeScript').mockImplementation(
      async () => [],
    );
    expect((await createMusicCoordinator().getState()).status).toBe(
      'unavailable',
    );
  });

  it('ignores page requests and invalid messages at the background boundary', () => {
    const added = vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener');
    registerMusicIntegration();
    const listener = added.mock.calls[0]![0];
    expect(
      listener(
        { type: 'yandex-music', action: 'disconnect' },
        { id: fakeBrowser.runtime.id, url: 'https://example.com/newtab.html' },
        vi.fn(),
      ),
    ).toBeUndefined();
    expect(
      listener(
        { type: 'yandex-music', action: 'open' },
        {
          id: 'another-extension',
          url: fakeBrowser.runtime.getURL('/newtab.html'),
        },
        vi.fn(),
      ),
    ).toBeUndefined();
    expect(
      listener(
        { type: 'yandex-music', action: 'command', command: { type: 'eval' } },
        { id: fakeBrowser.runtime.id },
        vi.fn(),
      ),
    ).toBeUndefined();
  });
});
