# Liquid Glass Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить включённый по умолчанию статический Liquid Glass для Markdown и Search с сохраняемым переключателем в оформлении.

**Architecture:** Поднять persisted schema до v4 и хранить `appearance.liquidGlassEnabled` рядом с темой и обоями. `App` выставляет корневой CSS-модификатор, а семантические классы Markdown/Search получают стеклянные стили только под этим модификатором; выключенное состояние сохраняет прежний UI без передачи нового prop через dashboard-дерево.

**Tech Stack:** React 19, strict TypeScript, Tailwind CSS 4 + обычный CSS, WXT Storage, Vitest, React Testing Library.

---

## Карта файлов

- `storage/schema.ts` — версия v4 и persisted-флаг Liquid Glass.
- `storage/defaults.ts` — включённый эффект для новых профилей.
- `storage/migrations.ts` — миграции v1/v2/v3 в v4 и строгая проверка v4.
- `entrypoints/newtab/App.tsx` — корневой CSS-модификатор включённого эффекта.
- `components/dashboard/AppearanceDialog.tsx` — закрытый раздел «Виджеты» и переключатель.
- `components/dashboard/WidgetHost.tsx` — семантическая поверхность Markdown и прежний fallback при выключении.
- `widgets/search/SearchWidget.tsx` — семантическая поверхность Search и внутреннее поле.
- `entrypoints/newtab/style.css` — theme-aware Liquid Glass и fallback без `backdrop-filter`.
- `tests/**` — миграции, fixtures, переключатель, persistence и классы поверхностей.
- `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_CONTEXT.md`, `docs/CURRENT_STATE.md` — актуальная схема и поведение.

Существующий незакоммиченный CSS-прототип в `WidgetHost.tsx`, `SearchWidget.tsx`,
`style.css` и связанных тестах нужно доработать по этому плану, а не принимать
как финальную реализацию. Несвязанные изменения пользователя не включать.

### Task 1: Persisted schema v4 и совместимые миграции

**Files:**

- Modify: `storage/schema.ts`
- Modify: `storage/defaults.ts`
- Modify: `storage/migrations.ts`
- Modify: `tests/storage/defaults.test.ts`
- Modify: `tests/storage/migrations.test.ts`
- Modify: `tests/storage/dashboard-storage.test.ts`
- Modify fixtures: `tests/components/App.test.tsx`
- Modify fixtures: `tests/components/markdown-widget-editing.test.tsx`
- Modify fixtures: `tests/hooks/use-dashboard-config.test.tsx`
- Modify fixtures: `tests/storage/wallpaper-transactions.test.ts`

- [ ] **Step 1: Написать failing-тесты defaults и миграции v3**

В `tests/storage/defaults.test.ts` ожидать:

```ts
expect(createDefaultDashboardConfig().appearance.liquidGlassEnabled).toBe(true);
```

В `tests/storage/migrations.test.ts` добавить сохранение wallpaper при v3→v4:

```ts
it('migrates v3 wallpaper appearance to v4 with Liquid Glass enabled', () => {
  const v3Config = {
    version: 3,
    widgets: [],
    appearance: {
      theme: 'dark',
      backgroundColor: '#123456',
      wallpaper: { type: 'url', url: 'https://example.com/wallpaper.jpg' },
    },
  } as const;

  expect(migrateDashboardConfig(v3Config)).toEqual({
    ...v3Config,
    version: 4,
    appearance: { ...v3Config.appearance, liquidGlassEnabled: true },
  });
});
```

Добавить отклонение не-boolean текущей настройки:

```ts
expect(() =>
  migrateDashboardConfig({
    ...createDefaultDashboardConfig(),
    appearance: {
      ...createDefaultDashboardConfig().appearance,
      liquidGlassEnabled: 'yes',
    },
  }),
).toThrow(InvalidDashboardConfigError);
```

- [ ] **Step 2: Запустить тесты и подтвердить RED**

Run:

```bash
pnpm exec vitest run tests/storage/defaults.test.ts tests/storage/migrations.test.ts
```

Expected: FAIL — поля `liquidGlassEnabled` и миграции v3→v4 ещё нет.

- [ ] **Step 3: Добавить тип и default**

В `storage/schema.ts`:

```ts
export const DASHBOARD_CONFIG_VERSION = 4 as const;

export interface AppearanceConfig {
  theme: Theme;
  backgroundColor: string;
  wallpaper: WallpaperConfig;
  liquidGlassEnabled: boolean;
}
```

