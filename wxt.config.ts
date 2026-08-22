import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Chrome Start Page',
    version: '0.1.0',
    description: 'Custom Chrome new tab page',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    // `favicon` exposes Chrome's local _favicon endpoint. It avoids external
    // favicon services and does not require access to users' linked websites.
    permissions: ['storage', 'favicon'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
