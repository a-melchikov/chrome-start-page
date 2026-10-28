import { spawn, spawnSync } from 'node:child_process';
import console from 'node:console';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const candidates = process.env.BROWSER_BIN
  ? [process.env.BROWSER_BIN]
  : [
      'google-chrome',
      'google-chrome-stable',
      'chromium',
      'chromium-browser',
      'microsoft-edge',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];
const executable = candidates.find(
  (candidate) =>
    spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0,
);
if (!executable) {
  console.error('Chrome/Chromium не найден. Укажите путь в BROWSER_BIN.');
  process.exit(1);
}

const appUrl = process.env.APP_URL;
let server;
let child;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  child?.kill('SIGTERM');
  await server?.close();
  process.exitCode = code;
}

try {
  if (appUrl && !['http:', 'https:'].includes(new URL(appUrl).protocol)) {
    throw new Error('APP_URL должен быть HTTP/HTTPS-адресом приложения');
  }
  if (!appUrl) {
    server = await createServer({
      configFile: resolve(root, 'web/vite.config.ts'),
      server: { port: Number(process.env.WEB_PORT ?? 5173) },
    });
    await server.listen();
    server.printUrls();
  }
  const url = appUrl ?? server.resolvedUrls.local[0];
  const profile = resolve(
    process.env.APP_PROFILE_DIR ?? resolve(root, '.output/web-app-profile'),
  );
  await mkdir(profile, { recursive: true });
  console.info('Окно приложения:', url);
  console.info('Отдельный профиль:', profile);
  child = spawn(
    executable,
    [
      '--app=' + url,
      '--user-data-dir=' + profile,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-mode',
      ...(process.env.APP_DEVTOOLS === '1'
        ? ['--auto-open-devtools-for-tabs']
        : []),
    ],
    { stdio: 'inherit' },
  );
  child.once('error', (error) => {
    console.error(error.message);
    void stop(1);
  });
  child.once('exit', (code) => void stop(code ?? 0));
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await stop(1);
}
