---
name: new-widget
description: Step-by-step guide and architectural checklist for implementing a new widget in chrome-start-page.
---

# New Widget Implementation Runbook

Follow this runbook when adding a new widget type to `chrome-start-page`. Adhere strictly to the modular boundaries outlined in `docs/ARCHITECTURE.md`.

## Architectural Boundaries

1. **No direct platform access**: Widgets and UI components must never access `chrome.storage` or `wxt/storage` directly. All state updates pass through dashboard hooks.
2. **Registry as single source of truth**: All integration must go through `widgets/registry.tsx` and `WidgetConfigMap`. Never add ad-hoc `if (type === 'my-widget')` branches across the dashboard canvas.
3. **Persist raw domain config only**: Do not persist rendered HTML, markdown trees, active editor inputs, or derived state.
4. **Deterministic factories**: Widget factories in defaults must be deterministic except for the unique ID supplied by the registry.

---

## Step-by-Step Implementation Flow

### Step 1: Schema & Types (`storage/schema.ts`)

1. Add the new widget type identifier to the `WidgetType` union:
   ```typescript
   export type WidgetType = 'markdown' | 'search' | 'your_widget';
   ```
2. Define the configuration interface extending `BaseWidgetConfig<'your_widget'>`:
   ```typescript
   export interface YourWidgetConfig extends BaseWidgetConfig<'your_widget'> {
     type: 'your_widget';
     // Specific domain settings only (e.g. refreshInterval, targetUrl)
   }
   ```
3. Register the config in `WidgetConfigMap`:
   ```typescript
   export interface WidgetConfigMap {
     markdown: MarkdownWidgetConfig;
     search: SearchWidgetConfig;
     your_widget: YourWidgetConfig;
   }
   ```
4. If an existing persisted structure is broken, bump `CURRENT_SCHEMA_VERSION` and add a migration in `storage/migrations.ts`.

### Step 2: Defaults & Validation (`storage/defaults.ts` & `storage/validation.ts`)

1. Define default layout constraints and values in `storage/defaults.ts`:
   - `DEFAULT_YOUR_WIDGET_CONFIG`
   - Default dimensions: `w`, `h`, `minW`, `minH`.
2. Add runtime validation in `storage/validation.ts` to ensure loaded JSON matches the schema.

### Step 3: Widget Components (`widgets/your_widget/`)

Create directory `widgets/your_widget/` containing:

- `YourWidget.tsx`: The display component.
  - Receives `config: YourWidgetConfig`, `isEditing: boolean`, `appearance: ResolvedAppearance`.
- `YourWidgetEditor.tsx` (optional): Editor component if widget settings can be edited.
  - Receives `config`, `onChange`, and `onFinish`.
- `index.ts`: Clean public exports.

### Step 4: Registry Entry (`widgets/registry.tsx`)

Register the widget definition in `widgetRegistry`:

```typescript
your_widget: {
  type: 'your_widget',
  displayName: 'Название виджета',
  description: 'Краткое описание на русском',
  icon: YourWidgetIcon,
  defaultLayout: { w: 4, h: 3, minW: 2, minH: 2 },
  factory: (id) => createYourWidget(id),
  typeGuard: isYourWidgetConfig,
  Component: YourWidget,
  Editor: YourWidgetEditor,
}
```

### Step 5: Tests (`tests/widgets/your_widget/`)

1. Create `tests/widgets/your_widget/YourWidget.test.tsx`:
   - Test initial rendering with default and custom configs.
   - Test user interaction and accessibility.
2. Update `tests/storage/validation.test.ts` to test schema validation and corruption fallback.

### Step 6: Verification

Run the unified check pipeline:

```bash
pnpm check
```

Propose an interactive smoke check via MCP Playwright / Chrome DevTools if UI behavior or layout is affected.
