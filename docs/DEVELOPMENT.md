# Development

## Requirements

- Node.js 22 (`.nvmrc`)
- pnpm 10.34.5 (pinned in `package.json`)
- Google Chrome with Manifest V3 support for manual testing

With nvm/corepack:

```bash
nvm use
corepack enable
```

## Install

```bash
pnpm install
```

`postinstall` runs `wxt prepare`; `.wxt/` is generated and ignored.

## Run

```bash
pnpm dev
```

Load `.output/chrome-mv3-dev` through `chrome://extensions` → Developer mode →
Load unpacked. After changes, wait for WXT to rebuild and reopen the new tab;
reload the extension if Chrome has not picked up the build.

## Quality Checks

```bash
pnpm exec prettier --check .
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm format` writes Prettier changes. Prefer a focused Vitest invocation while
iterating, then run the complete suite before handoff.

## Build and Package

```bash
pnpm build
pnpm package
```

- Unpacked production extension: `.output/chrome-mv3`
- ZIP package: `.output/chrome-start-page-0.1.0-chrome.zip`

Both paths are generated and ignored by Git.

## Project-specific Notes

- Tests use jsdom, React Testing Library, WXT's Vitest plugin, and fake browser
  storage. Native `<dialog>` behavior is shimmed in `tests/setup.ts`.
- Vitest may print a non-fatal WXT debug message about the optional `web-ext`
  runner. The project does not use that runner; rely on the test exit status.
- Unit/integration tests cannot fully verify Chrome new-tab replacement,
  extension asset loading, drag feel, or icon contrast. Smoke-test UI/layout
  changes in the loaded extension when browser control is available.
- The manifest is generated from `wxt.config.ts`; do not add a standalone
  `manifest.json`.
- Static runtime assets belong in `public/`; extension source icons live in
  `assets/`. Do not edit generated `.wxt/` or `.output/` files.
- `PLAN.md` is an obsolete, untracked bootstrap plan and is intentionally
  excluded from Prettier. Current requirements live in code, README, and the
  context documents.
