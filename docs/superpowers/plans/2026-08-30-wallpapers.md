# Wallpaper Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить сохраняемые обои новой вкладки из локального изображения или HTTPS URL с безопасной заменой, lossless-хранением и цветовой подложкой.

**Architecture:** Конфиг версии 3 хранит дискриминированный источник обоев, а локальные байты лежат в отдельных WXT Storage items и не участвуют в обычных сохранениях виджетов. Отдельные модули отвечают за проверку изображений, lossless gzip/base64 codec и транзакции config/asset; React получает только проверенный URL или временный Blob URL.

**Tech Stack:** WXT 0.21 Storage, Manifest V3, React 19, strict TypeScript, Tailwind CSS 4, Vitest, React Testing Library.

---

## Карта файлов

- `storage/schema.ts` — persisted-схема v3 и `WallpaperConfig`.
- `storage/defaults.ts` — источник `none` по умолчанию.
- `storage/migrations.ts` — runtime-валидация и миграции v1/v2 → v3.
- `storage/wallpaper-codec.ts` — MIME-типы, asset payload, base64 и gzip.
- `storage/wallpaper-assets.ts` — WXT-ключи, чтение, запись, удаление и очистка orphaned assets.
- `storage/wallpaper-transactions.ts` — безопасные local/URL/none переходы между config и asset.
- `wallpaper/image-validation.ts` — сигнатуры локальных форматов и проверка браузерного декодирования/HTTPS URL.
- `hooks/use-dashboard-config.ts` — сериализация wallpaper-транзакций с существующей очередью записей.
- `hooks/use-wallpaper-image.ts` — загрузка активного локального asset и жизненный цикл Blob URL.
- `components/dashboard/WallpaperLayer.tsx` — декоративный cover-слой.
- `components/dashboard/AppearanceDialog.tsx` — выбор файла, URL, предпросмотр, удаление и ошибки.
- `components/dashboard/DashboardControls.tsx`, `components/dashboard/Dashboard.tsx`, `entrypoints/newtab/App.tsx` — передача wallpaper state/actions и композиция слоя.
- `wxt.config.ts` — разрешение `unlimitedStorage`.
- `tests/storage/*`, `tests/wallpaper/*`, `tests/hooks/*`, `tests/components/*` — focused unit/integration coverage.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROJECT_CONTEXT.md`, `docs/CURRENT_STATE.md` — актуальное поведение и durable decisions.

### Task 1: Схема v3, defaults и миграции

**Files:**

- Modify: `storage/schema.ts`
- Modify: `storage/defaults.ts`
- Modify: `storage/migrations.ts`
- Modify: `tests/storage/defaults.test.ts`
- Modify: `tests/storage/migrations.test.ts`
- Modify: `tests/storage/dashboard-storage.test.ts`
- Modify: `tests/components/App.test.tsx`
- Modify: `tests/components/markdown-widget-editing.test.tsx`
- Modify: `tests/hooks/use-dashboard-config.test.tsx`

- [ ] **Step 1: Написать падающие тесты миграции и валидации**

Добавить в `tests/storage/migrations.test.ts` проверки:

```ts
it('migrates a v2 dashboard to v3 with no wallpaper', () => {
  const legacy = {
    version: 2,
    widgets: [],
    appearance: { theme: 'dark', backgroundColor: '#123456' },
  } as const;

  expect(migrateDashboardConfig(legacy)).toEqual({
    version: 3,
    widgets: [],
    appearance: {
      theme: 'dark',
      backgroundColor: '#123456',
      wallpaper: { type: 'none' },
    },
  });
});

it.each([
  { type: 'url', url: 'http://example.com/wallpaper.jpg' },
  { type: 'url', url: 'not a url' },
  { type: 'local', assetId: 'not-a-uuid' },
  { type: 'unknown' },
])('rejects invalid wallpaper config %#', (wallpaper) => {
  expect(() =>
    migrateDashboardConfig({
      ...createDefaultDashboardConfig(),
      appearance: {
        ...createDefaultDashboardConfig().appearance,
        wallpaper,
      },
    }),
  ).toThrow(InvalidDashboardConfigError);
});
```

Обновить default test, чтобы он ожидал `wallpaper: { type: 'none' }`, и оставить
v1/v2 fixtures без нового поля как реальные legacy-данные.

- [ ] **Step 2: Запустить focused storage tests и подтвердить RED**

Run:

```bash
corepack pnpm test tests/storage/defaults.test.ts tests/storage/migrations.test.ts tests/storage/dashboard-storage.test.ts
```

Expected: FAIL — текущая версия равна 2, а `wallpaper` отсутствует.

- [ ] **Step 3: Добавить типы v3 и default**

В `storage/schema.ts` определить:

```ts
export const DASHBOARD_CONFIG_VERSION = 3 as const;

