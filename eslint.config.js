import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['.output/**', '.wxt/**', 'node_modules/**']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,
    },
  },
  {
    files: ['components/**/*.{ts,tsx}', 'widgets/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'chrome',
          message:
            'UI components and widgets must not access chrome platform APIs directly. Use repository or hook abstractions.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'wxt/storage',
              message:
                'UI components and widgets must not access storage directly. Use hook abstractions.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/storage/**', '**/widgets/**'],
              message:
                'components/ui must remain domain-free reusable primitives.',
            },
          ],
        },
      ],
    },
  },
);
