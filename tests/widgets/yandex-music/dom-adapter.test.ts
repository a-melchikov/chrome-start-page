import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyMusicCommand,
  commandConfirmed,
  readMusicPlayer,
} from '../../../widgets/yandex-music/dom-adapter';
import {
  isMusicCommand,
  isMusicContentReply,
  MUSIC_PROTOCOL_VERSION,
  isMusicContentRequest,
  isMusicPlayer,
  isMusicRequest,
  isMusicState,
  isMusicUrl,
  emptyMusicState,
  safeArtwork,
} from '../../../widgets/yandex-music/types';
import { player, standardPlayer, vibePlayer } from './fixtures';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Yandex Music DOM adapter', () => {
  it('reads reactions, sets explicit desired values once and confirms actual changes', () => {
    standardPlayer();
    const like = document.querySelector('button[aria-label="Нравится"]')!;
    const dislike = document.querySelector('button[aria-label="Не нравится"]')!;
    const before = readMusicPlayer(document)!;
    const click = vi.fn(() =>
      like.setAttribute(
        'aria-pressed',
        like.getAttribute('aria-pressed') === 'true' ? 'false' : 'true',
      ),
    );
    like.addEventListener('click', click);
    applyMusicCommand(document, { type: 'like', value: true });
    applyMusicCommand(document, { type: 'like', value: true });
    expect(click).toHaveBeenCalledOnce();
    expect(readMusicPlayer(document)?.liked).toBe(true);
    expect(
      commandConfirmed(
        { type: 'like', value: true },
        before,
        readMusicPlayer(document)!,
      ),
    ).toBe(true);
    applyMusicCommand(document, { type: 'like', value: false });
    expect(readMusicPlayer(document)?.liked).toBe(false);
    expect(
      commandConfirmed(
        { type: 'like', value: true },
        before,
        readMusicPlayer(document)!,
      ),
    ).toBe(false);
    dislike.setAttribute('aria-disabled', 'true');
    expect(readMusicPlayer(document)?.capabilities.dislike).toBe(false);
    expect(() =>
      applyMusicCommand(document, { type: 'dislike', value: true }),
    ).toThrow('недоступна');
    dislike.removeAttribute('aria-disabled');
    dislike.addEventListener('click', () =>
      dislike.setAttribute('aria-pressed', 'true'),
    );
    applyMusicCommand(document, { type: 'dislike', value: true });
    expect(
      commandConfirmed(
        { type: 'dislike', value: true },
        before,
        readMusicPlayer(document)!,
      ),
    ).toBe(true);
    expect(
      commandConfirmed(
        { type: 'dislike', value: true },
        before,
        player({ trackKey: 'next-track' }),
      ),
    ).toBe(true);
    like.removeAttribute('aria-pressed');
    expect(readMusicPlayer(document)?.capabilities.like).toBe(false);
  });
  it('reads a paused Vibe player on the first read without merging the artist prefix into its title', () => {
    vibePlayer(false);
    expect(readMusicPlayer(document)).toMatchObject({
      title: 'Новый — день',
      artist: 'Группа А, Группа Б',
      playing: false,
    });
  });

  it('preserves Vibe identity through pause/resume and reads a different track while paused', () => {
    vibePlayer(true);
    const playing = readMusicPlayer(document)!;
    vibePlayer(false);
    expect(readMusicPlayer(document)).toEqual({ ...playing, playing: false });
    vibePlayer(true);
    expect(readMusicPlayer(document)).toEqual(playing);
    vibePlayer(false, 'Другой трек', 'Другой артист');
    expect(readMusicPlayer(document)).toMatchObject({
      title: 'Другой трек',
      artist: 'Другой артист',
      playing: false,
    });
    expect(readMusicPlayer(document)?.trackKey).not.toBe(playing.trackKey);
  });

  it('ignores hidden artist and track duplicates in the standard player in both playback states', () => {
    standardPlayer();
    const root = document.querySelector('section')!;
    root.insertAdjacentHTML(
      'afterbegin',
      '<a aria-label="Трек Скрытый" aria-hidden="true">Скрытый</a><a aria-label="Артист Скрытый" hidden>Скрытый</a>',
    );
    expect(readMusicPlayer(document)).toEqual(player());
    root
      .querySelector('[aria-label="Пауза"]')!
      .setAttribute('aria-label', 'Воспроизведение');
    expect(readMusicPlayer(document)).toEqual(player({ playing: false }));
  });
  it('reads the standard player without page internals or generated class names', () => {
    standardPlayer();
    expect(readMusicPlayer(document)).toEqual(player());
  });

  it('reads Vibe title without hidden duplicates and supports several artists', () => {
    document.body.innerHTML = `<div aria-label="Моя волна"><button aria-label="Контекстное меню с артистами">Группа А, Группа Б</button>
      <section aria-label="Плеер"><img src="https://example.com/art.png" />
      <div><div aria-hidden="true">Свет</div><div>Свет</div><span aria-hidden="true">00:02 / 03:00</span>
      <input type="range" aria-label="Управление таймкодом" max="180" value="2" /></div>
      <button aria-label="Воспроизведение"></button><button aria-label="Предыдущая песня" aria-disabled="true"></button>
      <input type="range" aria-label="Управление громкостью" max="1" value="0.3" step="0.01" /></section></div>`;
    expect(readMusicPlayer(document)).toMatchObject({
      title: 'Свет',
      artist: 'Группа А, Группа Б',
      playing: false,
      position: 2,
      capabilities: { next: false, previous: false, seek: true },
    });
  });

  it('distinguishes missing, empty and unsupported players', () => {
    expect(readMusicPlayer(document)).toBeNull();
    document.body.innerHTML =
      '<section aria-label="Плеер"><button aria-label="Воспроизведение"></button></section>';
    expect(readMusicPlayer(document)).toMatchObject({
      title: '',
      capabilities: { play: false, seek: false },
    });
    document.body.innerHTML =
      '<section aria-label="Плеер">Новая разметка</section>';
    expect(readMusicPlayer(document)).toBeNull();
  });

  it('ignores hidden players and controls outside the player', () => {
    standardPlayer();
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<div hidden><section aria-label="Плеер"><button aria-label="Пауза"></button></section></div><button aria-label="Следующая песня" id="outside"></button>',
    );
    const outside = vi.fn();
    document.getElementById('outside')!.addEventListener('click', outside);
    applyMusicCommand(document, { type: 'next' });
    expect(outside).not.toHaveBeenCalled();
    expect(readMusicPlayer(document)?.title).toBe('Новый день');
  });

  it('honours disabled and aria-disabled commands', () => {
    standardPlayer();
    const previous = document.querySelector(
      'button[aria-label="Предыдущая песня"]',
    )!;
    previous.setAttribute('aria-disabled', 'true');
    expect(readMusicPlayer(document)?.capabilities.previous).toBe(false);
    expect(() => applyMusicCommand(document, { type: 'previous' })).toThrow(
      'недоступна',
    );
  });

  it('applies ranges through native setters and bubbling events and rejects an invalid seek', () => {
    standardPlayer();
    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Управление таймкодом"]',
    )!;
    const change = vi.fn();
    document.body.addEventListener('change', change, { once: true });
    applyMusicCommand(document, { type: 'seek', value: 70 });
    applyMusicCommand(document, { type: 'volume', value: 0.2 });
    expect(input.value).toBe('70');
    expect(readMusicPlayer(document)?.volume).toBe(0.2);
    expect(change).toHaveBeenCalledOnce();
    expect(() =>
      applyMusicCommand(document, { type: 'seek', value: 1000 }),
    ).toThrow('длительность');
  });

  it('makes explicit play and pause idempotent and sends previous/next once', () => {
    standardPlayer();
    const pause = vi.fn();
    const next = vi.fn();
    document
      .querySelector('button[aria-label="Пауза"]')!
      .addEventListener('click', pause);
    document
      .querySelector('button[aria-label="Следующая песня"]')!
      .addEventListener('click', next);
    applyMusicCommand(document, { type: 'play' });
    applyMusicCommand(document, { type: 'pause' });
    applyMusicCommand(document, { type: 'next' });
    expect(pause).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
  });

  it('confirms outcomes rather than accepting a dispatched event as success', () => {
    const before = player();
    expect(commandConfirmed({ type: 'pause' }, before, before)).toBe(false);
    expect(
      commandConfirmed({ type: 'pause' }, before, player({ playing: false })),
    ).toBe(true);
    expect(commandConfirmed({ type: 'next' }, before, before)).toBe(false);
    expect(
      commandConfirmed({ type: 'next' }, before, player({ trackKey: 'other' })),
    ).toBe(true);
    expect(
      commandConfirmed({ type: 'previous' }, before, player({ position: 0 })),
    ).toBe(true);
    expect(
      commandConfirmed(
        { type: 'seek', value: 80 },
        before,
        player({ position: 80 }),
      ),
    ).toBe(true);
  });
});

