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

Keep the extension backend-free and telemetry-free. Manifest permissions remain
`storage` and `favicon`; no host permissions. User links use Chrome's local
favicon endpoint, while external images and explicit search submissions follow
their documented network behavior.

### Why

The product is a personal start page and does not require accounts, remote
configuration, analytics, or broad access to browsing data.

### Consequences

There is no device sync or collaboration. New permissions/network integrations
need explicit justification and documentation.

### Rejected Alternatives

- Backend, authorization, analytics, telemetry, broad `host_permissions`, and
  external favicon APIs.
