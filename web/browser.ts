import { createWebStorage } from './storage';

export const browser = {
  storage: createWebStorage(),
  runtime: {
    // An empty extension ID also tells favicon controls to use their fallback.
    id: '',
    getURL: (path: string) => new URL(path, window.location.origin).href,
  },
  tabs: {
    getCurrent: async () => undefined,
    async create({ url }: { url: string; active?: boolean }) {
      const target = new URL(url);
      if (!['https:', 'http:'].includes(target.protocol)) {
        throw new Error('В веб-режиме поддержаны только HTTP/HTTPS-ссылки');
      }
      const opened = window.open(target.href, '_blank');
      if (!opened) throw new Error('Браузер заблокировал новое окно');
      opened.opener = null;
      return {};
    },
  },
};