export type WallpaperConfig =
  | { type: 'none' }
  | { type: 'url'; url: string }
  | { type: 'local'; assetId: string };

export interface AppearanceConfig {
  theme: Theme;
  backgroundColor: string;
  wallpaper: WallpaperConfig;
}

export function isWallpaperAssetId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}
```

В `storage/defaults.ts` расширить значение:

```ts
export const DEFAULT_APPEARANCE: Readonly<AppearanceConfig> = {
  theme: 'system',
  backgroundColor: '#18181b',
  wallpaper: { type: 'none' },
};
```

Создавать вложенный wallpaper заново, чтобы два default-конфига не разделяли
мутабельный объект:

```ts
appearance: {
  ...DEFAULT_APPEARANCE,
  wallpaper: { ...DEFAULT_APPEARANCE.wallpaper },
},
```

- [ ] **Step 4: Реализовать строгую v3-валидацию и последовательную миграцию**

В `storage/migrations.ts` добавить helpers:

```ts
function isAbsoluteHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
}

function isWallpaperConfig(value: unknown): value is WallpaperConfig {
  if (!isRecord(value)) return false;
  if (value.type === 'none') return true;
  if (value.type === 'url') return isAbsoluteHttpsUrl(value.url);
  return value.type === 'local' && isWallpaperAssetId(value.assetId);
}
```

Разделить legacy envelope (`theme` + `backgroundColor`) и v3 appearance
(`theme` + `backgroundColor` + `wallpaper`). `migrateDashboardConfig` должен
принимать v1, v2 и v3, всегда возвращать v3 и сохранять существующую
нормализацию Search height.

- [ ] **Step 5: Обновить current fixtures до v3**

Во всех typed `DashboardConfig` fixtures заменить `version: 2` на `version: 3`
и добавить:

```ts
wallpaper: { type: 'none' },
```

Не менять fixtures, которые намеренно проверяют миграцию v1/v2.

- [ ] **Step 6: Запустить storage и существующие React tests**

Run:

```bash
corepack pnpm test tests/storage tests/components/App.test.tsx tests/components/markdown-widget-editing.test.tsx tests/hooks/use-dashboard-config.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add storage/schema.ts storage/defaults.ts storage/migrations.ts tests
git commit -m "feat(storage): add wallpaper config schema"
```

### Task 2: Lossless asset codec

**Files:**

- Create: `storage/wallpaper-codec.ts`
- Create: `tests/storage/wallpaper-codec.test.ts`

- [ ] **Step 1: Написать failing codec tests**

Создать `tests/storage/wallpaper-codec.test.ts` с тремя независимыми ветвями:

```ts
const id = 'f7f44d0c-550a-4c1a-99c7-1e285dfba3fd';

it('keeps files at or below the threshold byte-for-byte', async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const asset = await encodeWallpaperAsset(id, 'image/png', bytes, 4);

  expect(asset.encoding).toBe('base64');
  await expect(decodeWallpaperAsset(asset)).resolves.toEqual(bytes);
});

it('stores a useful gzip result and restores the original bytes', async () => {
  const bytes = new TextEncoder().encode('a'.repeat(256));
  const asset = await encodeWallpaperAsset(id, 'image/svg+xml', bytes, 64);

  expect(asset.encoding).toBe('gzip-base64');
  expect(asset.storedByteLength).toBeLessThanOrEqual(64);
  await expect(decodeWallpaperAsset(asset)).resolves.toEqual(bytes);
});

