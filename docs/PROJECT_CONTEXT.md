# Project Context

## Purpose

Chrome Start Page is a private, local-first Chrome extension that replaces the
new tab page with a configurable dashboard. Its main flow is: open a new tab,
use saved widgets, enter global edit mode to add/move/resize/configure them, and
have the complete dashboard restored from local Chrome storage.

## Current Product

Version 0.1.0 implements two repeatable widget types:

- **Markdown** — a resizable `4×3` card by default with a separate title,
  sanitized CommonMark/GFM rendering, interactive task lists, safe links and
  HTTPS images. Editing uses a fullscreen 50/50 Markdown/live-preview dialog.
- **Search** — a bare `6×1` search row by default. Google, Yandex, Bing, and
  DuckDuckGo use fixed GET endpoints and bundled brand icons. Its height is
  fixed; only width and engine are configurable.

The dashboard has light/dark/system themes, an arbitrary background color, a
12-column draggable/resizable grid, autosave, deletion confirmation, keyboard
dialog behavior, and restoration after Chrome restarts.

## Core Requirements

- Multiple independent widget instances with UUIDs and persisted layouts.
- Global edit mode controls add, delete, drag, resize, widget settings, and
  appearance. Escape exits edit mode when no dialog is active.
- User edits appear immediately in React state; editor writes are debounced but
  flushed when editing ends or the page is hidden.
- Search opens results in the current tab only after Enter/button submission;
  blank queries are blocked and query text is never stored.
- Markdown source is the only content source of truth. Task checkbox clicks
  update the exact source marker rather than a derived model.
- Existing v1 `links` data migrates to v2 `markdown` without data or layout
  loss. Existing search height is normalized to one row.

## Durable Decisions

- The old specialized LinksWidget has been fully replaced by the universal
  MarkdownWidget; do not expose `links` as a current registry type.
- Widget types are a typed discriminated union registered through one registry.
- Persistence is WXT Storage over `chrome.storage.local`; no sync storage,
  localStorage, backend, account, analytics, or telemetry.
- User Markdown may contain a limited safe HTML subset only after sanitization.
- User links use Chrome's local `_favicon`; search-engine icons are bundled SVGs
  and work offline. External favicon APIs are forbidden.
- Narrow screens keep a 960 px desktop canvas and horizontal scrolling so saved
  coordinates are never silently rearranged.

Rationale and rejected alternatives are in `docs/DECISIONS.md`.

## Platform and Privacy Constraints

- Manifest V3 permissions are limited to `storage` and `favicon`; there are no
  `host_permissions`.
- Links allow HTTP/HTTPS. Images require absolute HTTPS and use `no-referrer`.
- Search endpoints are fixed in code; custom templates, suggestions, and search
  history are outside current scope.
- Search brand icons are local. Link favicons come from Chrome's internal cache;
  arbitrary linked pages are not fetched by extension code.
- All controls must remain legible in both themes over any chosen background.

## Known Limitations

- No sync, import/export, reset UI, accounts, sharing, or Chrome Web Store
  publishing workflow.
- Markdown has no Math, Mermaid, YAML frontmatter, file upload, syntax
  highlighting, or offline image cache.
- Search has no history, online suggestions, or custom engines.
- Invalid/future storage schemas surface an error; there is no user-facing
  recovery/reset flow.

## Current Priorities

No unfinished product requirement is recorded. README lists Clock and Google
Calendar widgets as roadmap ideas; confirm scope with the user before starting
either. See `docs/CURRENT_STATE.md` for the latest handoff status.