В `storage/defaults.ts`:

```ts
export const DEFAULT_APPEARANCE: Readonly<AppearanceConfig> = {
  theme: 'system',
  backgroundColor: '#18181b',
  wallpaper: { type: 'none' },
  liquidGlassEnabled: true,
};
```

- [ ] **Step 4: Разделить guards v3 и v4 и добавить миграцию**

В `storage/migrations.ts` оставить v3 как legacy-форму с wallpaper:

```ts
interface WallpaperAppearanceConfig extends LegacyAppearanceConfig {
  wallpaper: WallpaperConfig;
}

function isDashboardConfigV3(value: unknown): value is Record<
  string,
  unknown
> & {
  version: 3;
  widgets: WidgetConfig[];
  appearance: WallpaperAppearanceConfig;
} {
  return (
    hasValidLegacyDashboardEnvelope(value) &&
    value.version === 3 &&
    isWallpaperConfig(value.appearance.wallpaper) &&
    value.widgets.every(isWidgetConfig)
  );
}

function isDashboardConfigV4(value: unknown): value is DashboardConfig {
  return (
    hasValidLegacyDashboardEnvelope(value) &&
    value.version === DASHBOARD_CONFIG_VERSION &&
    isWallpaperConfig(value.appearance.wallpaper) &&
    typeof value.appearance.liquidGlassEnabled === 'boolean' &&
    value.widgets.every(isWidgetConfig)
  );
}
```

Во всех v1/v2-return добавить `liquidGlassEnabled: true`; затем добавить ветку:

```ts
if (version === 3) {
  if (!isDashboardConfigV3(value)) {
    throw new InvalidDashboardConfigError();
  }

  return normalizeDashboardConfig({
    ...value,
    version: DASHBOARD_CONFIG_VERSION,
    appearance: {
      ...value.appearance,
      liquidGlassEnabled: true,
    },
  });
}
```

Текущую ветку проверять через `isDashboardConfigV4`.

- [ ] **Step 5: Обновить ожидаемые версии и typed fixtures**

Во всех перечисленных test-файлах заменить текущие persisted fixtures на v4 и
добавить к appearance:

```ts
liquidGlassEnabled: true,
```

Ожидания миграций v1/v2 должны проверять одновременно `version: 4`, wallpaper
и `liquidGlassEnabled: true`. Тест удаления retired `google-calendar` сохранить.
В тесте unsupported future version заменить `version: 4` на `version: 5`.

- [ ] **Step 6: Запустить storage и regression-тесты**

Run:

```bash
pnpm exec vitest run tests/storage tests/hooks/use-dashboard-config.test.tsx tests/components/App.test.tsx tests/components/markdown-widget-editing.test.tsx
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add storage/schema.ts storage/defaults.ts storage/migrations.ts tests/storage tests/hooks/use-dashboard-config.test.tsx tests/components/App.test.tsx tests/components/markdown-widget-editing.test.tsx
git commit -m "feat(storage): persist liquid glass preference"
```

### Task 2: Переключатель в оформлении и корневой модификатор

**Files:**

- Modify: `components/dashboard/AppearanceDialog.tsx`
- Modify: `entrypoints/newtab/App.tsx`
- Modify: `tests/components/appearance-wallpaper.test.tsx`
- Modify: `tests/components/App.test.tsx`

- [ ] **Step 1: Написать failing-тест закрытого раздела и switch**

В `tests/components/appearance-wallpaper.test.tsx` открыть summary «Виджеты» и
проверить доступный switch:

```ts
const widgetsSection = screen.getByText('Виджеты', { selector: 'summary' });
expect(widgetsSection.closest('details')).not.toHaveAttribute('open');

await user.click(widgetsSection);
const glassSwitch = screen.getByRole('switch', {
  name: 'Эффект Liquid Glass',
});
expect(glassSwitch).toBeChecked();

await user.click(glassSwitch);
expect(props.onAppearanceChange).toHaveBeenCalledWith({
  liquidGlassEnabled: false,
});
```

- [ ] **Step 2: Написать failing App-тест modifier и persistence**

В `tests/components/App.test.tsx` проверить начальный класс, затем переключение:

```ts
const app = screen.getByRole('main');
expect(app).toHaveClass('liquid-glass-enabled');

await user.click(screen.getByText('Виджеты', { selector: 'summary' }));
await user.click(screen.getByRole('switch', { name: 'Эффект Liquid Glass' }));

expect(app).not.toHaveClass('liquid-glass-enabled');
await waitFor(async () => {
  const stored = await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY);
  expect(stored?.appearance.liquidGlassEnabled).toBe(false);
});
```