it('falls back to the original when gzip stays above the threshold', async () => {
  const bytes = crypto.getRandomValues(new Uint8Array(512));
  const asset = await encodeWallpaperAsset(id, 'image/jpeg', bytes, 8);

  expect(asset.encoding).toBe('base64');
  await expect(decodeWallpaperAsset(asset)).resolves.toEqual(bytes);
});
```

Добавить случаи malformed base64, неверной длины и неизвестного encoding.

- [ ] **Step 2: Запустить тест и подтвердить RED**

Run:

```bash
corepack pnpm test tests/storage/wallpaper-codec.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Реализовать payload types и base64 helpers**

В `storage/wallpaper-codec.ts` определить:

```ts
export const WALLPAPER_COMPRESSION_THRESHOLD_BYTES = 6 * 1024 * 1024;

export const WALLPAPER_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
] as const;

export type WallpaperMimeType = (typeof WALLPAPER_MIME_TYPES)[number];

export interface LocalWallpaperAssetV1 {
  version: 1;
  assetId: string;
  mimeType: WallpaperMimeType;
  encoding: 'base64' | 'gzip-base64';
  originalByteLength: number;
  storedByteLength: number;
  data: string;
}
```

Base64 encode/decode должен работать чанками, чтобы не передавать
многомегабайтный массив одним spread-вызовом в `String.fromCharCode`.

- [ ] **Step 4: Реализовать gzip encode/decode и runtime validation**

Экспортировать точные API:

```ts
export async function encodeWallpaperAsset(
  assetId: string,
  mimeType: WallpaperMimeType,
  bytes: Uint8Array,
  thresholdBytes = WALLPAPER_COMPRESSION_THRESHOLD_BYTES,
): Promise<LocalWallpaperAssetV1>;

export function parseWallpaperAsset(value: unknown): LocalWallpaperAssetV1;

export async function decodeWallpaperAsset(
  asset: LocalWallpaperAssetV1,
): Promise<Uint8Array>;
```

`encodeWallpaperAsset` пробует `CompressionStream('gzip')` только выше порога,
использует gzip только если его размер не превышает порог и при исключении
возвращает исходные bytes. `decodeWallpaperAsset` проверяет stored length до
decompression и original length после него; несоответствие бросает
`InvalidWallpaperAssetError`.

- [ ] **Step 5: Запустить codec tests и typecheck**

Run:

```bash
corepack pnpm test tests/storage/wallpaper-codec.test.ts
corepack pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add storage/wallpaper-codec.ts tests/storage/wallpaper-codec.test.ts
git commit -m "feat(storage): add lossless wallpaper codec"
```

### Task 3: Asset repository и config-транзакции

**Files:**

- Create: `storage/wallpaper-assets.ts`
- Create: `storage/wallpaper-transactions.ts`
- Create: `tests/storage/wallpaper-assets.test.ts`
- Create: `tests/storage/wallpaper-transactions.test.ts`

- [ ] **Step 1: Написать failing repository tests**

Проверить round trip и orphan cleanup:

```ts
it('stores an asset separately from dashboard config', async () => {
  const asset = createAsset('8dc04e26-6465-4e84-bc05-633c0e28415b');
  await saveWallpaperAsset(asset);

  await expect(
    loadWallpaperAsset('8dc04e26-6465-4e84-bc05-633c0e28415b'),
  ).resolves.toEqual(asset);
  await expect(
    storage.getItem(
      'local:dashboard-wallpaper:8dc04e26-6465-4e84-bc05-633c0e28415b',
    ),
  ).resolves.toEqual(asset);
});

it('removes every orphan but preserves the active asset', async () => {
  const activeId = '8dc04e26-6465-4e84-bc05-633c0e28415b';
  const orphanId = '7af1599d-ae5f-4590-9791-bc299eb3b4db';
  await saveWallpaperAsset(createAsset(activeId));
  await saveWallpaperAsset(createAsset(orphanId));

  await cleanupOrphanedWallpaperAssets(activeId);

  await expect(loadWallpaperAsset(activeId)).resolves.toBeTruthy();
  await expect(loadWallpaperAsset(orphanId)).resolves.toBeNull();
});
```

- [ ] **Step 2: Написать failing transaction tests**

В `tests/storage/wallpaper-transactions.test.ts` покрыть local → local,
local → URL, URL → local и clear. Для rollback замокать
`saveDashboardConfig` так, чтобы он rejected, и проверить:

```ts
await expect(installLocalWallpaper(currentConfig, newAsset)).rejects.toThrow(
  'save failed',
);
await expect(loadWallpaperAsset(newAsset.assetId)).resolves.toBeNull();
await expect(loadWallpaperAsset(oldAsset.assetId)).resolves.toEqual(oldAsset);
```

Отдельный тест заставляет удаление old asset завершиться ошибкой и ожидает
успешный `config` плюс непустой `warning`.

- [ ] **Step 3: Запустить оба файла и подтвердить RED**

Run:

```bash
corepack pnpm test tests/storage/wallpaper-assets.test.ts tests/storage/wallpaper-transactions.test.ts
```

Expected: FAIL — modules do not exist.

- [ ] **Step 4: Реализовать WXT asset repository**

В `storage/wallpaper-assets.ts` экспортировать:

```ts
export const WALLPAPER_ASSET_KEY_PREFIX = 'local:dashboard-wallpaper:';

export function getWallpaperAssetKey(assetId: string): `local:${string}`;
export async function saveWallpaperAsset(
  asset: LocalWallpaperAssetV1,
): Promise<void>;
export async function loadWallpaperAsset(
  assetId: string,
): Promise<LocalWallpaperAssetV1 | null>;
export async function deleteWallpaperAsset(assetId: string): Promise<void>;
export async function cleanupOrphanedWallpaperAssets(
  activeAssetId: string | null,
): Promise<void>;
```

Для cleanup использовать `storage.snapshot('local')`; snapshot возвращает ключи
без префикса `local:`. Удалять только ключи, начинающиеся с
`dashboard-wallpaper:`, кроме активного. Не трогать `dashboard-config` и чужие
ключи. `getWallpaperAssetKey` и `parseWallpaperAsset` используют общий
`isWallpaperAssetId`, поэтому произвольная строка не может стать asset key.

- [ ] **Step 5: Реализовать транзакции**

В `storage/wallpaper-transactions.ts` определить:

```ts
export interface WallpaperTransactionResult {
  config: DashboardConfig;
  warning: string | null;
}

export async function installLocalWallpaper(
  current: DashboardConfig,
  asset: LocalWallpaperAssetV1,
): Promise<WallpaperTransactionResult>;

export async function installUrlWallpaper(
  current: DashboardConfig,
  url: string,
): Promise<WallpaperTransactionResult>;

export async function removeWallpaper(
  current: DashboardConfig,
): Promise<WallpaperTransactionResult>;
```

Использовать helper, который удаляет предыдущий local asset только после
успешного `saveDashboardConfig(nextConfig)`. Для local install сначала писать
новый asset; при ошибке config save удалять его в `catch` и пробрасывать
исходную ошибку. Cleanup failure после commit возвращать русским warning, но не
откатывать новый конфиг.

- [ ] **Step 6: Запустить repository/transaction tests**

Run:

```bash
corepack pnpm test tests/storage/wallpaper-assets.test.ts tests/storage/wallpaper-transactions.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add storage/wallpaper-assets.ts storage/wallpaper-transactions.ts tests/storage
git commit -m "feat(storage): persist wallpaper assets transactionally"
```

### Task 4: Проверка локальных изображений и HTTPS URL

**Files:**

- Create: `wallpaper/image-validation.ts`
- Create: `tests/wallpaper/image-validation.test.ts`
- Modify: `tests/setup.ts`

- [ ] **Step 1: Написать pure signature tests**

В `tests/wallpaper/image-validation.test.ts` проверить PNG, JPEG, WebP,
GIF87a/GIF89a, AVIF `ftyp`, SVG с XML declaration и BOM, а также spoofed MIME и
HTML под именем `.svg`:

```ts
it('detects an SVG document without trusting the extension', () => {
  const bytes = new TextEncoder().encode(
    '\uFEFF<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>',
  );

  expect(detectWallpaperMimeType(bytes, 'image/svg+xml')).toBe('image/svg+xml');
});

it('rejects a declared image whose bytes have another format', () => {
  const png = createPngHeader();
  expect(() => detectWallpaperMimeType(png, 'image/jpeg')).toThrow(
    InvalidWallpaperImageError,
  );
});
```

- [ ] **Step 2: Написать async decode и URL tests**

Подменить глобальный `Image` через `vi.stubGlobal` и проверить:

