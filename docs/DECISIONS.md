# Architecture Decisions

Only current, implementation-constraining decisions belong here.

## ADR-001 — Local versioned persistence

Status: Accepted

### Decision

Store one versioned `DashboardConfig` under `local:dashboard-config` through
WXT Storage (`chrome.storage.local`). Validate values as `unknown`, migrate old
versions, and serialize writes through one repository/hook path.

### Why

The dashboard must survive Chrome restarts without backend infrastructure, while
schema versions and queued writes prevent silent data loss.

### Consequences

Persisted shape changes require runtime validation and, when incompatible, a
version bump plus migration. Invalid/future data is rejected explicitly.

### Rejected Alternatives

- `localStorage`, direct storage calls from React, and `chrome.storage.sync`.
- Silently accepting partial or unsupported configurations.

## ADR-002 — Typed widget registry

Status: Accepted

### Decision

Use `WidgetConfigMap` as a discriminated union and register each widget's
factory, guards, renderer/editor, presentation, and layout constraints in
`widgets/registry.tsx`.

### Why

New widget types should extend one integration boundary without scattering type
switches through Dashboard and storage/UI layers.

### Consequences

A new widget must update the config map, runtime validation, registry, factory,
tests, and migration when persisted compatibility changes.

### Rejected Alternatives

- Untyped `settings: any` bags.
- Dashboard components importing and branching over every widget renderer.

## ADR-003 — Universal sanitized Markdown replaces LinksWidget

Status: Accepted

### Decision

Schema v2 exposes `markdown`, not `links`. V1 links migrate losslessly to raw
Markdown content. Rendering uses React Markdown with GFM, parsed raw HTML, and a
strict sanitizer; task checkboxes mutate exact source markers by AST position.

### Why

One general widget covers text, links, tasks, tables, images, and code while
keeping source editable and avoiding parallel derived models.

### Consequences

Raw Markdown is the only content stored. The full-screen split editor and safe
HTML/URL rules are part of the widget contract.

### Rejected Alternatives

- Keeping a specialized LinksWidget or a separate parsed-links array.
- Unsanitized HTML, executable user content, and `dangerouslySetInnerHTML`.
- Syntax-highlighting dependencies for the current MVP.

## ADR-004 — Native compact search with bundled brand assets

Status: Accepted

### Decision

SearchWidget is a bare, fixed-height `6×1` native GET form with four fixed HTTPS
engines. It uses bundled CoreUI Brands SVGs and a local magnifier fallback.

### Why

Native forms provide browser encoding and current-tab navigation. Bundled icons
are consistent, offline, and independent of favicon cache quality.

### Consequences

Only width and engine are configurable. Query text is neither persisted nor
sent before submit. Search-engine SVG source/license metadata stays in
`public/search-engines/SOURCE.md`.

### Rejected Alternatives

- Card chrome, visible SearchWidget title, and vertical resizing.
- Chrome `_favicon` or external favicon services for search brands.
- Suggestions, history, custom URL templates, and background search requests.

## ADR-005 — Preserve explicit desktop grid coordinates

Status: Accepted

### Decision

Use a 12-column, non-compacting grid with per-widget constraints, collision
prevention, and unbounded vertical dragging. Keep a 960 px minimum canvas and
horizontal scrolling on narrow viewports.

### Why

Persisted positions must remain stable, and users must be able to place widgets
in empty rows below the current grid.

### Consequences

The layout does not responsively rearrange on small screens. Coordinates save
after drag/resize completion rather than on every movement.

### Rejected Alternatives

- Bounding drag to the current grid height.
- Automatic compaction or responsive reflow that rewrites persisted positions.

## ADR-006 — Local-first privacy and narrow extension permissions

Status: Accepted

### Decision

Keep the extension backend-free and telemetry-free. Manifest permissions are
`storage`, `unlimitedStorage`, and `favicon`; no host permissions. User links
use Chrome's local favicon endpoint, while external images and explicit search
submissions follow their documented network behavior. `unlimitedStorage` is
reserved for user-selected local wallpapers whose original bytes must be kept.

### Why

The product is a personal start page and does not require accounts, remote
configuration, analytics, or broad access to browsing data.

### Consequences

There is no device sync or collaboration. New permissions/network integrations
need explicit justification and documentation.

### Rejected Alternatives

- Backend, authorization, analytics, telemetry, broad `host_permissions`, and
  external favicon APIs.

## ADR-007 — Validated local or HTTPS wallpaper sources

Status: Accepted

### Decision

Allow one full-screen wallpaper from either a validated local image or a direct
HTTPS URL. Wallpaper references were introduced in schema v3 and remain in the
current schema v5. Persist only the URL or local asset UUID. Store local assets
separately, attempt gzip only above 6 MiB, and use the compressed form only when
it reaches 6 MiB or less; otherwise retain the original. Render with centered
cover cropping.

### Why

