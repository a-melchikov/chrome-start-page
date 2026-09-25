# Current State

Last updated: 2026-09-25

## Implemented

- WXT/React/TypeScript Manifest V3 new-tab extension, version 0.1.0.
- Version 5 local dashboard schema, defaults, runtime validation, queued saves,
  v1 LinksWidget → MarkdownWidget migration, v1/v2/v3 appearance migration,
  v4 Liquid Glass migration, and recovery of old v2 profiles by removing
  retired WIP Google Calendar widgets.
- Global extensible theme system and design tokens (`themes/`, `themes.css`,
  Tailwind CSS 4 `@theme`) with 11 curated presets: System, Light, Dark,
  Tokyo Night, Rainy Tokyo, Cozy Lofi Night, Catppuccin Mocha, Catppuccin Latte,
  Nord, SynthWave '84 (with neon glow), and Solarized Dark. All widgets, controls,
  dialogs, inputs, Liquid Glass surfaces, and scrollbars adapt dynamically to the
  active theme tokens.
- Interactive theme picker in the appearance dialog displaying visual preview
  cards with background, surface, and accent swatches, with automatic default
  background color synchronization and optional manual color picker override.
- Global edit mode with Escape exit, add/delete dialogs, appearance controls,
  drag/resize, per-widget constraints, and placement below the current grid.
- Multiple Markdown widgets with safe CommonMark/GFM/HTML rendering,
  interactive source-backed tasks, current-tab favicon links, HTTPS images,
  copyable code blocks, and fullscreen live split editing.
- Widget renderers load on demand by widget type; editors load only when opened.
- Multiple compact Search widgets with Google/Yandex/Bing/DuckDuckGo, fixed GET
  endpoints, local brand SVGs, icon fallback, one-row layout, and dialog settings.
- Bare Image widgets with offline local asset storage (compressed over 6 MiB, max
  32 MiB) and HTTPS URL support, 3×3 interactive object-positioning, canvas-based
  GIF pause/play toggle on click, recommended aspect-ratio grid sizing, optional
  alt text, and floating overlay controls in edit mode.
- Clock widgets with customizable digital time, date, and day of week, 12h/24h
  formats, 4 date presets, optional seconds, system local or IANA timezones with
  searchable selection, centered display without card title, timezone abbreviation, and
  container-query responsive typography.
- Light/dark/system themes, arbitrary persisted background, and local or HTTPS
  wallpaper rendered full-screen with cover cropping.
- Local PNG/JPEG/WebP/GIF/AVIF/SVG validation, conditional lossless compression
  above 6 MiB, transactional asset replacement, and original-byte fallback
  under `unlimitedStorage`.
- Accessible shared controls, focus restoration, cancellation of in-flight
  wallpaper validation, error reporting that preserves prior wallpaper, and
  Russian UI.
- Compact appearance dialog with initially collapsed Theme, Background,
  Wallpaper, and Widgets sections; wallpaper sources are nested as Local and
  URL controls.
- Включённый по умолчанию статический Liquid Glass для Markdown и Search с
  theme-aware tint, blur/saturation, светлой кромкой и тенью. Группа
  `appearance.liquidGlass` хранит переключатель и параметры прозрачности,
  размытия и тени; ползунки дают live preview, а reset возвращает стандартные
  `40% / 18 px / 50%`, не меняя переключатель. Выключенное состояние возвращает
  непрозрачную Markdown-карточку и bare Search без внешней капсулы. CSS-fallback
  сохраняет tint, рамку и тень без `backdrop-filter`.
- Separate «Импорт и экспорт» dialog in global edit mode. Export downloads a
  versioned JSON backup (format v2) with the complete dashboard, embedded local
  wallpaper, and all local widget images; confirmed import validates the file
  and atomically replaces the current state with rollback protection and fresh
  local asset IDs. Backups in format v1 remain fully supported.
- Automated tests for storage/migrations, wallpaper codecs/assets/transactions,
  backup format/import transactions, image assets/validation, state persistence,
  widget lifecycle, layout constraints, Markdown/security/tasks/editor, Search
  behavior, Image widget/editor, and App appearance/edit flows.

## Partially Implemented

- None recorded. Confirm new product scope with the user before extending it.

## Not Implemented / Known Limitations

- No configuration sync, reset/recovery UI, backend, accounts, sharing,
  analytics, telemetry, or Chrome Web Store release automation.
- Markdown excludes Math, Mermaid, frontmatter, uploads, syntax highlighting,
  and offline image caching.
- Search excludes history, suggestions, custom engines, and URL templates.
- A malformed or unsupported stored config shows an error and blocks the
  dashboard; there is no user-facing repair path.
- Narrow windows use horizontal scrolling rather than responsive grid reflow.

## Known Issues

- No confirmed application defect is recorded in source, tests, or current
  requirements.
- Production build has a 500 kB main new-tab chunk budget. Widgets and editors
  are split into on-demand chunks so unused widget code is not part of the
  initial new-tab chunk.
- Root `PLAN.md` is stale and untracked; it describes the removed LinksWidget and
  completed bootstrap prompts. Do not use it as a backlog or current spec.

## Next Logical Steps

- README names Google Calendar as a roadmap idea. Its product behavior is not
  specified, so ask the user before planning or implementing.
- If storage recovery becomes a priority, define UX and data-loss expectations
  before adding reset/repair behavior.
