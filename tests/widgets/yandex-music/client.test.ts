import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { createMusicClient } from '../../../widgets/yandex-music/client';
import {
  emptyMusicState,
  isMusicRequest,
} from '../../../widgets/yandex-music/types';
import { player } from './fixtures';

describe('Yandex Music shared client', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(
      async () => ({
        ...emptyMusicState('ready'),
        player: player(),
        sourceId: 10,
        sources: [{ id: 10, label: 'Музыка', playing: true }],
      }),
    );
    vi.spyOn(fakeBrowser.permissions, 'request').mockImplementation(
      async () => true,
    );
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares one polling loop between subscribers and stops it on unmount', async () => {
    const client = createMusicClient();
    const a = vi.fn();
    const b = vi.fn();
    const unsubscribeA = client.subscribe(a);
    const unsubscribeB = client.subscribe(b);
    await client.refresh();
    expect(fakeBrowser.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fakeBrowser.runtime.sendMessage).toHaveBeenCalledTimes(2);
    unsubscribeA();
    unsubscribeB();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fakeBrowser.runtime.sendMessage).toHaveBeenCalledTimes(2);
  });

  it('requests permissions synchronously from connection, handles denial and never auto-opens music', async () => {
    const client = createMusicClient();
    vi.mocked(fakeBrowser.permissions.request).mockImplementation(
      async () => false,
    );
    const connecting = client.connect();
    expect(fakeBrowser.permissions.request).toHaveBeenCalledOnce();
    await connecting;
    expect(client.getSnapshot().state.status).toBe('permission-required');
    expect(client.getSnapshot().error).toContain('не предоставлен');
    expect(fakeBrowser.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('disables stale playback if the extension disconnects or returns malformed data', async () => {
    const client = createMusicClient();
    await client.refresh();
    expect(client.getSnapshot().state.player).not.toBeNull();
    vi.mocked(fakeBrowser.runtime.sendMessage).mockImplementation(async () => ({
      invalid: true,
    }));
    await client.refresh();
    expect(client.getSnapshot().state.status).toBe('unavailable');
    expect(client.getSnapshot().state.player).toBeNull();
  });

  it('sends commands with the displayed source and refuses concurrent repeated actions', async () => {
    const client = createMusicClient();
    await client.refresh();
    const first = client.command({ type: 'next' });
    const second = client.command({ type: 'next' });
    await Promise.all([first, second]);
    const messages: unknown[] = vi
      .mocked(fakeBrowser.runtime.sendMessage)
      .mock.calls.map((call) => call[0]);
    const commands = messages
      .filter(isMusicRequest)
      .filter((message) => message.action === 'command');
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      sourceId: 10,
      command: { type: 'next' },
    });
  });

  it('clears a transient transport error after a successful refresh', async () => {
    const client = createMusicClient();
    vi.mocked(fakeBrowser.runtime.sendMessage).mockRejectedValueOnce(
      new Error('connection lost'),
    );
    await client.refresh();
    expect(client.getSnapshot().error).toContain(
      'Связь с расширением прервана',
    );
    await client.refresh();
    expect(client.getSnapshot().state.status).toBe('ready');
    expect(client.getSnapshot().error).toBeNull();
  });
});