Both source types are useful on a personal start page. Pre-save decoding avoids
replacing working wallpaper state with corrupt or non-image data, while
separate asset storage keeps the main configuration small and transactional.

### Consequences

PNG, JPEG, WebP, GIF, AVIF, and SVG are supported. Failed validation preserves
the previous wallpaper and shows an error. URL loading depends on the remote
server and is not cached. Local asset writes and config updates require rollback
and orphan cleanup. The manifest needs `unlimitedStorage` but no host access.

### Rejected Alternatives

- Persisting local data URLs inside the dashboard configuration.
- Lossy resize/re-encoding or rejecting every file above 6 MiB.
- Fetching remote images with broad `host_permissions`.
- Replacing the saved wallpaper before validation completes.

## ADR-008 — Переключаемый статический Liquid Glass для виджетов

Status: Accepted

### Decision

Применять theme-aware Liquid Glass только к поверхностям Markdown и Search.
Эффект включён по умолчанию, хранится в
`appearance.liquidGlass` схемы v5 и настраивается в закрытом разделе «Виджеты»
окна оформления. Общие для обеих тем параметры: прозрачность `0–100%`,
размытие `0–40 px` и тень `0–100%`; defaults — `40% / 18 px / 50%`. Ползунки
дают live preview и сохраняются после завершения ввода. Reset возвращает только
числовые параметры и не включает эффект. Реализация использует статический CSS
и корневые custom properties; панели управления и диалоги остаются
непрозрачными.

### Why

Обои должны быть видны сквозь виджеты, но текст и элементы управления обязаны
оставаться читаемыми при любой теме и при отсутствии поддержки blur.

### Consequences

Markdown имеет непрозрачную базовую карточку, а Search — bare-базу без внешней
капсулы. При включении общая semantic surface получает tint, рамку, тень и
`backdrop-filter`; без поддержки фильтра остаётся CSS-fallback. Миграции
v1/v2/v3 создают стандартную группу, а v4 сохраняет состояние переключателя.
Новые зависимости и разрешения не требуются.

### Rejected Alternatives

- Динамический эффект, отслеживающий указатель, и hover-анимация.
- Применение стекла к диалогам и служебным панелям.
- Раздельные значения параметров для светлой и тёмной темы.
- Сохранение в storage на каждое промежуточное движение ползунка.

## ADR-009 — Full versioned backup with atomic replacement

Status: Accepted

### Decision

Export the complete dashboard through a dedicated versioned JSON envelope. The
file contains the validated `DashboardConfig` and the active local wallpaper
asset when present; HTTPS wallpaper remains a URL. Import requires explicit
confirmation, validates the complete backup, and replaces rather than merges
the current dashboard. Restored local wallpaper receives a fresh UUID and uses
asset-first transactional storage with rollback.

### Why

A self-contained file provides predictable manual recovery and transfer without
adding accounts, sync, backend infrastructure, or new browser permissions.
Whole-dashboard replacement has clear appearance and layout semantics, while
widget merging would require conflict and placement rules that are not part of
the product.

### Consequences

The backup format has its own version independent of schema v5. Pending edits
flush before export/import joins the shared save queue. Invalid, foreign, and
future backup formats leave the active dashboard unchanged. HTTPS wallpaper
restore depends on the remote resource passing validation at import time.

### Rejected Alternatives

- Exporting only the main config and silently omitting local wallpaper bytes.
- Merging imported and current widgets or prompting for merge strategy.
- Reusing an imported wallpaper UUID and risking overwrite before commit.
- Adding the Chrome `downloads` permission for a Blob download.

## ADR-010 — Pomodoro widget with background timer and isolated runtime state

Status: Accepted

### Decision

Implement the Pomodoro timer widget as a `3×5` card with isolated runtime
state storage. Durations, cycle count, and sound preference are stored in
`PomodoroWidgetConfig` as part of `DashboardConfig`. All transient runtime
state (`status`, `phase`, `targetEndTime`, `remainingSeconds`, `cycleCount`,
`completedToday`, `lastResetDate`) is stored separately in WXT Storage under
`local:pomodoro-state:<id>`. Background timing uses `chrome.alarms` and a service
worker (`entrypoints/background.ts`) to deliver `chrome.notifications` and play
chimes via `chrome.offscreen` even when all start page tabs are closed. Open tabs
play a local Web Audio chime.

### Why

The Pomodoro timer must continue reliably while the user works in other tabs or
windows. Storing runtime state separately prevents periodic seconds countdowns
and alarms from polluting the serialized dashboard config save queue or causing
cross-tab race conditions.

### Consequences

Manifest permissions now include `alarms`, `notifications`, and `offscreen` in addition to
`storage`, `unlimitedStorage`, and `favicon`. Adding the widget remains fully
backward-compatible with schema v5 without requiring a schema version bump.
Background worker lifecycle is managed by Chrome and synchronized via storage
events.

### Rejected Alternatives

- Storing active countdown state and target timestamps in `DashboardConfig`,
  which would trigger constant saves and conflict with dashboard debouncing.
