# Customizable Liquid Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить сохраняемые ползунки прозрачности, размытия и тени Liquid Glass с live preview и кнопкой возврата стандартных параметров.

**Architecture:** Поднять persisted schema до v5 и заменить отдельный boolean сгруппированным `appearance.liquidGlass`. Разделить preview и commit в `useDashboardConfig`, провести эти callbacks через dashboard-дерево, а `App` преобразует значения в CSS custom properties, сохраняя theme-aware формулы и текущий вид при defaults.

**Tech Stack:** React 19, strict TypeScript, Tailwind CSS 4 + CSS custom properties, WXT Storage, Vitest, React Testing Library.

---

Перед выполнением один раз активировать Node.js из `.nvmrc` командой `nvm use`.

## Карта файлов

- `storage/schema.ts` — schema v5 и тип `LiquidGlassConfig`.
- `storage/defaults.ts` — стандартные `40% / 18 px / 50%` и глубокое копирование defaults.
- `storage/migrations.ts` — строгая проверка v5 и миграции v1–v4.
- `hooks/use-dashboard-config.ts` — временный preview, commit и lifecycle flush.
- `components/dashboard/LiquidGlassSettings.tsx` — три range-control и reset.
- `components/dashboard/AppearanceDialog.tsx` — секция «Виджеты», toggle и callbacks.
- `components/dashboard/DashboardControls.tsx` — проксирование appearance callbacks.
- `components/dashboard/Dashboard.tsx` — проксирование appearance callbacks.
- `entrypoints/newtab/App.tsx` — modifier и CSS custom properties.
- `entrypoints/newtab/style.css` — вычисляемые tint, blur и shadow.
- `tests/**` — миграции, fixtures, preview/commit, controls и CSS variables.
- `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROJECT_CONTEXT.md`, `docs/CURRENT_STATE.md` — schema v5 и пользовательское поведение.

### Task 1: Schema v5, defaults и миграции

**Files:**

- Modify: `storage/schema.ts`
- Modify: `storage/defaults.ts`
- Modify: `storage/migrations.ts`
- Modify: `tests/storage/defaults.test.ts`
- Modify: `tests/storage/migrations.test.ts`
- Modify: `tests/storage/dashboard-storage.test.ts`
- Modify fixtures: `tests/storage/wallpaper-transactions.test.ts`
- Modify fixtures: `tests/hooks/use-dashboard-config.test.tsx`
- Modify fixtures: `tests/components/App.test.tsx`
- Modify fixtures: `tests/components/appearance-wallpaper.test.tsx`
- Modify fixtures: `tests/components/markdown-widget-editing.test.tsx`

- [ ] **Step 1: Написать failing-тест defaults v5**

В `tests/storage/defaults.test.ts` ожидать новую группу и независимые объекты:

```ts
expect(createDefaultDashboardConfig()).toMatchObject({
  version: 5,
  appearance: {
    liquidGlass: {
      enabled: true,
      transparency: 40,
      blur: 18,
      shadow: 50,
    },
  },
});

expect(firstConfig.appearance.liquidGlass).not.toBe(
  secondConfig.appearance.liquidGlass,
);
```

- [ ] **Step 2: Написать failing-тесты миграции v4 и validation v5**

В `tests/storage/migrations.test.ts` добавить:

```ts
it.each([true, false])(
  'migrates v4 and preserves Liquid Glass enabled=%s',
  (enabled) => {
    const v4Config = {
      version: 4,
      widgets: [],
      appearance: {
        theme: 'dark',
        backgroundColor: '#123456',
        wallpaper: { type: 'none' },
        liquidGlassEnabled: enabled,
      },
    } as const;

    expect(migrateDashboardConfig(v4Config)).toEqual({
      version: 5,
      widgets: [],
      appearance: {
        theme: 'dark',
        backgroundColor: '#123456',
        wallpaper: { type: 'none' },
        liquidGlass: {
          enabled,
          transparency: 40,
          blur: 18,
          shadow: 50,
        },
      },
    });
  },
);

it.each([
  { transparency: -1, blur: 18, shadow: 50 },
  { transparency: 101, blur: 18, shadow: 50 },
  { transparency: 40.5, blur: 18, shadow: 50 },
  { transparency: 40, blur: -1, shadow: 50 },
  { transparency: 40, blur: 41, shadow: 50 },
  { transparency: 40, blur: 18.5, shadow: 50 },
  { transparency: 40, blur: 18, shadow: -1 },
  { transparency: 40, blur: 18, shadow: 101 },
  { transparency: 40, blur: 18, shadow: 50.5 },
])('rejects invalid Liquid Glass values %#', (values) => {
  const config = createDefaultDashboardConfig();

  expect(() =>
    migrateDashboardConfig({
      ...config,
      appearance: {
        ...config.appearance,
        liquidGlass: { enabled: true, ...values },
      },
    }),
  ).toThrow(InvalidDashboardConfigError);
});

it('rejects a non-boolean Liquid Glass toggle', () => {
  const config = createDefaultDashboardConfig();

  expect(() =>
    migrateDashboardConfig({
      ...config,
      appearance: {
        ...config.appearance,
        liquidGlass: {
          ...config.appearance.liquidGlass,
          enabled: 'yes',
        },
      },
    }),
  ).toThrow(InvalidDashboardConfigError);
});
```

Также заменить unsupported future version на `6`.

- [ ] **Step 3: Запустить RED**

Run:

```bash
pnpm exec vitest run tests/storage/defaults.test.ts tests/storage/migrations.test.ts
```

Expected: FAIL — schema всё ещё v4 и поля `liquidGlass` нет.

- [ ] **Step 4: Добавить типы и defaults**

В `storage/schema.ts`:

```ts
export const DASHBOARD_CONFIG_VERSION = 5 as const;

export interface LiquidGlassConfig {
  enabled: boolean;
  transparency: number;
  blur: number;
  shadow: number;
}

export interface AppearanceConfig {
  theme: Theme;
  backgroundColor: string;
  wallpaper: WallpaperConfig;
  liquidGlass: LiquidGlassConfig;
}
```

В `storage/defaults.ts`:

```ts
export const DEFAULT_LIQUID_GLASS: Readonly<LiquidGlassConfig> = {
  enabled: true,
  transparency: 40,
  blur: 18,
  shadow: 50,
};

export const DEFAULT_APPEARANCE: Readonly<AppearanceConfig> = {
  theme: 'system',
  backgroundColor: '#18181b',
  wallpaper: { type: 'none' },
  liquidGlass: DEFAULT_LIQUID_GLASS,
};
```

В `createDefaultDashboardConfig` копировать обе вложенные группы:

```ts
appearance: {
  ...DEFAULT_APPEARANCE,
  wallpaper: { ...DEFAULT_APPEARANCE.wallpaper },
  liquidGlass: { ...DEFAULT_LIQUID_GLASS },
},
```

- [ ] **Step 5: Реализовать guards v4/v5 и миграции**

В `storage/migrations.ts` импортировать `DEFAULT_LIQUID_GLASS` и определить:

```ts
interface DashboardConfigV4Appearance extends WallpaperAppearanceConfig {
  liquidGlassEnabled: boolean;
}

function isIntegerInRange(value: unknown, min: number, max: number) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isLiquidGlassConfig(value: unknown): value is LiquidGlassConfig {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    isIntegerInRange(value.transparency, 0, 100) &&
    isIntegerInRange(value.blur, 0, 40) &&
    isIntegerInRange(value.shadow, 0, 100)
  );
}
```

`isDashboardConfigV4` проверяет literal `version === 4`, wallpaper и boolean.
Новый `isDashboardConfigV5` проверяет текущую версию и
`isLiquidGlassConfig(value.appearance.liquidGlass)`.

Во всех v1/v2/v3 returns заменить boolean на:

```ts
liquidGlass: { ...DEFAULT_LIQUID_GLASS },
```

Добавить ветку v4 перед текущей:

```ts
if (version === 4) {
  if (!isDashboardConfigV4(value)) {
    throw new InvalidDashboardConfigError();
  }

  const { liquidGlassEnabled, ...appearance } = value.appearance;

  return normalizeDashboardConfig({
    ...value,
    version: DASHBOARD_CONFIG_VERSION,
    appearance: {
      ...appearance,
      liquidGlass: {
        ...DEFAULT_LIQUID_GLASS,
        enabled: liquidGlassEnabled,
      },
    },
  });
}
```

