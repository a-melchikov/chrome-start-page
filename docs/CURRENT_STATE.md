# Current State

Last updated: 2026-08-30

## Implemented

- WXT/React/TypeScript Manifest V3 new-tab extension, version 0.1.0.
- Version 2 local dashboard schema, defaults, runtime validation, queued saves,
  and v1 LinksWidget → MarkdownWidget migration.
- Global edit mode with Escape exit, add/delete dialogs, appearance controls,
  drag/resize, per-widget constraints, and placement below the current grid.
- Multiple Markdown widgets with safe CommonMark/GFM/HTML rendering,
  interactive source-backed tasks, current-tab favicon links, HTTPS images,
  copyable code blocks, and fullscreen live split editing.
- Multiple compact Search widgets with Google/Yandex/Bing/DuckDuckGo, fixed GET
  endpoints, local brand SVGs, icon fallback, one-row layout, and dialog settings.
- Light/dark/system themes, arbitrary persisted background, accessible shared
  controls, focus restoration, and Russian UI.
- Automated tests for storage/migrations, state persistence, widget lifecycle,
  layout constraints, Markdown/security/tasks/editor, Search behavior, and App
  appearance/edit flows.

## Partially Implemented

- None recorded. Confirm new product scope with the user before extending it.

## Not Implemented / Known Limitations

- No configuration sync, import/export, reset/recovery UI, backend, accounts,
  sharing, analytics, telemetry, or Chrome Web Store release automation.
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
  633 kB, above its 500 kB warning threshold. No bundle budget or code splitting
  is configured.
- Root `PLAN.md` is stale and untracked; it describes the removed LinksWidget and
  completed bootstrap prompts. Do not use it as a backlog or current spec.

## Next Logical Steps

- README names Clock and Google Calendar widgets as roadmap ideas. Their product
  behavior is not specified, so ask the user before planning or implementing.
- If storage recovery becomes a priority, define UX and data-loss expectations
  before adding reset/repair behavior.
