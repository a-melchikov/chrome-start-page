import { browser } from 'wxt/browser';

import {
  applyMusicCommand,
  commandConfirmed,
  readMusicPlayer,
} from './dom-adapter';
import { isMusicContentRequest, type MusicContentReply } from './types';

type MusicWindow = Window & { __startPageMusicCleanup?: () => void };

export function installMusicContentScript(): void {
  const target = window as MusicWindow;
  if (target.__startPageMusicCleanup) return;
  let watchTimeout: ReturnType<typeof setTimeout> | undefined;
  let notifyTimeout: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    if (notifyTimeout) return;
    notifyTimeout = setTimeout(() => {
      notifyTimeout = undefined;
      void browser.runtime
        .sendMessage({ type: 'yandex-music', action: 'changed' })
        .catch(() => {});
    }, 150);
  });
  const watch = () => {
    clearTimeout(watchTimeout);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'value',
        'aria-label',
        'aria-disabled',
        'disabled',
        'src',
      ],
    });
    watchTimeout = setTimeout(() => observer.disconnect(), 2500);
  };

  const listener: Parameters<
    typeof browser.runtime.onMessage.addListener
  >[0] = (message: unknown, sender) => {
    if (
      sender.id !== browser.runtime.id ||
      sender.url !== browser.runtime.getURL('/background.js') ||
      !isMusicContentRequest(message)
    )
      return;
    if (message.action === 'stop') {
      target.__startPageMusicCleanup?.();
      return Promise.resolve({ player: null, error: null });
    }
    watch();
    if (message.action === 'read')
      return Promise.resolve({
        player: readMusicPlayer(document),
        error: null,
      });
    const command = message.command;
    return (async (): Promise<MusicContentReply> => {
      try {
        const before = readMusicPlayer(document);
        if (!before)
          throw new Error(
            'Не удалось найти плеер. Откройте вкладку Яндекс.Музыки',
          );
        applyMusicCommand(document, command);
        for (let attempt = 0; attempt < 20; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const after = readMusicPlayer(document);
          if (after && commandConfirmed(command, before, after))
            return { player: after, error: null };
        }
        return {
          player: readMusicPlayer(document),
          error:
            'Яндекс.Музыка не подтвердила команду. Проверьте плеер во вкладке',
        };
      } catch (error) {
        return {
          player: readMusicPlayer(document),
          error:
            error instanceof Error
              ? error.message
              : 'Не удалось выполнить команду',
        };
      }
    })();
  };
  browser.runtime.onMessage.addListener(listener);
  target.__startPageMusicCleanup = () => {
    clearTimeout(watchTimeout);
    clearTimeout(notifyTimeout);
    observer.disconnect();
    browser.runtime.onMessage.removeListener(listener);
    delete target.__startPageMusicCleanup;
  };
}