Текущую ветку валидировать через `isDashboardConfigV5`.

- [ ] **Step 6: Обновить typed fixtures**

Во всех перечисленных tests заменить `version: 4` на `version: 5` и:

```ts
liquidGlassEnabled: true,
```

на:

```ts
liquidGlass: {
  enabled: true,
  transparency: 40,
  blur: 18,
  shadow: 50,
},
```

Legacy v4 оставлять только в новом migration-тесте. Ожидания v1/v2/v3 должны
проверять defaults v5; тест удаления retired `google-calendar` сохранить.

- [ ] **Step 7: Запустить storage regression и typecheck**

Run:

```bash
pnpm exec vitest run tests/storage tests/hooks/use-dashboard-config.test.tsx tests/components/App.test.tsx tests/components/appearance-wallpaper.test.tsx tests/components/markdown-widget-editing.test.tsx
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add storage/schema.ts storage/defaults.ts storage/migrations.ts tests/storage tests/hooks/use-dashboard-config.test.tsx tests/components/App.test.tsx tests/components/appearance-wallpaper.test.tsx tests/components/markdown-widget-editing.test.tsx
git commit -m "feat(storage): persist liquid glass controls"
```

### Task 2: Preview/commit lifecycle в state hook

**Files:**

- Modify: `hooks/use-dashboard-config.ts`
- Modify: `tests/hooks/use-dashboard-config.test.tsx`

- [ ] **Step 1: Написать failing-тест preview без записи**

В `tests/hooks/use-dashboard-config.test.tsx` seed-ить defaults, дождаться load,
затем проверить storage до и после flush:

```ts
it('previews appearance without saving and persists it on flush', async () => {
  const initial = createDefaultDashboardConfig();
  await saveDashboardConfig(initial);
  const dashboard = renderHook(() => useDashboardConfig());
  await waitFor(() => expect(dashboard.result.current.config).not.toBeNull());

  act(() => {
    dashboard.result.current.previewAppearance({
      liquidGlass: {
        ...initial.appearance.liquidGlass,
        transparency: 72,
      },
    });
  });

  expect(
    dashboard.result.current.config?.appearance.liquidGlass.transparency,
  ).toBe(72);
  await expect(
    storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY),
  ).resolves.toEqual(initial);

  act(() => dashboard.result.current.flushAppearancePreview());
  await waitFor(async () =>
    expect(
      (await storage.getItem<DashboardConfig>(DASHBOARD_STORAGE_KEY))
        ?.appearance.liquidGlass.transparency,
    ).toBe(72),
  );
});
```

- [ ] **Step 2: Написать failing lifecycle-тест**

Добавить сценарий preview → `pagehide` и проверить, что последнее значение
сохранено. Повторить отдельным тестом preview → `unmount`, используя `waitFor`
после unmount. Оба теста должны seed-ить config до создания hook.

В первом тесте после успешного flush запомнить число вызовов
`fakeBrowser.storage.local.set`, повторно вызвать `flushAppearancePreview()` и
проверить, что число не изменилось: пустой flush не создаёт лишнюю запись.

- [ ] **Step 3: Запустить RED**

Run:

```bash
pnpm exec vitest run tests/hooks/use-dashboard-config.test.tsx
```

Expected: FAIL — методов preview/flush ещё нет.

- [ ] **Step 4: Добавить pending ref и публичные методы**

Расширить `UseDashboardConfigResult`:

```ts
flushAppearancePreview: () => void;
previewAppearance: (changes: Partial<AppearanceConfig>) => void;
```

В hook добавить:

```ts
const pendingAppearanceConfigRef = useRef<DashboardConfig | null>(null);

const flushAppearancePreview = useCallback(() => {
  const pendingConfig = pendingAppearanceConfigRef.current;
  pendingAppearanceConfigRef.current = null;

  if (pendingConfig) {
    enqueueConfigSave(pendingConfig);
  }
}, [enqueueConfigSave]);

const previewAppearance = useCallback((changes: Partial<AppearanceConfig>) => {
  const currentConfig = configRef.current;

  if (!currentConfig) {
    return;
  }

  const nextConfig = {
    ...currentConfig,
    appearance: { ...currentConfig.appearance, ...changes },
  };

  configRef.current = nextConfig;
  pendingAppearanceConfigRef.current = nextConfig;
  setConfig(nextConfig);
  setError(null);
}, []);
```