describe('Yandex Music boundary validation', () => {
  it('validates reaction commands and accepts old snapshots without guessing reaction state', () => {
    expect(isMusicCommand({ type: 'like', value: true })).toBe(true);
    expect(isMusicCommand({ type: 'dislike', value: false })).toBe(true);
    expect(isMusicCommand({ type: 'like', value: 1 })).toBe(false);
    expect(isMusicCommand({ type: 'dislike' })).toBe(false);
    const legacy = player();
    delete legacy.liked;
    delete legacy.disliked;
    delete legacy.capabilities.like;
    delete legacy.capabilities.dislike;
    expect(isMusicPlayer(legacy)).toBe(true);
    expect(
      isMusicPlayer({
        ...legacy,
        capabilities: { ...legacy.capabilities, like: true },
      }),
    ).toBe(false);
    expect(isMusicPlayer({ ...player(), liked: 'yes' })).toBe(false);
    expect(
      isMusicPlayer({
        ...player(),
        capabilities: { ...player().capabilities, dislike: 1 },
      }),
    ).toBe(false);
  });
  it('accepts only the exact HTTPS music origin', () => {
    expect(isMusicUrl('https://music.yandex.ru/album/10')).toBe(true);
    for (const url of [
      'https://music.yandex.ru.example.com/',
      'https://example.com/music.yandex.ru',
      'http://music.yandex.ru/',
      'https://user:password@music.yandex.ru/',
      'file:///music.yandex.ru',
    ])
      expect(isMusicUrl(url)).toBe(false);
  });

  it('rejects malformed commands and messages', () => {
    for (const command of [
      { type: 'seek', value: NaN },
      { type: 'seek', value: -1 },
      { type: 'volume', value: 2 },
      { type: 'volume', value: Infinity },
      { type: 'eval', value: 'code' },
      null,
    ])
      expect(isMusicCommand(command)).toBe(false);
    expect(
      isMusicRequest({
        type: 'yandex-music',
        action: 'command',
        sourceId: -1,
        command: { type: 'play' },
      }),
    ).toBe(false);
    expect(
      isMusicContentRequest({
        type: 'yandex-music:content',
        action: 'command',
        command: { type: 'volume', value: 0.5 },
      }),
    ).toBe(true);
    expect(isMusicContentReply({ player: player(), error: null })).toBe(true);
    expect(
      isMusicContentReply({
        protocolVersion: MUSIC_PROTOCOL_VERSION,
        player: player(),
        error: null,
      }),
    ).toBe(true);
    expect(
      isMusicContentReply({
        protocolVersion: 'current',
        player: player(),
        error: null,
      }),
    ).toBe(false);
    expect(isMusicPlayer({ ...player(), title: 'x'.repeat(513) })).toBe(false);
    expect(
      isMusicState({
        ...emptyMusicState('ready'),
        player: { ...player(), volume: -1 },
      }),
    ).toBe(false);
  });

  it('permits HTTPS artwork without embedded credentials', () => {
    expect(safeArtwork('https://example.com/cover.jpg')).toBe(
      'https://example.com/cover.jpg',
    );
    expect(safeArtwork('javascript:alert(1)')).toBeNull();
    expect(
      safeArtwork('https://user:password@example.com/cover.jpg'),
    ).toBeNull();
  });
});