```ts
await expect(validateWallpaperUrl('http://example.com/a.png')).rejects.toThrow(
  'HTTPS',
);

await expect(validateWallpaperUrl('https://example.com/a.png')).resolves.toBe(
  'https://example.com/a.png',
);
```

Проверить error event, 10-second timeout через fake timers, AbortSignal и
`referrerPolicy === 'no-referrer'`. Для local validation проверить, что Blob URL
всегда отзывается после success и failure.

- [ ] **Step 3: Запустить тест и подтвердить RED**

Run:

```bash
corepack pnpm test tests/wallpaper/image-validation.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 4: Реализовать format detection**

В `wallpaper/image-validation.ts` экспортировать:

```ts
export class InvalidWallpaperImageError extends Error {}
export class WallpaperValidationAbortedError extends Error {}

export function detectWallpaperMimeType(
  bytes: Uint8Array,
  declaredMimeType: string,
): WallpaperMimeType;

export async function validateWallpaperBytes(
  bytes: Uint8Array,
  mimeType: WallpaperMimeType,
  signal?: AbortSignal,
): Promise<void>;
```

Проверять binary signatures. SVG разбирать `DOMParser` как XML, отклонять
`parsererror` и принимать только корневой элемент `svg` в SVG namespace.
Пустой declared MIME разрешён, если формат уверенно найден; непустой
несовпадающий MIME отклоняется.

- [ ] **Step 5: Реализовать browser decode и URL validation**

Экспортировать:

```ts
export async function validateLocalWallpaper(
  file: File,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; mimeType: WallpaperMimeType }>;

export async function validateWallpaperUrl(
  value: string,
  signal?: AbortSignal,
): Promise<string>;
```

`validateLocalWallpaper` читает `File`, вызывает `detectWallpaperMimeType`, а
затем общую `validateWallpaperBytes`. Общий internal `loadImage(src, signal)`
создаёт `Image`, задаёт
`referrerPolicy = 'no-referrer'`, обрабатывает `load`, `error`, abort и timeout
10_000 ms с единичным cleanup listeners/timer. URL нормализуется через
`new URL(value).href`. Local путь создаёт Blob URL после signature validation и
отзывает его в `finally`.

- [ ] **Step 6: Запустить tests и typecheck**

Run:

```bash
corepack pnpm test tests/wallpaper/image-validation.test.ts
corepack pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add wallpaper/image-validation.ts tests/wallpaper/image-validation.test.ts tests/setup.ts
git commit -m "feat(wallpaper): validate image sources"
```

### Task 5: Сериализованные wallpaper actions в dashboard hook

**Files:**

- Modify: `hooks/use-dashboard-config.ts`
- Modify: `tests/hooks/use-dashboard-config.test.tsx`

- [ ] **Step 1: Написать failing hook tests**

Расширить `tests/hooks/use-dashboard-config.test.tsx` сценариями:

```ts
it('publishes a local wallpaper only after its transaction succeeds', async () => {
  const dashboard = renderHook(() => useDashboardConfig());
  await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

  await act(async () => {
    await dashboard.result.current.setLocalWallpaper(validPngFile);
  });

  expect(dashboard.result.current.config?.appearance.wallpaper).toMatchObject({
    type: 'local',
  });
  expect(dashboard.result.current.wallpaperError).toBeNull();
});

