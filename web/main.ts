import { browser } from './browser';

async function start() {
  if (!navigator.locks) {
    throw new Error('Откройте приложение через localhost или HTTPS');
  }
  // Keep shared session data while any app window is alive. A new browser
  // session discards stale Undo image leases, including after a crash.
  await navigator.locks.request('chrome-start-page-web-init', async () => {
    const state = await navigator.locks.query();
    if (
      !state.held?.some((lock) => lock.name === 'chrome-start-page-web-session')
    ) {
      await browser.storage.session.clear();
    }
    await new Promise<void>((resolve, reject) => {
      void navigator.locks
        .request('chrome-start-page-web-session', { mode: 'shared' }, () => {
          resolve();
          return new Promise<void>(() => {
            // Released by the browser when the document is destroyed.
          });
        })
        .catch(reject);
    });
  });
  await import('../entrypoints/newtab/main');
}

void start().catch((error: unknown) => {
  console.error(error);
  const root = document.getElementById('root');
  if (root) {
    root.textContent =
      'Не удалось запустить приложение: ' +
      (error instanceof Error ? error.message : 'неизвестная ошибка');
  }
});
