# AGENTS.md

## Project

Chrome Start Page is a local-first Manifest V3 extension that replaces Chrome's
new tab page with a configurable widget dashboard. The UI and documentation are
Russian-language. Current persisted schema version: `3`; current widget types:
`markdown` and `search`.

Source code and configuration are the source of truth for implementation state.
`PLAN.md` is an obsolete bootstrap plan and must not be treated as the current
specification.

## Stack

- Node.js 22 (`.nvmrc`), pnpm 10 (`packageManager` in `package.json`)
- WXT 0.21, Manifest V3, React 19, strict TypeScript
- Tailwind CSS 4, `react-grid-layout`
- WXT Storage backed by `chrome.storage.local`
- Vitest, React Testing Library, ESLint, Prettier
- Markdown: `react-markdown`, `remark-gfm`, `rehype-raw`, `rehype-sanitize`

## Repository Structure

- `entrypoints/newtab/` — WXT new-tab entrypoint and React composition root
- `components/dashboard/` — dashboard controls, widget host, grid integration
- `components/ui/` — small reusable primitives; no domain logic
- `widgets/` — typed registry and widget implementations
- `storage/` — schema, defaults, runtime validation, migrations, repository
- `hooks/` — React state/persistence orchestration
- `tests/` — storage, domain, and React integration tests
- `public/` — assets copied into the extension build

## Architecture

- Keep React UI, domain/widget logic, layout helpers, and storage separate.
- All widget integration goes through `widgets/registry.tsx` and the typed
  `WidgetConfigMap`; do not add dashboard-wide type branches.
- Persist raw domain config only. Rendered Markdown/HTML, parsed links, search
  queries, and ephemeral editor state are not persisted.
- Treat values loaded from storage as `unknown`; validate/migrate them before
  use. Incompatible schema changes require a version bump and migration.
- Keep platform API access behind an abstraction. React components must not
  call `chrome.storage` directly.
- See `docs/ARCHITECTURE.md` before changing module boundaries, storage,
  registry, Markdown processing, or grid behavior.

## Development Rules

- Use strict types and discriminated unions; do not introduce `any` or generic
  `settings` bags.
- Preserve backward compatibility for saved dashboards. Add runtime validation
  and migration tests with every persisted schema change.
- Reuse `components/ui/` and `components/icons.tsx`; do not add a large UI or
  icon library for isolated needs.
- Add dependencies or Chrome permissions only when necessary and document why.
- Keep factories deterministic except for the ID supplied by the registry.
- Add or update focused tests with every behavior change.

## Code Style

- User-facing strings and project documentation are in Russian; code symbols
  are in English.
- React components use PascalCase `.tsx`; hooks use the `use-` prefix; widget
  implementations live in `widgets/<type>/`.
- Follow Prettier (`singleQuote`, trailing commas) and the configured ESLint
  rules. Use `pnpm format` only when formatting changes are intended.

## UI Rules

- The dashboard is a 12-column desktop canvas with a 960 px minimum width;
  narrow viewports scroll horizontally instead of rewriting saved coordinates.
- Drag/resize is available only in global edit mode. Do not reintroduce a
  vertical bound that prevents placing widgets below the current grid.
- Shared control icons use the outline system in `components/icons.tsx`; keep
  their sizing, stroke, variants, and light/dark contrast visually consistent.
  Search-engine brand marks are the deliberate exception and use bundled SVGs.
- Arbitrary user-selected backgrounds must not make controls unreadable.
- `MarkdownWidget` is a card with a prominent fixed title and scrollable body.
  `SearchWidget` is bare, has no visible title/card, and remains one grid row
  high with horizontal resizing only.
- Escape closes the active dialog; with no dialog open, Escape exits global edit
  mode. Preserve focus restoration and accessible names.

## State / Storage Rules

- Persistent config key: `local:dashboard-config`; local wallpaper assets use
  `local:dashboard-wallpaper:<uuid>`. Use WXT Storage only, never `localStorage`
  or `chrome.storage.sync`.
- Immediate saves: add/remove, appearance, completed drag/resize. Widget editor
  changes are debounced and must flush on finish, Escape, `pagehide`, and
  unmount. Preserve queued write ordering.
- Schema v3 supports `markdown`, `search`, and wallpaper references; v1 `links`
  widgets migrate to `markdown` without losing ID, title, content, or layout.
- Search widget height is normalized to `1` during load/save.

## Error Handling and Security

- Surface storage failures to the user; do not silently accept malformed or
  unsupported configurations.
- Render user Markdown through the existing parse/sanitize pipeline. Never use
  unsanitized HTML or `dangerouslySetInnerHTML`.
- Links are HTTP/HTTPS only and stay in the current tab. Images are absolute
  HTTPS only and keep lazy loading plus `no-referrer`.
- Search uses fixed HTTPS GET endpoints, never persists queries, and performs no
  request before explicit submit.
- Do not add backend calls, analytics, telemetry, external favicon APIs, broad
  `host_permissions`, or executable user widgets.

## Testing

Run focused tests while iterating. Before handing off a code/config change, run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Also run `pnpm exec prettier --check .` for documentation or broad formatting
changes. UI/layout changes should receive a Chrome smoke check when browser
control is available.

## Commands

- Install: `pnpm install`
- Develop: `pnpm dev`
- Format: `pnpm format`
- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`
- Package: `pnpm package`

## Change Rules

- Before changes, inspect the relevant implementation, tests, git status, and
  the context files listed below.
- Do not disturb unrelated user changes or generated directories (`.wxt/`,
  `.output/`, `node_modules/`).
- After architecture changes, update `docs/ARCHITECTURE.md` and, when a durable
  choice changed, `docs/DECISIONS.md`.
- After durable requirement changes, update `docs/PROJECT_CONTEXT.md`.
- After a substantial milestone or status change, update
  `docs/CURRENT_STATE.md`.
- After command/tooling changes, update `docs/DEVELOPMENT.md` and this file if
  needed. Do not update context docs for every small implementation edit.
- If context docs materially disagree with code, determine the current truth,
  complete the task from that state, and update the stale context file when it
  is in scope.

## Do Not

- Do not revive the removed specialized `LinksWidget`; v2 uses Markdown.
- Do not bypass the registry, storage repository, migrations, or sanitizer.
- Do not persist derived view data or transient search/editor input.
- Do not change product scope based only on the historical `PLAN.md`.

## Context Loading

Always read this file. Read only when the task requires it:

- `docs/PROJECT_CONTEXT.md` — product behavior, constraints, limitations
- `docs/ARCHITECTURE.md` — data flow and architectural boundaries
- `docs/DECISIONS.md` — accepted decisions and rejected alternatives
- `docs/DEVELOPMENT.md` — environment, commands, manual extension workflow
- `docs/CURRENT_STATE.md` — implemented status and next logical work