it('keeps the previous wallpaper when a transaction rejects', async () => {
  transactionMocks.installUrlWallpaper.mockRejectedValueOnce(
    new Error('save failed'),
  );

  await act(async () => {
    await expect(
      dashboard.result.current.setUrlWallpaper(
        'https://example.com/wallpaper.jpg',
      ),
    ).rejects.toThrow('save failed');
  });

  expect(dashboard.result.current.config?.appearance.wallpaper).toEqual(
    previousWallpaper,
  );
});
```

Также проверить: pending widget save выполняется перед wallpaper transaction;
повторная операция запрещена через `isWallpaperUpdating`; abort не создаёт
пользовательскую ошибку; warning cleanup виден в `wallpaperError`.

- [ ] **Step 2: Запустить hook tests и подтвердить RED**

Run:

```bash
corepack pnpm test tests/hooks/use-dashboard-config.test.tsx
```

Expected: FAIL — wallpaper API отсутствует.

- [ ] **Step 3: Сделать очередь возвращающей Promise результата**

В `use-dashboard-config.ts` заменить fire-and-forget chaining внутренним generic
helper:

```ts
const enqueueStorageOperation = useCallback(
  <T>(operation: () => Promise<T>) => {
    const result = saveQueueRef.current.catch(() => undefined).then(operation);
    saveQueueRef.current = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  },
  [],
);
```

Существующие immediate/debounced saves вызывают helper и сами переводят reject
в `setError`, сохраняя прежний порядок записей.

- [ ] **Step 4: Добавить wallpaper API hook**

Расширить result:

```ts
interface UseDashboardConfigResult {
  // existing fields remain unchanged
  isWallpaperUpdating: boolean;
  wallpaperError: string | null;
  clearWallpaperError: () => void;
  setLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
  setUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
  removeWallpaper: () => Promise<void>;
}
```

`setLocalWallpaper` вызывает `validateLocalWallpaper`, создаёт UUID через
`crypto.randomUUID`, кодирует asset, flushes pending widget state, затем внутри
общей очереди вызывает `installLocalWallpaper`. URL путь сначала вызывает
`validateWallpaperUrl`, затем `installUrlWallpaper`. Успех атомарно обновляет
`configRef` и React state; reject оставляет их прежними, записывает русское
сообщение и пробрасывается диалогу. Abort очищает pending state без ошибки.

После initial config load вызвать `cleanupOrphanedWallpaperAssets` с активным
asset ID. Cleanup failure записывает warning, но не блокирует config.

- [ ] **Step 5: Запустить hook tests и регрессии persistence ordering**

Run:

```bash
corepack pnpm test tests/hooks/use-dashboard-config.test.tsx tests/components/widget-lifecycle.test.tsx tests/components/markdown-widget-editing.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add hooks/use-dashboard-config.ts tests/hooks/use-dashboard-config.test.tsx
git commit -m "feat(state): coordinate wallpaper updates"
```

### Task 6: Загрузка asset и декоративный WallpaperLayer

**Files:**

- Create: `hooks/use-wallpaper-image.ts`
- Create: `components/dashboard/WallpaperLayer.tsx`
- Create: `tests/hooks/use-wallpaper-image.test.tsx`
- Create: `tests/components/WallpaperLayer.test.tsx`
- Modify: `entrypoints/newtab/App.tsx`

- [ ] **Step 1: Написать failing source hook tests**

Проверить `none`, прямой URL, local asset, corrupted/missing local asset и revoke:

```ts
it('creates and revokes a Blob URL for a local asset', async () => {
  await saveWallpaperAsset(validAsset);
  const wallpaper = { type: 'local', assetId: validAsset.assetId } as const;
  const hook = renderHook(() => useWallpaperImage(wallpaper));

  await waitFor(() => expect(hook.result.current.src).toBe('blob:wallpaper'));
  hook.unmount();

  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wallpaper');
});
```

Локальная ошибка возвращает `{ src: null, error: '…' }`; URL возвращается без
storage access.

- [ ] **Step 2: Написать failing layer tests**

```tsx
render(
  <WallpaperLayer
    src="https://example.com/wallpaper.svg"
    onLoadError={onLoadError}
  />,
);

const image = container.querySelector('img');
expect(image).not.toBeNull();
expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
expect(image).toHaveClass('fixed', 'inset-0', 'size-full', 'object-cover');
fireEvent.error(image);
expect(onLoadError).toHaveBeenCalledOnce();
```

- [ ] **Step 3: Запустить tests и подтвердить RED**

Run:

```bash
corepack pnpm test tests/hooks/use-wallpaper-image.test.tsx tests/components/WallpaperLayer.test.tsx
```

Expected: FAIL — hook/component do not exist.

- [ ] **Step 4: Реализовать `useWallpaperImage`**

API:

```ts
interface WallpaperImageState {
  src: string | null;
  error: string | null;
  sourceType: WallpaperConfig['type'];
}