- [ ] **Step 3: Запустить тесты и подтвердить RED**

Run:

```bash
pnpm exec vitest run tests/components/appearance-wallpaper.test.tsx tests/components/App.test.tsx
```

Expected: FAIL — раздел, switch и корневой класс отсутствуют.

- [ ] **Step 4: Добавить раздел «Виджеты»**

В `AppearanceDialog` добавить четвёртый `<details>` с теми же стилями summary,
что у остальных разделов:

```tsx
<details className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500">
    Виджеты
    <span aria-hidden="true">›</span>
  </summary>
  <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-sm font-medium">Эффект Liquid Glass</span>
      <input
        aria-label="Эффект Liquid Glass"
        checked={appearance.liquidGlassEnabled}
        className="size-5 accent-zinc-900 dark:accent-zinc-100"
        role="switch"
        type="checkbox"
        onChange={(event) =>
          onAppearanceChange({ liquidGlassEnabled: event.target.checked })
        }
      />
    </label>
  </div>
</details>
```

Раздел не получает `open`; существующий reset через `sectionsRef` автоматически
закрывает и его.

- [ ] **Step 5: Добавить корневой modifier в App**

Импортировать `classNames` и изменить main:

```tsx
<main
  aria-busy={isLoading}
  className={classNames(
    'relative isolate min-h-screen text-zinc-950 transition-colors dark:text-zinc-50',
    appearance.liquidGlassEnabled && 'liquid-glass-enabled',
  )}
  style={{ backgroundColor: appearance.backgroundColor }}
>
```

- [ ] **Step 6: Запустить focused tests**

Run:

```bash
pnpm exec vitest run tests/components/appearance-wallpaper.test.tsx tests/components/App.test.tsx
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/AppearanceDialog.tsx entrypoints/newtab/App.tsx tests/components/appearance-wallpaper.test.tsx tests/components/App.test.tsx
git commit -m "feat(ui): toggle liquid glass widgets"
```

### Task 3: Финальные поверхности Markdown и Search

**Files:**

- Modify: `components/dashboard/WidgetHost.tsx`
- Modify: `widgets/search/SearchWidget.tsx`
- Modify: `entrypoints/newtab/style.css`
- Modify: `tests/components/widget-lifecycle.test.tsx`

- [ ] **Step 1: Уточнить failing-тесты семантических поверхностей**

В `tests/components/widget-lifecycle.test.tsx` проверять не безусловный
`liquid-glass`, а назначение отдельных surface-классов:

```ts
expect(markdownArticle).toHaveClass(
  'widget-card-surface',
  'liquid-glass-surface',
);
expect(searchForm).toHaveClass('widget-search-surface', 'liquid-glass-surface');
expect(searchInput).toHaveClass('widget-search-field');
```

Сохранить существующую проверку, что bare article Search не получил card
chrome (`rounded-xl`, `border`, `bg-white`, `p-4`).

- [ ] **Step 2: Запустить тест и подтвердить RED**

Run:

```bash
pnpm exec vitest run tests/components/widget-lifecycle.test.tsx
```

Expected: FAIL — прототип использует безусловные классы `liquid-glass`.

- [ ] **Step 3: Назначить surface-классы и восстановить toolbar**

В `WidgetHost.tsx` вернуть прежний непрозрачный toolbar bare-виджета, поскольку
scope не включает панели управления:

```ts
isBare &&
  'absolute right-0 bottom-full z-20 mb-2 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900';
```

Для не-bare article использовать:

```ts
'widget-card-surface liquid-glass-surface min-h-40 flex-col overflow-hidden rounded-xl p-4';
```

В `SearchWidget.tsx`:

```tsx
className =
  'widget-search-surface liquid-glass-surface flex w-full items-center gap-2';
```

и для `Input`:

```tsx
className = 'widget-search-field';
```

- [ ] **Step 4: Реализовать выключенное и включённое состояние CSS**

В `style.css` задать базовую непрозрачную Markdown-поверхность:

```css
.widget-card-surface {
  border: 1px solid var(--color-zinc-200);
  background: white;
  box-shadow: var(--shadow-sm);
}

.dark .widget-card-surface {
  border-color: var(--color-zinc-700);
  background: var(--color-zinc-900);
}
```

Search без корневого modifier не получает фон/рамку/отступ. Стекло включать
только под `.liquid-glass-enabled`:

