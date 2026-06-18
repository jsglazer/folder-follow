# Build Manifest — folder-follow

## Target environment
- **Installed Obsidian:** 1.5.12 (verified via `/Applications/Obsidian.app` Info.plist).
- **`minAppVersion` targeted:** 1.5.12.
- **Internal API targeted (confined to one adapter):**
  `app.workspace.getLeavesOfType('file-explorer')[0].view` exposing
  `fileItems: Record<path, { collapsed: boolean; setCollapsed(collapsed: boolean): void; el: HTMLElement; ... }>`.
  Collapse/expand is driven only through `fileItems[path].setCollapsed(bool)` — the shape audited for this build. This is the stable internal contract across the Obsidian 1.x line and matches how the developer's sibling repo (`dynamic-file-folder-highlighter`) reaches the explorer leaf (`getLeavesOfType('file-explorer')`).

## Files created
- `manifest.json` — plugin manifest; `minAppVersion` pinned to the targeted 1.5.12.
- `package.json` / `tsconfig.json` / `esbuild.config.mjs` / `vitest.config.ts` — build + test toolchain.
- `styles.css` — theme-aware styling driven entirely by CSS custom properties on `:root` (no inline styles).
- `src/core/paths.ts` — **pure** decision logic: active path → folders to expand/collapse. Zero `obsidian`/DOM imports.
- `src/core/scroll.ts` — **pure** scroll-centering offset math (`scrollTop` from viewport metrics). Zero imports.
- `src/core/settings.ts` — **pure** settings defaults, parser/validator, and CSS-variable builder. Zero imports.
- `src/explorer-adapter.ts` — **the only** module that touches Obsidian internals / DOM (`fileItems`, `setCollapsed`, `scrollTop`, class application). Single-file blast radius for any future API break.
- `src/main.ts` — `Plugin` subclass + event wiring (debounced note-switch handler). Delegates all decisions to `src/core/*` and all internals to the adapter.
- `src/settingsTab.ts` — settings UI (color pickers, toggles, offset, exclusions). The only place that persists `data.json`.
- `tests/paths.test.ts` / `tests/scroll.test.ts` / `tests/settings.test.ts` — deterministic Vitest units for the three required surfaces.

## Objections / notes for human resolution
- **Ambiguity resolved (not a blocker):** The concept lists both "auto-collapse on note switch" and "auto-collapse the folder that was *previously active*." Read literally, full auto-collapse already collapses the previous branch, so the second item is redundant. I interpreted them as two selectable strategies exposed via `collapseMode`: `'all'` (collapse every off-path folder — the audit's "keep only the active path expanded") and `'previous'` (collapse only the branch you navigated away from — lighter touch). `computeExplorerActions` supports both deterministically. If the intended semantics differ, only `core/paths.ts` + the one setting need to change.
- No other objections to the Build-to Constraints.

## Reviewer criteria → where satisfied
- **Zero folder-click simulation:** No `.click()` anywhere; all expand/collapse flows through `ExplorerAdapter.applyActions` → `fileItems[path].setCollapsed(...)` (`src/explorer-adapter.ts`). Grep-clean by construction.
- **No filesystem writes on note switch:** `src/main.ts` note-switch path calls only core (pure) + adapter (DOM-only). `saveData`/`saveSettings` is reachable **only** from `src/settingsTab.ts` user actions — never from the switch handler.
- **Scroll alignment guards missing DOM nodes:** `ExplorerAdapter.getActiveItemMetrics` returns `null` if the item element, scroll container, or any metric is missing; `src/main.ts` no-ops when metrics are `null`, and the pure formula is only invoked with complete metrics.

## Build-to Constraint → implementation
- `setCollapsed(bool)` only, no clicks → `ExplorerAdapter.applyActions`.
- Act only when `item.collapsed !== target` → guarded inside `applyActions`.
- Pure, obsidian-free decision logic → `src/core/paths.ts` (+ `scroll.ts`, `settings.ts`).
- CSS custom properties on document root, not inline styles → `ExplorerAdapter.applyCssVariables` + `styles.css`.
- Manual `scrollTop` (no `scrollIntoView`) → `core/scroll.ts` + `ExplorerAdapter.setScrollTop`.

## Deterministic tests → coverage
- Path resolver: `tests/paths.test.ts`.
- Scroll offset formula across viewport heights: `tests/scroll.test.ts`.
- Settings parser light/dark variable instantiation + persistence shape: `tests/settings.test.ts`.
