import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { installMusicContentScript } from '../../../widgets/yandex-music/content';
import { standardPlayer } from './fixtures';
import { MUSIC_PROTOCOL_VERSION } from '../../../widgets/yandex-music/types';

describe('Yandex Music content script', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
    vi.useFakeTimers();
    standardPlayer();
    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(
      async () => undefined,
    );
  });
  afterEach(() => {
    (
      window as Window & { __startPageMusicCleanup?: () => void }
    ).__startPageMusicCleanup?.();
    vi.useRealTimers();
  });

  function install() {
    const add = vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener');
    installMusicContentScript();
    return add.mock.calls[0]![0];
  }
  const sender = () => ({
    id: fakeBrowser.runtime.id,
    url: fakeBrowser.runtime.getURL('/background.js'),
  });

  it('accepts only its background script and validated requests', async () => {
    const listener = install();
    const request = { type: 'yandex-music:content', action: 'read' };
    expect(
      listener(
        request,
        { ...sender(), url: 'https://music.yandex.ru/' },
        vi.fn(),
      ),
    ).toBeUndefined();
    expect(
      listener(request, { ...sender(), id: 'other-extension' }, vi.fn()),
    ).toBeUndefined();
    expect(
      listener(
        {
          type: 'yandex-music:content',
          action: 'command',
          command: { type: 'volume', value: 4 },
        },
        sender(),
        vi.fn(),
      ),
    ).toBeUndefined();
    await expect(listener(request, sender(), vi.fn())).resolves.toMatchObject({
      protocolVersion: MUSIC_PROTOCOL_VERSION,
      player: { title: 'Новый день' },
      error: null,
    });
  });

  it('installs once and stops observing after its reader becomes inactive', async () => {
    const listener = install();
    installMusicContentScript();
    expect(fakeBrowser.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    await listener(
      { type: 'yandex-music:content', action: 'read' },
      sender(),
      vi.fn(),
    );
    await vi.advanceTimersByTimeAsync(2600);
    document.querySelector('a')!.textContent = 'Другой трек';
    await vi.advanceTimersByTimeAsync(200);
    expect(fakeBrowser.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('replaces an older installed listener instead of retaining its stale capabilities', async () => {
    const listener = install();
    await listener(
      { type: 'yandex-music:content', action: 'read' },
      sender(),
      vi.fn(),
    );
    const target = window as Window & { __startPageMusicVersion?: number };
    delete target.__startPageMusicVersion;
    const remove = vi.spyOn(fakeBrowser.runtime.onMessage, 'removeListener');
    installMusicContentScript();
    expect(remove).toHaveBeenCalledWith(listener);
    expect(vi.getTimerCount()).toBe(0);
    expect(fakeBrowser.runtime.onMessage.addListener).toHaveBeenCalledTimes(2);
    const replacement = vi.mocked(fakeBrowser.runtime.onMessage.addListener)
      .mock.calls[1]![0];
    await expect(
      replacement(
        { type: 'yandex-music:content', action: 'read' },
        sender(),
        vi.fn(),
      ),
    ).resolves.toMatchObject({
      protocolVersion: MUSIC_PROTOCOL_VERSION,
      player: { capabilities: { like: true, dislike: true } },
    });
  });

  it('installs when the previous extension context can no longer run its cleanup', () => {
    const target = window as Window & {
      __startPageMusicCleanup?: () => void;
      __startPageMusicVersion?: number;
    };
    target.__startPageMusicCleanup = vi.fn(() => {
      throw new Error('Extension context invalidated');
    });
    target.__startPageMusicVersion = 1;
    expect(() => install()).not.toThrow();
    expect(target.__startPageMusicVersion).toBe(MUSIC_PROTOCOL_VERSION);
  });

  it('confirms a command and does not claim success when the page ignores it', async () => {
    const listener = install();
    const pause = document.querySelector('button[aria-label="Пауза"]')!;
    pause.addEventListener(
      'click',
      () => pause.setAttribute('aria-label', 'Воспроизведение'),
      { once: true },
    );
    const result = listener(
      {
        type: 'yandex-music:content',
        action: 'command',
        command: { type: 'pause' },
      },
      sender(),
      vi.fn(),
    );
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toMatchObject({
      player: { playing: false },
      error: null,
    });
    const ignored = listener(
      {
        type: 'yandex-music:content',
        action: 'command',
        command: { type: 'next' },
      },
      sender(),
      vi.fn(),
    );
    await vi.advanceTimersByTimeAsync(2100);
    await expect(ignored).resolves.toMatchObject({
      error: expect.stringContaining('не подтвердила'),
    });
  });

  it('confirms a reaction command and observes reaction changes made in the service', async () => {
    const listener = install();
    const like = document.querySelector('button[aria-label="Нравится"]')!;
    like.addEventListener('click', () =>
      like.setAttribute('aria-pressed', 'true'),
    );
    const result = listener(
      {
        type: 'yandex-music:content',
        action: 'command',
        command: { type: 'like', value: true },
      },
      sender(),
      vi.fn(),
    );
    await vi.advanceTimersByTimeAsync(200);
    await expect(result).resolves.toMatchObject({
      player: { liked: true },
      error: null,
    });
    vi.mocked(fakeBrowser.runtime.sendMessage).mockClear();
    like.setAttribute('aria-pressed', 'false');
    await vi.advanceTimersByTimeAsync(200);
    expect(fakeBrowser.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'yandex-music',
      action: 'changed',
    });
  });

  it('fully removes listeners and observation on disconnect', async () => {
    const listener = install();
    const remove = vi.spyOn(fakeBrowser.runtime.onMessage, 'removeListener');
    await listener(
      { type: 'yandex-music:content', action: 'read' },
      sender(),
      vi.fn(),
    );
    await listener(
      { type: 'yandex-music:content', action: 'stop' },
      sender(),
      vi.fn(),
    );
    expect(remove).toHaveBeenCalledWith(listener);
    expect(vi.getTimerCount()).toBe(0);
    expect(
      (window as Window & { __startPageMusicCleanup?: () => void })
        .__startPageMusicCleanup,
    ).toBeUndefined();
  });
});
