import { safeArtwork, type MusicCommand, type MusicPlayer } from './types';

const PLAYER_SELECTOR =
  '[aria-label="Плеер"], section[aria-labelledby="player-region"]';

function getPlayerRoot(doc: Document): HTMLElement | null {
  return (
    Array.from(doc.querySelectorAll<HTMLElement>(PLAYER_SELECTOR)).find(
      (el) => !el.closest('[hidden], [aria-hidden="true"]'),
    ) ?? null
  );
}

function control(root: HTMLElement, label: string): HTMLButtonElement | null {
  return root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
}

function range(root: HTMLElement, label: string): HTMLInputElement | null {
  return root.querySelector<HTMLInputElement>(
    `input[type="range"][aria-label="${label}"]`,
  );
}

function enabled(el: HTMLButtonElement | HTMLInputElement | null): boolean {
  return (
    !!el &&
    !el.disabled &&
    el.getAttribute('aria-disabled') !== 'true' &&
    el.getAttribute('data-disabled') !== 'true'
  );
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').trim().slice(0, 512);
}

function numeric(value: string | undefined, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(0, parsed)) : 0;
}

function reaction(root: HTMLElement, label: string) {
  const button = control(root, label);
  const value =
    button?.getAttribute('aria-pressed') ??
    button?.getAttribute('aria-checked');
  const selected =
    value === 'true' ? true : value === 'false' ? false : undefined;
  return {
    selected,
    available:
      selected !== undefined &&
      enabled(button) &&
      !button?.closest('[hidden], [aria-hidden="true"]'),
  };
}

function visibleText(el: Element | null | undefined): string {
  if (!el || el.closest('[hidden], [aria-hidden="true"]')) return '';
  const copy = el.cloneNode(true) as Element;
  copy
    .querySelectorAll('[hidden], [aria-hidden="true"], svg')
    .forEach((node) => node.remove());
  return text(copy);
}

function readVibeTrack(seek: HTMLInputElement | null): {
  title: string;
  artist: string;
} {
  // The visible name sits beside the seek slider. On pause its artist prefix
  // becomes a separate span; reading the entire block mixes the two fields.
  const name = Array.from(
    seek?.parentElement?.querySelectorAll('div') ?? [],
  ).find(
    (el) =>
      !el.closest('[hidden], [aria-hidden="true"]') &&
      Array.from(el.childNodes).some(
        (node) => node.nodeType === 3 && node.textContent?.trim(),
      ),
  );
  if (!name) return { title: '', artist: '' };
  const copy = name.cloneNode(true) as HTMLElement;
  copy
    .querySelectorAll('[hidden], [aria-hidden="true"], svg')
    .forEach((el) => el.remove());
  const prefix = Array.from(copy.children).find(
    (el) => el.tagName === 'SPAN' && /\s+[—–-]\s*$/.test(text(el)),
  );
  const artist = text(prefix).replace(/\s+[—–-]\s*$/, '');
  prefix?.remove();
  return { title: text(copy), artist };
}

