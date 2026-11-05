import { storage } from '#imports';
import { browser } from 'wxt/browser';

import {
  MUSIC_MATCH,
  MUSIC_ORIGIN,
  MUSIC_PROTOCOL_VERSION,
  MUSIC_SCRIPT_FILE,
  MUSIC_SCRIPT_ID,
  emptyMusicState,
  isMusicContentReply,
  isMusicRequest,
  isMusicSelection,
  isMusicUrl,
  type MusicContentReply,
  type MusicContentRequest,
  type MusicPlayer,
  type MusicRequest,
  type MusicSelection,
  type MusicState,
} from './types';

const SELECTION_KEY = 'session:yandex-music-selection' as const;
const PERMISSIONS = {
  permissions: ['scripting'] as ['scripting'],
  origins: [MUSIC_MATCH],
};

interface Candidate {
  id: number;
  label: string;
  lastAccessed: number;
  player: MusicPlayer | null;
  error: string | null;
}

export function chooseMusicSource(
  candidates: readonly Candidate[],
  selection: MusicSelection,
): Candidate | undefined {
  if (selection.mode === 'manual') {
    const selected = candidates.find((tab) => tab.id === selection.tabId);
    if (selected) return selected;
  }
  return [...candidates].sort(
    (a, b) =>
      Number(!!b.player?.playing) - Number(!!a.player?.playing) ||
      b.lastAccessed - a.lastAccessed ||
      a.id - b.id,
  )[0];
}

async function bounded<T>(
  promise: Promise<T>,
  milliseconds = 2500,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Связь с плеером прервана')),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function invalidate(): void {
  void browser.runtime
    .sendMessage({ type: 'yandex-music:invalidate' })
    .catch(() => {});
}