export function useWallpaperImage(
  wallpaper: WallpaperConfig,
): WallpaperImageState;
```

Для local загрузить и parse asset, декодировать bytes, повторно проверить
browser decode, создать Blob URL и отозвать его в effect cleanup. Игнорировать
результат устаревшего async effect через `isActive` flag.

- [ ] **Step 5: Реализовать `WallpaperLayer` и подключить в `App`**

Компонент:

```tsx
export function WallpaperLayer({
  src,
  onLoadError,
}: {
  src: string | null;
  onLoadError: () => void;
}) {
  if (!src) return null;

  return (
    <img
      aria-hidden="true"
      alt=""
      className="pointer-events-none fixed inset-0 size-full object-cover object-center"
      referrerPolicy="no-referrer"
      src={src}
      onError={onLoadError}
    />
  );
}
```

В `App` оставить `backgroundColor` на `<main>` с `isolate`, вставить layer с
`z-0` первым ребёнком, а Dashboard поместить в `relative z-10` слой. Сбрасывать remote runtime
error при смене `appearance.wallpaper`. Local load error показывать через
существующий глобальный alert; remote error передавать в appearance UI без
глобального alert на каждой вкладке.

- [ ] **Step 6: Запустить tests**

Run:

```bash
corepack pnpm test tests/hooks/use-wallpaper-image.test.tsx tests/components/WallpaperLayer.test.tsx tests/components/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/use-wallpaper-image.ts components/dashboard/WallpaperLayer.tsx entrypoints/newtab/App.tsx tests
git commit -m "feat(ui): render persisted wallpaper layer"
```

### Task 7: Диалог установки, предпросмотр и удаление

**Files:**

- Modify: `components/dashboard/AppearanceDialog.tsx`
- Modify: `components/dashboard/DashboardControls.tsx`
- Modify: `components/dashboard/Dashboard.tsx`
- Modify: `entrypoints/newtab/App.tsx`
- Modify: `tests/components/App.test.tsx`
- Create: `tests/components/appearance-wallpaper.test.tsx`

- [ ] **Step 1: Написать failing UI tests**

Покрыть:

```ts
expect(screen.getByLabelText('Локальное изображение')).toHaveAttribute(
  'accept',
  'image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,.svg',
);

await user.type(
  screen.getByLabelText('Ссылка на изображение'),
  'https://example.com/wallpaper.jpg',
);
expect(validateUrl).not.toHaveBeenCalled();
await user.click(screen.getByRole('button', { name: 'Установить по ссылке' }));
expect(validateUrl).toHaveBeenCalledOnce();
```

Добавить тесты: file change запускает local action; текущий preview виден;
processing disables file/URL/remove; ошибка имеет `role="alert"`; remove
вызывает action; закрытие dialog aborts validation; прежние theme/color tests
остаются зелёными.

- [ ] **Step 2: Запустить UI tests и подтвердить RED**

Run:

```bash
corepack pnpm test tests/components/appearance-wallpaper.test.tsx tests/components/App.test.tsx
```

Expected: FAIL — wallpaper controls absent.

- [ ] **Step 3: Расширить props по цепочке App → Dashboard → Controls → Dialog**

Передать:

```ts
isWallpaperUpdating: boolean;
wallpaperError: string | null;
wallpaperPreviewSrc: string | null;
onClearWallpaperError: () => void;
onSetLocalWallpaper: (file: File, signal?: AbortSignal) => Promise<void>;
onSetUrlWallpaper: (url: string, signal?: AbortSignal) => Promise<void>;
onRemoveWallpaper: () => Promise<void>;
```

Не добавлять platform/storage calls в React components.

- [ ] **Step 4: Реализовать форму `AppearanceDialog`**

Добавить local `urlDraft`, `AbortController` ref и обработчики. File input:

```tsx
<Input
  id="wallpaper-file"
  accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml,.svg"
  aria-describedby="wallpaper-status"
  disabled={isWallpaperUpdating}
  type="file"
  onChange={(event) => {
    const file = event.target.files?.[0];
    if (file) void startLocalOperation(file);
    event.target.value = '';
  }}
