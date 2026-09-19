# AGENTS.md

## Project

Chrome Start Page is a local-first Manifest V3 extension that replaces Chrome's
new tab page with a configurable widget dashboard. The UI and documentation are
Russian-language. Current persisted schema version: `5`; current widget types:
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
- Never make assumptions or guess when requirements, UX, or implementation details are unclear; always ask the user for clarification before proceeding.

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
- Liquid Glass is enabled by default for Markdown and Search surfaces only. It
  is static, theme-aware, and can be configured or disabled from the collapsed
  «Виджеты» appearance section; controls and dialogs remain opaque.
- Escape closes the active dialog; with no dialog open, Escape exits global edit
  mode. Preserve focus restoration and accessible names.

## State / Storage Rules

- Persistent config key: `local:dashboard-config`; local wallpaper assets use
  `local:dashboard-wallpaper:<uuid>`. Use WXT Storage only, never `localStorage`
  or `chrome.storage.sync`.
- Immediate saves: add/remove, ordinary appearance changes, completed
  drag/resize, and Liquid Glass reset/toggle. Liquid Glass sliders preview in
  memory and flush after input completion, dialog close, `pagehide`, or
  unmount. Widget editor changes are debounced and must flush on finish,
  Escape, `pagehide`, and unmount. Preserve queued write ordering.
- Schema v5 supports `markdown`, `search`, wallpaper references, and grouped
  `appearance.liquidGlass` settings. V1/v2/v3 gain defaults; v4 preserves its
  boolean enabled state while gaining numeric defaults. V1 `links` widgets
  migrate to `markdown` without losing ID, title, content, or layout.
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

Run focused tests while iterating. Before handing off a code/config change, run
the unified verification pipeline:

```bash
pnpm check
```

This runs lint, Prettier check, typecheck, unit tests, and production build in a
single fail-fast step. UI/layout changes should receive a Chrome smoke check when
browser control is available.

### MCP Testing and Verification

Do not launch MCP servers automatically on file changes. When changes affect UI,
styles, widget grid, or performance-sensitive features (Liquid Glass, wallpapers,
rendering pipeline), proactively propose verification via `ask_question` at the
end of the task:

- `lighthouse`: audit Core Web Vitals (FCP, LCP, TBT, CLS) and loading overhead.
  Must run against a release build (`pnpm build`) loaded from `.output/chrome-mv3`.
- `playwright`: interactive E2E user flows (grid drag-and-drop, theme switching,
  modal dialogs, Escape shortcut navigation). May run against `pnpm dev`.
- `chrome-devtools`: console inspection (`console.error`/warnings), inspecting
  `chrome.storage.local` keys, and script profiling. May run against `pnpm dev`.

Environment Readiness Check: before proposing an MCP check, verify that the
environment is actually ready (e.g. browser binaries installed in
`~/.cache/ms-playwright` for Playwright, remote debugging port accessible for
Chrome DevTools, production build present for Lighthouse). Do not propose an MCP
tool via `ask_question` if its environment prerequisites are not met.

Proposal format: `Я бы проверил это <что именно> через MCP <название>, потому что <причина>.`
If an MCP check reveals errors or metric regressions, isolate the root cause,
propose a targeted fix, and resolve after user confirmation.

## Commands

- Install: `pnpm install`
- Develop: `pnpm dev`
- Format: `pnpm format`
- Format check: `pnpm format:check`
- Lint: `pnpm lint`
- Type check: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`
- Check all: `pnpm check`
- Package: `pnpm package`
- Preview Chrome: `pnpm preview:chrome`

## Git and Commits

- Do not commit or push without explicit user instruction.
- Follow Conventional Commits in English: `<type>(<scope>): <imperative summary>`.
  - Types and scopes based on repository history:
    - `feat(<scope>)`: `ui`, `storage`, `state`, `backup`, `wallpaper`
    - `fix(<scope>)`: `ui`, `storage`, etc.
    - `docs`: documentation and design specs (scope typically omitted, e.g. `docs: document liquid glass controls`)
    - `style(<scope>)`, `test(<scope>)`
  - Imperative lowercase summary with no trailing period (e.g., `feat(backup): add dashboard import and export`).
- Zero AI Footprint: never add AI, assistant, or tool attribution tags.
- Post-change requirement: after completing any changes in the repository,
  the agent must inspect `git status` and append a ready-to-run commit command
  at the very end of its response. The command must stage all relevant modified
  and untracked target files currently pending in `git status` (reflecting the
  full accumulated working tree state rather than only the latest message's
  diff). Do not use blanket `git add .` to avoid staging unrelated temporary
  files; list all target files explicitly:

  Предлагаю коммит:

  ```bash
  git add <file1> <file2> && git commit -m "<type>(<scope>): <message>"
  ```

## Planning Protocol ("составь план", "спланируй", "/plan")

When the user requests planning (triggers: "составь план", "спланируй", "/plan", or similar):

1. **Autonomous Research Phase**:
   - Deeply inspect current codebase, `docs/` architecture documents, configurations, and existing patterns.
   - Never ask questions that can be reliably answered from the repository.
2. **Iterative Interview Phase (`ask_question`)**:
   - Ask as many questions via `ask_question` as needed until zero ambiguity remains (typically 10–25 questions for large/architectural features; proportionally fewer for localized tasks).
   - Cover where applicable: goals/behavior, architecture/patterns, UI/UX, data/APIs/state, security/performance, backward compatibility, edge cases, acceptance criteria.
   - Clarify trade-offs when multiple viable options exist.
   - **Multi-round follow-up loop**: after receiving user answers, evaluate whether any ambiguities or follow-up questions remain. If so, ask another round of `ask_question` instead of generating the plan prematurely; repeat until zero ambiguity exists.
   - Exception: skip questioning only if the user explicitly specified "без вопросов" or "сразу пиши план".
3. **Strict No-Modification Rule**:
   - Do not begin implementation, create code files, or modify the repository during planning.
4. **Artifact Formulation**:
   - Once all questions are resolved, generate a comprehensive implementation plan as an interactive markdown Artifact (`RequestFeedback: true`).
   - Structure must include: understanding & goals, assumptions & risks, step-by-step tasks, affected files/modules, test strategy, and acceptance criteria.
   - In chat, output only a concise summary pointing to the artifact.
5. **Awaiting Confirmation**:
   - Do not start implementation until the user explicitly approves the plan.

## Post-Plan Iterations & Defect Resolution

When user feedback, bug reports, edge cases, or UX refinements arrive after a plan has been implemented:

1. **Lightweight Surgical Cycle**: Do not restart the full `/plan` interview protocol unless the user explicitly requests `/plan` for a major new subsystem or schema migration. Apply a fast, focused cycle instead.
2. **Root-Cause Isolation**: Analyze code, active tests, or provided screenshots immediately. Do not ask questions that can be diagnosed directly from the workspace state; however, if user intent, reproduction context, or desired fix behavior is unclear, ask clarifying questions instead of guessing.
3. **Targeted Implementation**: Make minimal, surgical edits addressing the exact feedback without touching unrelated modules or styles.
4. **Focused Verification**: Run targeted unit tests (`pnpm test <path>`) followed by the unified pipeline (`pnpm check`).
5. **Atomic Delivery**: Provide a concise technical summary and the ready-to-run `git add <file1> <file2> && git commit ...` command.

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