- [ ] **Step 5: Встроить flush в существующий lifecycle и очередь**

Создать `flushPendingUpdates`, вызывающий `flushWidgetUpdates()` и
`flushAppearancePreview()`. Использовать его для `pagehide`, unmount и перед
wallpaper transaction. В immediate-ветке `commitConfig` очищать
`pendingAppearanceConfigRef.current`, потому что immediate save уже включает
последнее preview-значение.

Вернуть оба новых метода из hook. Не менять 300 ms debounce редакторов
виджетов.

- [ ] **Step 6: Запустить GREEN и regression**

Run:

```bash
pnpm exec vitest run tests/hooks/use-dashboard-config.test.tsx tests/storage/wallpaper-transactions.test.ts
pnpm typecheck
```

Expected: PASS; wallpaper transaction по-прежнему следует за pending saves.

- [ ] **Step 7: Commit**

```bash
git add hooks/use-dashboard-config.ts tests/hooks/use-dashboard-config.test.tsx
git commit -m "feat(state): preview liquid glass controls"
```

### Task 3: Ползунки и reset в разделе «Виджеты»

**Files:**

- Create: `components/dashboard/LiquidGlassSettings.tsx`
- Modify: `components/dashboard/AppearanceDialog.tsx`
- Modify: `components/dashboard/DashboardControls.tsx`
- Modify: `components/dashboard/Dashboard.tsx`
- Modify: `entrypoints/newtab/App.tsx`
- Modify: `tests/components/appearance-wallpaper.test.tsx`
- Modify: `tests/components/App.test.tsx`

- [ ] **Step 1: Написать failing UI-тест controls и reset**

В helper `renderDialog` добавить `onAppearancePreview` и
`onFlushAppearancePreview`. Затем проверить:

```ts
await user.click(screen.getByText('Виджеты', { selector: 'summary' }));

const transparency = screen.getByRole('slider', { name: 'Прозрачность' });
const blur = screen.getByRole('slider', { name: 'Размытие' });
const shadow = screen.getByRole('slider', { name: 'Тень' });

expect(transparency).toHaveAttribute('min', '0');
expect(transparency).toHaveAttribute('max', '100');
expect(transparency).toHaveValue('40');
expect(blur).toHaveAttribute('max', '40');
expect(blur).toHaveValue('18');
expect(shadow).toHaveValue('50');
expect(screen.getByText('40%')).toBeVisible();
expect(screen.getByText('18 px')).toBeVisible();
expect(screen.getByText('50%')).toBeVisible();
```

Изменить transparency через `fireEvent.change`, ожидать
`onAppearancePreview({liquidGlass: {..., transparency: 70}})`, затем вызвать
`fireEvent.pointerUp` и ожидать `onFlushAppearancePreview()`.

Для reset передать non-default values и ожидать:

```ts
expect(props.onAppearanceChange).toHaveBeenCalledWith({
  liquidGlass: {
    enabled: false,
    transparency: 40,
    blur: 18,
    shadow: 50,
  },
});
```

Одновременно проверить, что выключенные sliders disabled, reset enabled и
переключатель не менялся.

- [ ] **Step 2: Написать failing-тест commit при закрытии**

Открыть «Виджеты», изменить range, затем нажать кнопку диалога «Закрыть».
Ожидать сначала `onFlushAppearancePreview`, затем
`onOpenChange(false)`. Для проверки порядка использовать
`invocationCallOrder` mocks.

- [ ] **Step 3: Запустить RED**

Run:

```bash
pnpm exec vitest run tests/components/appearance-wallpaper.test.tsx tests/components/App.test.tsx
```

Expected: FAIL — range controls и preview callbacks отсутствуют.

- [ ] **Step 4: Создать `LiquidGlassSettings`**

Компонент принимает:

```ts
interface LiquidGlassSettingsProps {
  settings: LiquidGlassConfig;
  onChange: (settings: LiquidGlassConfig) => void;
  onCommit: () => void;
  onReset: (settings: LiquidGlassConfig) => void;
}
```