export function createMusicCoordinator() {
  let registration: Promise<void> | undefined;
  let reading: Promise<MusicState> | undefined;
  let opening: Promise<void> | undefined;
  let commandQueue: Promise<unknown> = Promise.resolve();

  const hasPermission = () => browser.permissions.contains(PERMISSIONS);

  const ensureRegistration = async () => {
    registration ??= (async () => {
      const registered = await browser.scripting.getRegisteredContentScripts({
        ids: [MUSIC_SCRIPT_ID],
      });
      if (!registered.length)
        await browser.scripting.registerContentScripts([
          {
            id: MUSIC_SCRIPT_ID,
            matches: [MUSIC_MATCH],
            js: [MUSIC_SCRIPT_FILE],
            runAt: 'document_idle',
            allFrames: false,
            world: 'ISOLATED',
            persistAcrossSessions: true,
          },
        ]);
    })().finally(() => {
      registration = undefined;
    });
    return registration;
  };

  const readSelection = async (): Promise<MusicSelection> => {
    const value = await storage.getItem<unknown>(SELECTION_KEY);
    return isMusicSelection(value) ? value : { mode: 'auto' };
  };

  const sendContent = async (
    tabId: number,
    request: MusicContentRequest,
  ): Promise<MusicContentReply> => {
    const reply: unknown = await bounded(
      browser.tabs.sendMessage(tabId, request, { frameId: 0 }),
    );
    if (!isMusicContentReply(reply))
      throw new Error('Ответ плеера не поддерживается');
    return reply;
  };

  const readTab = async (tabId: number): Promise<MusicContentReply> => {
    try {
      const reply = await sendContent(tabId, {
        type: 'yandex-music:content',
        action: 'read',
      });
      if (reply.protocolVersion === MUSIC_PROTOCOL_VERSION) return reply;
    } catch {
      // No receiver, invalid reply, or a receiver from an older build.
    }
    const tab = await browser.tabs.get(tabId);
    if (!isMusicUrl(tab.url)) throw new Error('Вкладка Яндекс.Музыки закрыта');
    await browser.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      files: [MUSIC_SCRIPT_FILE],
      world: 'ISOLATED',
    });
    const reply = await sendContent(tabId, {
      type: 'yandex-music:content',
      action: 'read',
    });
    if (reply.protocolVersion !== MUSIC_PROTOCOL_VERSION)
      throw new Error(
        'Скрипт плеера не обновился. Обновите вкладку Яндекс.Музыки',
      );
    return reply;
  };

  const readState = async (): Promise<MusicState> => {
    if (!(await hasPermission())) return emptyMusicState('permission-required');
    await ensureRegistration();
    const selection = await readSelection();
    const tabs = (await browser.tabs.query({ url: [MUSIC_MATCH] })).filter(
      (tab) => tab.id !== undefined && isMusicUrl(tab.url),
    );
    const candidates: Candidate[] = await Promise.all(
      tabs.map(async (tab) => {
        let result: MusicContentReply;
        try {
          result = await readTab(tab.id!);
        } catch {
          result = {
            player: null,
            error:
              'Не удалось подключиться к плееру. Откройте вкладку Музыки или повторите подключение',
          };
        }
        return {
          id: tab.id!,
          label: (result.player?.title || tab.title || 'Яндекс.Музыка').slice(
            0,
            512,
          ),
          lastAccessed: tab.lastAccessed ?? 0,
          ...result,
        };
      }),
    );
    let resolvedSelection = selection;
    if (
      selection.mode === 'manual' &&
      !candidates.some((tab) => tab.id === selection.tabId)
    ) {
      resolvedSelection = { mode: 'auto' };
      await storage.setItem(SELECTION_KEY, resolvedSelection);
    }
    const source = chooseMusicSource(candidates, resolvedSelection);
    const state = emptyMusicState(
      source
        ? source.player
          ? source.player.title
            ? 'ready'
            : 'no-track'
          : 'unavailable'
        : 'no-tabs',
    );
    state.selection = resolvedSelection;
    state.sources = candidates.map((tab) => ({
      id: tab.id,
      label: tab.label,
      playing: !!tab.player?.playing,
    }));
    state.sourceId = source?.id ?? null;
    state.player = source?.player ?? null;
    state.error =
      source?.error ??
      (source && !source.player
        ? 'Плеер не найден. Откройте Яндекс.Музыку и проверьте страницу'
        : null);
    return state;
  };

  const getState = (): Promise<MusicState> => {
    reading ??= readState()
      .catch(() => ({
        ...emptyMusicState('unavailable'),
        error: 'Не удалось подключиться к Яндекс.Музыке. Повторите подключение',
      }))
      .finally(() => {
        reading = undefined;
      });
    return reading;
  };

  const open = async () => {
    if (opening) return opening;
    opening = (async () => {
      const state = await getState();
      if (state.sourceId !== null) {
        const tab = await browser.tabs.get(state.sourceId);
        if (!isMusicUrl(tab.url))
          throw new Error('Источник изменился. Повторите открытие');
        await browser.tabs.update(state.sourceId, { active: true });
        if (tab.windowId !== undefined)
          await browser.windows.update(tab.windowId, { focused: true });
      } else {
        await browser.tabs.create({ url: `${MUSIC_ORIGIN}/`, active: true });
      }
    })().finally(() => {
      opening = undefined;
    });
    return opening;
  };

  const disconnect = async () => {
    if (await hasPermission()) {
      const tabs = await browser.tabs.query({ url: [MUSIC_MATCH] });
      await Promise.allSettled(
        tabs
          .filter((tab) => tab.id !== undefined && isMusicUrl(tab.url))
          .map((tab) =>
            sendContent(tab.id!, {
              type: 'yandex-music:content',
              action: 'stop',
            }),
          ),
      );
      await browser.scripting.unregisterContentScripts({
        ids: [MUSIC_SCRIPT_ID],
      });
    }
    await browser.permissions.remove(PERMISSIONS);
    await storage.removeItem(SELECTION_KEY);
    invalidate();
  };

  const handle = async (
    request: Exclude<MusicRequest, { action: 'changed' }>,
  ): Promise<MusicState> => {
    try {
      // Let an earlier snapshot finish before changing its source or permissions.
      if (request.action !== 'state') await reading;
      if (request.action === 'disconnect') {
        await disconnect();
      } else if (request.action === 'open') {
        await open();
      } else if (request.action === 'select') {
        if (!(await hasPermission()))
          return emptyMusicState('permission-required');
        if (request.selection.mode === 'manual') {
          const tab = await browser.tabs.get(request.selection.tabId);
          if (!isMusicUrl(tab.url))
            throw new Error('Выбранная вкладка уже закрыта');
        }
        await storage.setItem(SELECTION_KEY, request.selection);
        invalidate();
      } else if (request.action === 'command') {
        const perform = async () => {
          const state = await getState();
          if (state.status !== 'ready' || state.sourceId !== request.sourceId)
            throw new Error('Источник изменился. Проверьте выбранную вкладку');
          const tab = await browser.tabs.get(request.sourceId);
          if (!isMusicUrl(tab.url)) throw new Error('Вкладка Музыки закрыта');
          // Never retry a command: a lost reply does not mean the action failed.
          const result = await sendContent(request.sourceId, {
            type: 'yandex-music:content',
            action: 'command',
            command: request.command,
          });
          if (result.error) throw new Error(result.error);
        };
        const pending = commandQueue.then(perform);
        commandQueue = pending.catch(() => {});
        await pending;
        invalidate();
      }
      return getState();
    } catch (error) {
      return {
        ...(await getState()),
        error:
          error instanceof Error
            ? error.message.slice(0, 512)
            : 'Не удалось выполнить действие',
      };
    }
  };

  const restore = async () => {
    if (await hasPermission()) await ensureRegistration();
  };

  return { getState, handle, restore };
}

export function registerMusicIntegration(): void {
  const coordinator = createMusicCoordinator();
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (sender.id !== browser.runtime.id || !isMusicRequest(message)) return;
    if (message.action === 'changed') {
      if (
        sender.frameId === 0 &&
        sender.tab?.id !== undefined &&
        isMusicUrl(sender.url)
      )
        invalidate();
      return;
    }
    if (
      !sender.url ||
      sender.url.split(/[?#]/)[0] !== browser.runtime.getURL('/newtab.html')
    )
      return;
    return coordinator.handle(message);
  });
  browser.tabs.onRemoved.addListener(() => invalidate());
  browser.tabs.onUpdated.addListener((_tabId, change, tab) => {
    if (
      (change.status || change.url || change.audible !== undefined) &&
      isMusicUrl(tab.url)
    )
      invalidate();
  });
  browser.permissions.onAdded.addListener(() => {
    void coordinator
      .restore()
      .then(invalidate)
      .catch(() => {});
  });
  browser.permissions.onRemoved.addListener(() => {
    void browser.permissions
      .contains({ permissions: ['scripting'], origins: [MUSIC_MATCH] })
      .then((granted) => {
        if (!granted)
          return browser.scripting.unregisterContentScripts({
            ids: [MUSIC_SCRIPT_ID],
          });
      })
      .catch(() => {});
    invalidate();
  });
  browser.runtime.onStartup.addListener(() => {
    void coordinator.restore().catch(() => {});
  });
  browser.runtime.onInstalled.addListener(() => {
    void coordinator.restore().catch(() => {});
  });
  void coordinator.restore().catch(() => {});
}
