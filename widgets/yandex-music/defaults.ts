import type { YandexMusicWidgetConfig } from './types';

export function createDefaultYandexMusicWidget(
  id: string,
  index: number,
): YandexMusicWidgetConfig {
  return {
    id,
    type: 'yandex-music',
    layout: { x: 0, y: index * 4, w: 4, h: 4 },
  };
}
