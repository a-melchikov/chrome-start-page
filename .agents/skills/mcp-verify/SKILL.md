---
name: mcp-verify
description: Procedures, flags, and targets for running MCP verifications (Lighthouse, Playwright, Chrome DevTools) on chrome-start-page.
---

# MCP Verification Runbook for Chrome Start Page

Use this runbook when proposing or running Model Context Protocol (MCP) verification tools for `chrome-start-page`.

## Policy and Interaction Rules

1. **No automatic execution**: Never run MCP checks automatically upon modifying code.
2. **Proactive proposal**: In tasks touching UI, visual layout, animations, Liquid Glass, or performance, ask the user via `ask_question` at the end of the task:
   `Я бы проверил это <что именно> через MCP <название>, потому что <причина>.`
3. **Failure handling**: If an MCP check reveals regressions or errors, isolate the root cause, propose a targeted fix, and resolve after confirmation.

---

## 1. Lighthouse MCP (Performance & Web Vitals)

- **Goal**: Measure Core Web Vitals (FCP, LCP, CLS, TBT) and ensure zero layout shift.
- **Prerequisite**: Must run against a release build to eliminate Vite dev-server overhead:
  ```bash
  pnpm build
  ```
- **Target Artifact**: `.output/chrome-mv3/newtab.html`
- **Key Targets**:
  - **FCP**: < 600 ms
  - **CLS**: 0 (grid and wallpapers must not cause layout jumps)
  - **TBT**: < 100 ms

---

## 2. Playwright MCP (Interactive User Flows)

- **Goal**: Verify E2E user flows, grid interactions, and keyboard navigation.
- **Browser Launch Flags**:
  ```bash
  google-chrome \
    --disable-extensions-except=$(pwd)/.output/chrome-mv3 \
    --load-extension=$(pwd)/.output/chrome-mv3 \
    chrome://newtab
  ```
  _(Or execute `pnpm preview:chrome`)_
- **Key Scenarios to Verify**:
  - Drag-and-drop and resize widgets in global edit mode.
  - Escape shortcut: closes active modal if open; otherwise exits edit mode.
  - Theme switching (Light / Dark / System) with contrast validation.
  - Adding, editing, and deleting Markdown and Search widgets.

---

## 3. Chrome DevTools MCP (CDP Inspection)

- **Goal**: Inspect runtime state, console diagnostics, and extension storage.
- **Connection**:
  - Connect to existing Chrome with remote debugging port (`http://127.0.0.1:9222`) or `--autoConnect`.
- **Key Verifications**:
  - Check `console.error` and `console.warn` on tab open and widget edit.
  - Inspect `chrome.storage.local` keys:
    - `local:dashboard-config`: verify schema version is `5` and structure matches `DashboardConfig`.
    - `local:dashboard-wallpaper:*`: ensure binary assets are properly referenced and cleaned up.
