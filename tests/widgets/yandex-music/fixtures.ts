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
    liked: false,
    disliked: false,
    capabilities: {
      play: true,
      pause: true,
      previous: true,
      next: true,
      seek: true,
      volume: true,
      like: true,
      dislike: true,
    },
    ...overrides,
  };
}

export function standardPlayer(): void {
  document.body.innerHTML = `<section aria-labelledby="player-region">
    <h3 id="player-region">Плеер</h3><img src="https://example.com/cover.jpg" alt="Альбом" />
    <a aria-label="Трек Новый день" href="/album/10/track/20">Новый день</a>
    <a aria-label="Артист Тестовая группа" href="/artist/10">Тестовая группа</a>
    <button aria-label="Нравится" aria-pressed="false"></button><button aria-label="Не нравится" aria-pressed="false"></button>
    <button aria-label="Пауза"></button><button aria-label="Следующая песня"></button>
    <button aria-label="Предыдущая песня"></button>
    <input aria-label="Управление таймкодом" type="range" max="180" value="30" />
    <input aria-label="Управление громкостью" type="range" max="1" step="0.01" value="0.5" />
  </section>`;
}

export function vibePlayer(
  playing: boolean,
  title = 'Новый — день',
  artist = 'Группа А, Группа Б',
): void {
  const name = `${playing ? '' : `<span>${artist} —</span>`}${title}`;
  document.body.innerHTML = `<div aria-label="Моя волна">
    ${playing ? `<button aria-label="Контекстное меню с артистами">${artist}</button>` : '<span>Моя волна</span>'}
    <section aria-label="Плеер"><img src="https://example.com/cover.jpg" />
      <div><div><div aria-hidden="true">${name}</div><div>${name}</div></div>
      <span aria-hidden="true">00:30 / 03:00</span>
      <input type="range" aria-label="Управление таймкодом" max="180" value="30" /></div>
      <button aria-label="${playing ? 'Пауза' : 'Воспроизведение'}"></button>
      <button aria-label="Предыдущая песня"></button><button aria-label="Следующая песня"></button>
    </section></div>`;
}
