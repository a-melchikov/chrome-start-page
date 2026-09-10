# Current State

Last updated: 2026-09-10

## Implemented

- WXT/React/TypeScript Manifest V3 new-tab extension, version 0.1.0.
- Version 5 local dashboard schema, defaults, runtime validation, queued saves,
  v1 LinksWidget → MarkdownWidget migration, v1/v2/v3 appearance migration,
  v4 Liquid Glass migration, and recovery of old v2 profiles by removing
  retired WIP Google Calendar widgets.
- Global edit mode with Escape exit, add/delete dialogs, appearance controls,
  drag/resize, per-widget constraints, and placement below the current grid.
- Multiple Markdown widgets with safe CommonMark/GFM/HTML rendering,
  interactive source-backed tasks, current-tab favicon links, HTTPS images,
  copyable code blocks, and fullscreen live split editing.
- Multiple compact Search widgets with Google/Yandex/Bing/DuckDuckGo, fixed GET
  endpoints, local brand SVGs, icon fallback, one-row layout, and dialog settings.
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
  versioned JSON backup with the complete dashboard and embedded local
  wallpaper; confirmed import validates the file and atomically replaces the
  current state with rollback protection and fresh local asset IDs.
- Automated tests for storage/migrations, wallpaper codecs/assets/transactions,
  backup format/import transactions, image validation, state persistence,
  widget lifecycle, layout constraints, Markdown/security/tasks/editor, Search
  behavior, and App appearance/edit flows.

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
- Production build succeeds, but WXT reports the main new-tab chunk at about
  665 kB, above its 500 kB warning threshold. No bundle budget or code splitting
  is configured.
- Root `PLAN.md` is stale and untracked; it describes the removed LinksWidget and
  completed bootstrap prompts. Do not use it as a backlog or current spec.

## Next Logical Steps

- README names Clock and Google Calendar widgets as roadmap ideas. Their product
  behavior is not specified, so ask the user before planning or implementing.
- If storage recovery becomes a priority, define UX and data-loss expectations
  before adding reset/repair behavior.