```css
.liquid-glass-enabled .liquid-glass-surface {
  border: 1px solid rgb(255 255 255 / 0.58);
  background:
    radial-gradient(circle at 12% 0%, rgb(255 255 255 / 0.62), transparent 42%),
    linear-gradient(
      135deg,
      rgb(255 255 255 / 0.52),
      rgb(255 255 255 / 0.22) 48%,
      rgb(255 255 255 / 0.38)
    );
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.7),
    inset 0 -1px 0 rgb(255 255 255 / 0.2),
    0 16px 40px rgb(24 24 27 / 0.2);
  backdrop-filter: blur(24px) saturate(180%) contrast(105%);
  -webkit-backdrop-filter: blur(24px) saturate(180%) contrast(105%);
}

.liquid-glass-enabled .widget-search-surface {
  border-radius: var(--radius-xl);
  padding: 0.25rem;
}
```

Тёмную тему и внутреннее поле ограничить тем же корневым modifier:

```css
.dark .liquid-glass-enabled .liquid-glass-surface {
  border-color: rgb(255 255 255 / 0.2);
  background:
    radial-gradient(circle at 12% 0%, rgb(255 255 255 / 0.18), transparent 42%),
    linear-gradient(
      135deg,
      rgb(39 39 42 / 0.68),
      rgb(9 9 11 / 0.42) 48%,
      rgb(39 39 42 / 0.56)
    );
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.24),
    inset 0 -1px 0 rgb(255 255 255 / 0.06),
    0 18px 48px rgb(0 0 0 / 0.38);
}

.liquid-glass-enabled .widget-search-field {
  border-color: rgb(255 255 255 / 0.46);
  background: rgb(255 255 255 / 0.42);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.52),
    inset 0 1px 8px rgb(24 24 27 / 0.08);
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
}

.dark .liquid-glass-enabled .widget-search-field {
  border-color: rgb(255 255 255 / 0.16);
  background: rgb(9 9 11 / 0.38);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.14),
    inset 0 1px 8px rgb(0 0 0 / 0.18);
}
```

Поскольку `Input` содержит background utilities, назначить glass-переопределения
в обычном CSS после Tailwind layers либо использовать точечный `!important`
только для background/border поля. Не добавлять анимацию или pointer-tracking.

- [ ] **Step 5: Проверить тесты и размер Search**

Run:

```bash
pnpm exec vitest run tests/components/widget-lifecycle.test.tsx tests/components/dashboard-layout.test.ts
pnpm typecheck
```

Expected: PASS; Search layout остаётся `h: 1`, а капсула укладывается в 48 px
за счёт 40 px controls + 4 px padding сверху/снизу.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/WidgetHost.tsx widgets/search/SearchWidget.tsx entrypoints/newtab/style.css tests/components/widget-lifecycle.test.tsx
git commit -m "feat(ui): style widgets with liquid glass"
```

### Task 4: Документация и полная проверка

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PROJECT_CONTEXT.md`
- Modify: `docs/CURRENT_STATE.md`

- [ ] **Step 1: Обновить документацию на русском языке**

Зафиксировать:

- schema v4 и поле `liquidGlassEnabled`;
- включённый по умолчанию theme-aware Liquid Glass;
- область только Markdown/Search;
- статический CSS без новых разрешений и зависимостей;
- выключение через закрытый раздел «Виджеты»;
- fallback при отсутствии `backdrop-filter`.

Не форматировать и не включать несвязанные пользовательские изменения.

- [ ] **Step 2: Запустить полный verification suite**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec prettier --check .
```

Expected: все команды PASS. Допустимо только уже задокументированное WXT warning
о размере основного chunk; отсутствие optional `web-ext` не должно менять exit
code тестов.

- [ ] **Step 3: Проверить production manifest и worktree**

Run:

```bash
sed -n '1,120p' .output/chrome-mv3/manifest.json
git diff --check
git status --short
```

Expected: разрешения не изменились; в status остаются только намеренные файлы и
отдельные несвязанные пользовательские изменения.

- [ ] **Step 4: Выполнить Chrome smoke-check, если доступен**

Проверить новую вкладку с обоями в светлой и тёмной теме, Markdown, Search и
выключение эффекта. Если browser-control блокирует `chrome://newtab`, явно
зафиксировать ограничение и не обходить политику браузера.

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md docs/ARCHITECTURE.md docs/PROJECT_CONTEXT.md docs/CURRENT_STATE.md
git commit -m "docs: document liquid glass widgets"
```
