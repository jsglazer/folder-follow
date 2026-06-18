# folder-follow — Project Log

> No `UpdateXX.md` was supplied for this project, so per the workflow fallback all activity is logged here.

Version: 1.0.0

## 2026-06-17 — Initial build (from New-4-Code.filled.md)

### Prompt
> Follow the instructions in New-4-Code.filled.md and begin to build now. Confine all undocumented Obsidian internals (fileItems/setCollapsed/explorer view) to one thin adapter; use the internal API the audit specified (no synthetic clicks / DOM queries). Confirm the internal API shape against the installed Obsidian version and record the targeted version in the build manifest. Ask if ambiguous, else build straight through and record objections in the manifest.

### Claude output
- Confirmed installed Obsidian **1.5.12** (`/Applications/Obsidian.app` Info.plist); pinned `manifest.json` `minAppVersion` to 1.5.12; recorded the targeted internal contract in `BUILD-MANIFEST.md`.
- Implemented pure, obsidian-free decision logic in `src/core/` (paths, scroll, settings); confined ALL internals/DOM to `src/explorer-adapter.ts`; wired events in `src/main.ts`; settings UI in `src/settingsTab.ts`.
- All collapse/expand routed through `fileItems[path].setCollapsed(bool)` with `collapsed !== target` guard; scroll-centering via manual `scrollTop` (no `scrollIntoView`); colors via `:root` CSS custom properties (no inline styles).
- Wrote 28 Vitest unit tests across the three required surfaces (path resolver, scroll offset formula, settings parser). **28/28 pass.** `npm run build` (tsc strict + esbuild) is clean; `main.js` emitted.
- Resolved one ambiguity (the "previously active" vs. full auto-collapse overlap) as a selectable `collapseMode` (`all` / `previous`); recorded in the build manifest. No other objections.

### Issue / Fix summary
| # | Issue | Fix |
|---|-------|-----|
| 1 | Build to undocumented Obsidian internals without a future-proof blast radius | Isolated every `fileItems`/`setCollapsed`/scroll/DOM access into the single `src/explorer-adapter.ts`; core logic is pure and obsidian-free |
| 2 | `tsc` failed on type bugs inside `obsidian` "latest" `.d.ts` (`HistoryHandler.onHistoryBack`) | Added `skipLibCheck: true` to `tsconfig.json` (standard for Obsidian plugin templates) |
| 3 | `getFolderPaths` could misclassify leaf files as folders (files also expose `setCollapsed`) | Classify a path as a folder only when another item is nested under `path + "/"`; exclude the vault root |
| 4 | Risk of scroll-centering crashing on the virtualized list before rows paint | `getActiveItemMetrics` returns `null` on any missing element/metric; switch handler no-ops; measure deferred one `requestAnimationFrame` |