Описать controls массивом с `key`, label, min/max и unit. Каждый `<input
type="range" step="1">` получает `disabled={!settings.enabled}` и события:

```tsx
onChange={(event) =>
  onChange({
    ...settings,
    [control.key]: Number(event.target.value),
  })
}
onBlur={onCommit}
onKeyUp={onCommit}
onPointerUp={onCommit}
```

Рядом вывести `<output htmlFor={id}>`. Reset вызывает:

```ts
onReset({ ...DEFAULT_LIQUID_GLASS, enabled: settings.enabled });
```

и disabled только когда все три числа уже стандартные.

- [ ] **Step 5: Встроить компонент в `AppearanceDialog`**

Добавить props:

```ts
onAppearancePreview: (changes: Partial<AppearanceConfig>) => void;
onFlushAppearancePreview: () => void;
```

Toggle теперь сохраняет всю группу:

```ts
onAppearanceChange({
  liquidGlass: {
    ...appearance.liquidGlass,
    enabled: event.target.checked,
  },
});
```

Под toggle вставить `LiquidGlassSettings`. В `closeDialog` сначала вызвать
`onFlushAppearancePreview()`, затем закрывать диалог. Сброс передавать в
`onAppearanceChange`, preview — в `onAppearancePreview`.

- [ ] **Step 6: Провести callbacks через дерево**

Добавить `onAppearancePreview` и `onFlushAppearancePreview` в props
`Dashboard` и `DashboardControls`, передав их без преобразования. В `App`
деструктурировать `previewAppearance` и `flushAppearancePreview` из hook и
подключить к `Dashboard`.

- [ ] **Step 7: Обновить App integration-тест toggle/reset persistence**

В существующем тесте Liquid Glass проверять
`appearance.liquidGlass.enabled`. Добавить изменение slider → pointerup и
через `waitFor` проверить persisted числовое значение. Нажать reset и проверить
`40 / 18 / 50`, сохранив текущее `enabled`.

- [ ] **Step 8: Запустить GREEN**

Run:

```bash
pnpm exec vitest run tests/components/appearance-wallpaper.test.tsx tests/components/App.test.tsx tests/hooks/use-dashboard-config.test.tsx
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/LiquidGlassSettings.tsx components/dashboard/AppearanceDialog.tsx components/dashboard/DashboardControls.tsx components/dashboard/Dashboard.tsx entrypoints/newtab/App.tsx tests/components/appearance-wallpaper.test.tsx tests/components/App.test.tsx
git commit -m "feat(ui): configure liquid glass effect"
```

### Task 4: CSS custom properties и визуальная калибровка

**Files:**

- Modify: `entrypoints/newtab/App.tsx`
- Modify: `entrypoints/newtab/style.css`
- Modify: `tests/components/App.test.tsx`
- Modify: `tests/components/widget-lifecycle.test.tsx`

- [ ] **Step 1: Написать failing App-тест custom properties**

Seed-ить v5 config со значениями `75 / 12 / 80`, render App и проверить:

```ts
const app = screen.getByRole('main');
expect(app).toHaveClass('liquid-glass-enabled');
expect(app.style.getPropertyValue('--liquid-glass-opacity')).toBe('0.25');
expect(app.style.getPropertyValue('--liquid-glass-blur')).toBe('12px');
expect(app.style.getPropertyValue('--liquid-glass-shadow')).toBe('0.8');
```

Отдельно seed-ить `enabled: false` и проверить отсутствие modifier при
сохранённых CSS variables.

- [ ] **Step 2: Запустить RED**

Run:

```bash
pnpm exec vitest run tests/components/App.test.tsx
```

Expected: FAIL — App ещё не задаёт CSS variables.

- [ ] **Step 3: Рассчитать root style в `App`**

Импортировать `CSSProperties`, определить локальный тип:

```ts
type DashboardStyle = CSSProperties & {
  '--liquid-glass-opacity': number;
  '--liquid-glass-blur': string;
  '--liquid-glass-shadow': number;
};
```

Перед return вычислить:

```ts
const liquidGlass = appearance.liquidGlass;
const dashboardStyle: DashboardStyle = {
  backgroundColor: appearance.backgroundColor,
  '--liquid-glass-opacity': 1 - liquidGlass.transparency / 100,
  '--liquid-glass-blur': `${liquidGlass.blur}px`,
  '--liquid-glass-shadow': liquidGlass.shadow / 100,
};
```