/>
```

URL находится в `<form>` и не вызывает action до submit. При каждой операции
abort предыдущего controller, очистить старую ошибку, дождаться Promise и не
закрывать dialog автоматически. На `open === false` abort controller и
синхронизировать draft с активным URL.

Предпросмотр рендерить как декоративный `<img>` в ограниченном контейнере с
`object-cover` и `referrerPolicy="no-referrer"`. Кнопка «Удалить обои» доступна
только если source не `none`.

- [ ] **Step 5: Запустить UI tests и accessibility regressions**

Run:

```bash
corepack pnpm test tests/components/appearance-wallpaper.test.tsx tests/components/App.test.tsx tests/components/widget-lifecycle.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard entrypoints/newtab/App.tsx tests/components
git commit -m "feat(ui): add wallpaper appearance controls"
```

### Task 8: Permission, docs и полная автоматическая проверка

**Files:**

- Modify: `wxt.config.ts`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/PROJECT_CONTEXT.md`
- Modify: `docs/CURRENT_STATE.md`
- Modify: `tests/components/App.test.tsx`

- [ ] **Step 1: Добавить manifest test expectation**

В App/storage integration coverage зафиксировать, что URL установка не вызывает
`fetch`, а local asset находится под отдельным ключом после reload. Для manifest
проверки после build использовать точный command из Step 4.

- [ ] **Step 2: Добавить разрешение с объясняющим комментарием**

В `wxt.config.ts`:

```ts
// `unlimitedStorage` preserves original local wallpaper bytes when lossless
// compression cannot fit them under the normal chrome.storage.local quota.
permissions: ['storage', 'favicon', 'unlimitedStorage'],
```

Не добавлять `host_permissions` или ChromeOS `wallpaper` permission.

- [ ] **Step 3: Обновить durable documentation**

Зафиксировать в документах:

- schema v3 и v1/v2 migration;
- `local:dashboard-wallpaper:<assetId>` рядом с основным config key;
- URL-only remote behavior и отсутствие cache/host permissions;
- gzip threshold 6 MiB и `unlimitedStorage` fallback;
- SVG только через image context;
- новый `WallpaperLayer`, transaction flow и текущий статус функции.

README дополнить пользовательским описанием установки/удаления обоев.

- [ ] **Step 4: Выполнить полный verification suite**

Run:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm exec prettier --check .
rg -n '"permissions"|unlimitedStorage|host_permissions' .output/chrome-mv3/manifest.json
```

Expected:

- все команды завершаются с exit code 0;
- generated manifest содержит `storage`, `favicon`, `unlimitedStorage`;
- generated manifest не содержит `host_permissions`;
- допустим существующий WXT warning о chunk около 633 kB, но новых ошибок нет.

- [ ] **Step 5: Commit**

```bash
git add wxt.config.ts README.md docs tests/components/App.test.tsx
git commit -m "docs: document wallpaper storage and permissions"
```

### Task 9: Chrome smoke check и финальная сверка

**Files:**

- Modify only if a smoke check exposes a scoped defect; add a focused regression test beside the fix.

- [ ] **Step 1: Запустить production build и загрузить unpacked extension**

Run:

```bash
corepack pnpm build
```

Открыть Chrome extensions, загрузить `.output/chrome-mv3` и открыть новую
вкладку.

- [ ] **Step 2: Проверить локальные форматы**

Проверить PNG/JPEG, WebP, animated GIF, AVIF и SVG: установка, cover/center,
предпросмотр, reload, замена, удаление. Для файла больше 6 MiB проверить reload
и байтовый round trip через storage test/DevTools, не визуальную догадку.

- [ ] **Step 3: Проверить URL и ошибки**

Установить рабочий HTTPS URL; убедиться, что после reload выполняется обычная
remote image load без локального wallpaper asset. Проверить HTTP, 404/non-image,
timeout/offline: прежний источник остаётся при первичной ошибке, а уже
сохранённый временно недоступный URL показывает цветовую подложку.

- [ ] **Step 4: Проверить доступность и layout**

Проверить keyboard navigation, focus restore, Escape, русские accessible names,
обе темы, читаемость controls и dashboard длиннее viewport. Узкий viewport
должен сохранить существующий 960 px горизонтальный canvas.

- [ ] **Step 5: Исправить только подтверждённые smoke defects через RED → GREEN**

Для каждого дефекта сначала добавить focused failing test, выполнить его,
внести минимальную правку и повторить focused + full suite. Если дефектов нет,
не создавать пустой commit.

- [ ] **Step 6: Финальная проверка состояния**

Run:

```bash
git status --short
git log --oneline --decorate -10
```

Expected: рабочее дерево чистое; wallpaper commits находятся поверх design и
implementation-plan commits.