- A tab-only timer without `chrome.alarms`, which stops when tabs close.
- External audio files or web notification APIs that fail when backgrounded.

## ADR-011 — Extensible global theme system and design tokens

Status: Accepted

### Decision

Implement a global, token-based theme system covering all dashboard surfaces:
background, widgets, settings, modals, buttons, inputs, scrollbars, and Liquid
Glass. The architecture introduces `themes/` with a typed registry and 11
curated presets (`system`, `light`, `dark`, `tokyo-night`, `rainy-tokyo`,
`cozy-lofi-night`, `catppuccin-mocha`, `catppuccin-latte`, `nord`,
`synthwave-84`, `solarized-dark`).

CSS variables are defined per theme in `entrypoints/newtab/themes.css` and mapped
to Tailwind CSS 4 `@theme` classes (`bg-theme-surface`, `text-theme-text-primary`,
`border-theme-border`, `bg-theme-accent`). Theme selection synchronously updates
`data-theme` on the root DOM element. Selecting a theme card automatically updates
`backgroundColor` to the theme's default background color while preserving the
ability to customize it via the color picker.

### Why

Previously, colors were hardcoded with Tailwind `zinc-*` utility classes and
limited to basic dark/light mode switches. A centralized token architecture allows
rich, atmospheric themes (Tokyo Night, SynthWave '84, Catppuccin, Nord, etc.)
to be cleanly added without touching component templates or duplicating CSS rules.
Liquid Glass and widget states dynamically adapt to the active theme's palette.

### Consequences

All UI primitives and widgets use semantic `*-theme-*` tokens instead of
hardcoded `zinc` classes. `Theme` in `storage/schema.ts` is expanded to include all
11 theme IDs while retaining schema v5 compatibility (no version bump needed as
all older configs parse cleanly as valid theme IDs).

### Rejected Alternatives

- Hardcoding per-theme utility classes inside each React component.
- Requiring a schema v6 migration for theme preset expansion.
- Forcing a fixed background color with no manual color-picker customization.

## ADR-012 — Weather Widget and Open-Meteo Integration

Status: Accepted

### Decision

Add a `weather` widget type supporting visual and compact representations, powered
by [Open-Meteo](https://open-meteo.com/) Forecast and Geocoding APIs:

- City search and forecast endpoints use `host_permissions` (`https://api.open-meteo.com/*`
  and `https://geocoding-api.open-meteo.com/*`) declared in the manifest.
- Weather forecast data is cached in WXT Storage under `local:weather-cache:<id>`
  with a 30-minute freshness window and 5-minute retry backoff.
- The cache is not included in dashboard export/backup and is cleaned up on widget
  removal or backup import.
- Schema v5 is preserved without a version bump.
- Visual-mode artwork is built from local SVG/CSS layers driven by a pure scene
  model. It uses the existing forecast fields and adds no assets or permissions.
- Для карточек введён общий параметр `WidgetPresentation.cardInset`. Погода
  использует `none`, чтобы сцена занимала всю карточку; компактный вид задаёт
  внутренние отступы самостоятельно. Это не меняет сохранённую схему.

### Why

Open-Meteo offers comprehensive weather forecasts and GeoNames-based city geocoding
without requiring user API keys or a dedicated proxy backend, making it ideal for a
local-first browser extension. Isolated caching prevents excessive network requests
and guarantees instant new-tab load times.

### Consequences

Users must grant host permissions when configuring weather or choosing their location.
Ephemeral forecast data does not bloat backup archives. Visual effects adapt to day/night,
precipitation, apparent heat, UV, and wind while fully respecting
`prefers-reduced-motion`. Compact mode remains a structured data view.

### Rejected Alternatives

- Services requiring proprietary API keys (OpenWeatherMap, WeatherAPI).
- Persisting forecast responses or search queries directly in `DashboardConfig`.
- Background polling workers making network calls while tabs are inactive.

## ADR-013 — История компоновки и работа с группами

Статус: принято

### Решение

Хранить до 50 структурных действий в памяти вкладки. Координаты записывать
отдельно от содержимого виджетов; добавление и удаление восстанавливать с
исходными ID. Группу двигать только целиком, без наложений и выхода за 12
колонок. Буфер копирования использует отдельный версионированный JSON и
переносит локальные изображения, но не состояние Помодоро и кэши.

Сохранение конфигурации сериализуется Web Lock между вкладками. Перед записью
сверяется последняя принятая версия; конфликт с локальными правками требует
явного выбора пользователя. Ссылки на изображения, нужные для Undo в открытых
вкладках, временно хранятся в WXT `storage.session` и не входят в backup.

### Причина

История только в памяти не меняет схему v5 и не увеличивает размер обычного
backup. Ссылки на ресурсы в session storage позволяют другой вкладке очищать
ненужные файлы, не ломая доступный Undo. Явный конфликт предотвращает тихую
потерю правок при одновременной работе в двух вкладках.