Modifier читать из `liquidGlass.enabled`, а `main` получает
`style={dashboardStyle}`.

- [ ] **Step 4: Заменить фиксированные alpha/blur в CSS**

Светлая поверхность:

```css
.liquid-glass-enabled .liquid-glass-surface {
  background: linear-gradient(
    145deg,
    rgb(255 255 255 / calc(var(--liquid-glass-opacity) * 1.0666667)),
    rgb(255 255 255 / calc(var(--liquid-glass-opacity) * 0.7666667))
  );
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.62),
    inset 0 -1px 0 rgb(255 255 255 / 0.14),
    0 10px 28px rgb(24 24 27 / calc(var(--liquid-glass-shadow) * 0.28));
  backdrop-filter: blur(var(--liquid-glass-blur)) saturate(135%);
  -webkit-backdrop-filter: blur(var(--liquid-glass-blur)) saturate(135%);
}
```

Тёмная поверхность использует opacity multipliers `1.1666667` и `0.9333333`,
а shadow multiplier `0.56`. Фиксированные border и inset highlights оставить.

Search field связать с opacity:

```css
.liquid-glass-enabled .widget-search-field {
  border-color: transparent !important;
  background: rgb(
    255 255 255 / calc(var(--liquid-glass-opacity) * 0.5)
  ) !important;
}

.dark .liquid-glass-enabled .widget-search-field {
  background: rgb(
    9 9 11 / calc(var(--liquid-glass-opacity) * 0.3666667)
  ) !important;
}
```

При defaults формулы дают текущие значения `.64/.46`, `.70/.56`, blur `18px`
и shadow `.14/.28`. При opacity `0` tint исчезает; при shadow `0` внешняя тень
прозрачна. Не добавлять transitions, pointer tracking или новые selectors для
controls/dialogs.

- [ ] **Step 5: Проверить widget surfaces и layout**

Сохранить semantic class assertions в `widget-lifecycle.test.tsx` и добавить
проверку, что toolbar не получает `liquid-glass-surface`. Затем run:

```bash
pnpm exec vitest run tests/components/App.test.tsx tests/components/widget-lifecycle.test.tsx tests/components/dashboard-layout.test.ts
pnpm typecheck
pnpm build
```

Expected: PASS; Search остаётся высотой `1`, production CSS собирается.

- [ ] **Step 6: Commit**

```bash
git add entrypoints/newtab/App.tsx entrypoints/newtab/style.css tests/components/App.test.tsx tests/components/widget-lifecycle.test.tsx
git commit -m "feat(ui): apply liquid glass controls"
```

### Task 5: Документация и итоговая проверка

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/PROJECT_CONTEXT.md`
- Modify: `docs/CURRENT_STATE.md`

- [ ] **Step 1: Обновить документацию на русском языке**

Зафиксировать schema v5, вложенный `liquidGlass`, диапазоны и defaults,
preview/commit, reset без включения эффекта и отсутствие новых permissions или
dependencies. В ADR-008 заменить boolean на сгруппированную конфигурацию.

- [ ] **Step 2: Запустить полный verification suite**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec prettier --check .
```

Expected: все команды PASS. Допустимы только существующие nonfatal warning об
optional `web-ext` в Vitest и размере production chunk.

- [ ] **Step 3: Проверить manifest и worktree**

Run:

```bash
sed -n '1,120p' .output/chrome-mv3/manifest.json
git diff --check
git status --short
```

Expected: permissions остаются `storage`, `unlimitedStorage`, `favicon`, без
`host_permissions`; status содержит только намеренные документы.

- [ ] **Step 4: Выполнить ручной Chrome smoke-check, если policy разрешает**

Проверить стандартные значения, крайние значения каждого slider, toggle,
reset, обе темы, однотонный фон и пёстрые обои. Если browser-control блокирует
`chrome://newtab`, явно зафиксировать ограничение и не обходить его.

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md docs/ARCHITECTURE.md docs/DECISIONS.md docs/PROJECT_CONTEXT.md docs/CURRENT_STATE.md
git commit -m "docs: document liquid glass controls"
```
