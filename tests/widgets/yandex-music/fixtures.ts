import type { MusicPlayer } from '../../../widgets/yandex-music/types';

export function player(overrides: Partial<MusicPlayer> = {}): MusicPlayer {
  return {
    title: 'Новый день',
    artist: 'Тестовая группа',
    artwork: 'https://example.com/cover.jpg',
    trackKey: '/album/10/track/20',
    playing: true,
    position: 30,
    duration: 180,
    volume: 0.5,
    capabilities: {
      play: true,
      pause: true,
      previous: true,
      next: true,
      seek: true,
      volume: true,
    },
    ...overrides,
  };
}

export function standardPlayer(): void {
  document.body.innerHTML = `<section aria-labelledby="player-region">
    <h3 id="player-region">Плеер</h3><img src="https://example.com/cover.jpg" alt="Альбом" />
    <a aria-label="Трек Новый день" href="/album/10/track/20">Новый день</a>
    <a aria-label="Артист Тестовая группа" href="/artist/10">Тестовая группа</a>
    <button aria-label="Пауза"></button><button aria-label="Следующая песня"></button>
    <button aria-label="Предыдущая песня"></button>
    <input aria-label="Управление таймкодом" type="range" max="180" value="30" />
    <input aria-label="Управление громкостью" type="range" max="1" step="0.01" value="0.5" />
  </section>`;
}
