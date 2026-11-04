import { useSyncExternalStore } from 'react';
import { browser } from 'wxt/browser';

import {
  MUSIC_MATCH,
  emptyMusicState,
  isMusicState,
  type MusicCommand,
  type MusicRequest,
  type MusicSelection,
  type MusicState,
} from './types';

export interface MusicClientSnapshot {
  state: MusicState;
  busy: boolean;
  initializing: boolean;
  error: string | null;
  notice?: string;
}

const supported = () =>
  !!browser.runtime.id && typeof browser.runtime.sendMessage === 'function';

export function createMusicClient() {
  let snapshot: MusicClientSnapshot = {
    state: emptyMusicState(supported() ? 'permission-required' : 'unsupported'),
    busy: false,
    initializing: supported(),
    error: null,
  };
  const subscribers = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;
  let inFlight: Promise<void> | undefined;
  let revision = 0;

  const publish = (next: MusicClientSnapshot) => {
    snapshot = next;
    subscribers.forEach((notify) => notify());
  };
  const sourceNotice = (state: MusicState) =>
    snapshot.state.sourceId !== null &&
    snapshot.state.sourceId !== state.sourceId
      ? state.sourceId === null
        ? 'Вкладка Музыки закрыта'
        : `Источник переключён: ${state.sources.find((source) => source.id === state.sourceId)?.label ?? 'Яндекс.Музыка'}`
      : snapshot.notice;
  const request = async (message: MusicRequest): Promise<MusicState> => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const response: unknown = await Promise.race([
        browser.runtime.sendMessage(message),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error('Расширение не ответило. Повторите подключение'),
              ),
            10000,
          );
        }),
      ]);
      if (!isMusicState(response))
        throw new Error(
          'Ответ расширения не поддерживается. Перезагрузите стартовую страницу',
        );
      return response;
    } finally {
      clearTimeout(timeout);
    }
  };
  const refresh = (): Promise<void> => {
    if (!supported() || snapshot.busy || document.visibilityState === 'hidden')
      return Promise.resolve();
    if (inFlight) return inFlight;
    const current = revision;
    inFlight = request({ type: 'yandex-music', action: 'state' })
      .then((state) => {
        if (current === revision)
          publish({
            ...snapshot,
            state,
            initializing: false,
            error: state.error,
            notice: sourceNotice(state),
          });
      })
      .catch(() => {
        if (current === revision)
          publish({
            ...snapshot,
            state: { ...snapshot.state, status: 'unavailable', player: null },
            initializing: false,
            error: 'Связь с расширением прервана. Повторите подключение',
          });
      })
      .finally(() => {
        inFlight = undefined;
      });
    return inFlight;
  };
  const listener: Parameters<
    typeof browser.runtime.onMessage.addListener
  >[0] = (message: unknown, sender) => {
    if (
      sender.id === browser.runtime.id &&
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === 'yandex-music:invalidate'
    )
      void refresh();
  };
  const visibility = () => {
    if (document.visibilityState === 'visible') void refresh();
  };

  const subscribe = (notify: () => void) => {
    subscribers.add(notify);
    if (subscribers.size === 1 && supported()) {
      browser.runtime.onMessage.addListener(listener);
      document.addEventListener('visibilitychange', visibility);
      timer = setInterval(() => {
        void refresh();
      }, 1000);
      void refresh();
    }
    return () => {
      subscribers.delete(notify);
      if (!subscribers.size && supported()) {
        clearInterval(timer);
        browser.runtime.onMessage.removeListener(listener);
        document.removeEventListener('visibilitychange', visibility);
      }
    };
  };

  const run = async (work: () => Promise<MusicState>) => {
    if (!supported() || snapshot.busy) return;
    revision++;
    publish({ ...snapshot, busy: true, error: null });
    try {
      const state = await work();
      publish({
        state,
        busy: false,
        initializing: false,
        error: state.error,
        notice: sourceNotice(state),
      });
    } catch (error) {
      publish({
        ...snapshot,
        busy: false,
        initializing: false,
        error:
          error instanceof Error
            ? error.message
            : 'Не удалось выполнить действие',
      });
    }
  };

  return {
    subscribe,
    getSnapshot: () => snapshot,
    refresh,
    connect: () =>
      run(async () => {
        // Called synchronously from the click handler to preserve Chrome's user gesture.
        const granted = await browser.permissions.request({
          permissions: ['scripting'],
          origins: [MUSIC_MATCH],
        });
        if (!granted)
          return {
            ...emptyMusicState('permission-required'),
            error:
              'Доступ не предоставлен. Подключите виджет, когда будете готовы',
          };
        return request({ type: 'yandex-music', action: 'state' });
      }),
    select: (selection: MusicSelection) =>
      run(() => request({ type: 'yandex-music', action: 'select', selection })),
    command: (command: MusicCommand) => {
      const sourceId = snapshot.state.sourceId;
      return sourceId === null
        ? Promise.resolve()
        : run(() =>
            request({
              type: 'yandex-music',
              action: 'command',
              sourceId,
              command,
            }),
          );
    },
    open: () => run(() => request({ type: 'yandex-music', action: 'open' })),
    disconnect: () =>
      run(() => request({ type: 'yandex-music', action: 'disconnect' })),
  };
}

export const musicClient = createMusicClient();

export function useMusicPlayer(active = true): MusicClientSnapshot {
  return useSyncExternalStore(
    active ? musicClient.subscribe : () => () => {},
    musicClient.getSnapshot,
  );
}
