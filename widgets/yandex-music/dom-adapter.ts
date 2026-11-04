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

export function readMusicPlayer(doc: Document): MusicPlayer | null {
  const root = getPlayerRoot(doc);
  if (!root) return null;
  const seek = range(root, 'Управление таймкодом');
  const volume = range(root, 'Управление громкостью');
  const play = control(root, 'Воспроизведение');
  const pause = control(root, 'Пауза');
  if (!play && !pause) return null;
  const track = root.querySelector<HTMLAnchorElement>('a[aria-label^="Трек "]');
  let title = text(track);
  const vibe = root.closest('[aria-label="Моя волна"]');
  if (!title && vibe && seek?.parentElement) {
    // Vibe renders the title next to the seek input, with an aria-hidden duplicate.
    const titleArea = seek.parentElement.cloneNode(true) as HTMLElement;
    titleArea
      .querySelectorAll('input, svg, [aria-hidden="true"]')
      .forEach((el) => el.remove());
    title = text(titleArea);
  }
  const artistRoot = vibe ?? root;
  const artistMenu = artistRoot.querySelector(
    '[aria-label="Контекстное меню с артистами"]',
  );
  const artist =
    text(artistMenu) ||
    Array.from(artistRoot.querySelectorAll('a[aria-label^="Артист "]'))
      .map(text)
      .join(', ')
      .slice(0, 512);
  const image = root.querySelector<HTMLImageElement>('img');
  const artwork = safeArtwork(image?.currentSrc || image?.getAttribute('src'));
  const duration = numeric(seek?.max, 604800);
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
    capabilities: {
      play: !!title && enabled(play ?? pause),
      pause: !!title && enabled(pause ?? play),
      previous: !!title && enabled(control(root, 'Предыдущая песня')),
      next: !!title && enabled(control(root, 'Следующая песня')),
      seek: !!title && duration > 0 && enabled(seek),
      volume: enabled(volume),
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
  }
}
