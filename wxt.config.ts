import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Chrome Start Page',
    version: '0.1.0',
    description: 'Custom Chrome new tab page',
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
