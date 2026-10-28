import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const fromRoot = (path: string) =>
  fileURLToPath(new URL('../' + path, import.meta.url));

export default defineConfig({
  root: fromRoot('web'),
  publicDir: fromRoot('public'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^#imports$/, replacement: fromRoot('web/imports.ts') },
      // WXT Storage imports the lower-level package directly.
      {
        find: /^(wxt\/browser|@wxt-dev\/browser)$/,
        replacement: fromRoot('web/browser.ts'),
      },
    ],
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: {
    outDir: fromRoot('.output/web'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 500,
  },
});