export function readMusicPlayer(doc: Document): MusicPlayer | null {
  const root = getPlayerRoot(doc);
  if (!root) return null;
  const seek = range(root, 'Управление таймкодом');
  const volume = range(root, 'Управление громкостью');
  const play = control(root, 'Воспроизведение');
  const pause = control(root, 'Пауза');
  if (!play && !pause) return null;
  const track = Array.from(
    root.querySelectorAll<HTMLAnchorElement>('a[aria-label^="Трек "]'),
  ).find((el) => visibleText(el));
  const vibe = root.closest('[aria-label="Моя волна"]');
  const vibeTrack = vibe ? readVibeTrack(seek) : { title: '', artist: '' };
  const title = visibleText(track) || vibeTrack.title;
  const artistRoot = vibe ?? root;
  const artistMenu = artistRoot.querySelector(
    '[aria-label="Контекстное меню с артистами"]',
  );
  const artist =
    vibeTrack.artist ||
    visibleText(artistMenu) ||
    Array.from(artistRoot.querySelectorAll('a[aria-label^="Артист "]'))
      .map(visibleText)
      .filter(Boolean)
      .join(', ')
      .slice(0, 512);
  const image = root.querySelector<HTMLImageElement>('img');
  const artwork = safeArtwork(image?.currentSrc || image?.getAttribute('src'));
  const duration = numeric(seek?.max, 604800);
  const like = reaction(root, 'Нравится');
  const dislike = reaction(root, 'Не нравится');
  return {
    title,
    artist,
    artwork,
    trackKey:
      track?.getAttribute('href')?.slice(0, 3072) ??
      `${title}|${artist}|${artwork ?? ''}`.slice(0, 3072),
    playing: !!pause,
    position: numeric(seek?.value, duration),
    duration,
    volume: volume ? numeric(volume.value, 1) : 0,
    liked: like.selected,
    disliked: dislike.selected,
    capabilities: {
      play: !!title && enabled(play ?? pause),
      pause: !!title && enabled(pause ?? play),
      previous: !!title && enabled(control(root, 'Предыдущая песня')),
      next: !!title && enabled(control(root, 'Следующая песня')),
      seek: !!title && duration > 0 && enabled(seek),
      volume: enabled(volume),
      like: !!title && like.available,
      dislike: !!title && dislike.available,
    },
  };
}

export function applyMusicCommand(doc: Document, command: MusicCommand): void {
  const root = getPlayerRoot(doc);
  const player = readMusicPlayer(doc);
  if (!root || !player || !player.capabilities[command.type]) {
    throw new Error('Эта команда сейчас недоступна в Яндекс.Музыке');
  }
  if (command.type === 'play' || command.type === 'pause') {
    if ((command.type === 'play') === player.playing) return;
    control(
      root,
      command.type === 'play' ? 'Воспроизведение' : 'Пауза',
    )?.click();
  } else if (command.type === 'previous' || command.type === 'next') {
    control(
      root,
      command.type === 'previous' ? 'Предыдущая песня' : 'Следующая песня',
    )?.click();
  } else if (command.type === 'like' || command.type === 'dislike') {
    if (
      (command.type === 'like' ? player.liked : player.disliked) ===
      command.value
    )
      return;
    control(
      root,
      command.type === 'like' ? 'Нравится' : 'Не нравится',
    )?.click();
  } else if ('value' in command) {
    if (command.type === 'seek' && command.value > player.duration) {
      throw new Error('Позиция выходит за длительность трека');
    }
    const input = range(
      root,
      command.type === 'seek'
        ? 'Управление таймкодом'
        : 'Управление громкостью',
    );
    const view = doc.defaultView;
    if (!input || !view) throw new Error('Элемент управления недоступен');
    // The native setter bypasses React's value tracker in the page's world.
    Object.getOwnPropertyDescriptor(
      view.HTMLInputElement.prototype,
      'value',
    )?.set?.call(input, String(command.value));
    input.dispatchEvent(new view.Event('input', { bubbles: true }));
    input.dispatchEvent(new view.Event('change', { bubbles: true }));
  }
}

export function commandConfirmed(
  command: MusicCommand,
  before: MusicPlayer,
  after: MusicPlayer,
): boolean {
  switch (command.type) {
    case 'play':
      return after.playing;
    case 'pause':
      return !after.playing;
    case 'volume':
      return Math.abs(after.volume - command.value) < 0.015;
    case 'seek':
      return Math.abs(after.position - command.value) < 2;
    case 'next':
      return before.trackKey !== after.trackKey;
    case 'previous':
      return before.trackKey !== after.trackKey || after.position <= 2;
    case 'like':
      return after.liked === command.value;
    case 'dislike':
      return (
        after.disliked === command.value ||
        (command.value && before.trackKey !== after.trackKey)
      );
  }
}
