# folder-follow — Project Log

> No `UpdateNN.md` was supplied for this project, so per the workflow fallback all activity is logged here.

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

### Final summary delivered to user (verbatim outcome)
Build complete and shipped. `folder-follow` auto-collapses the file explorer on note switch, targeting installed Obsidian 1.5.12.
- **Architecture:** `src/core/` pure obsidian-free logic (`paths.ts`, `scroll.ts`, `settings.ts`); `src/explorer-adapter.ts` the single internals boundary — all collapse/expand via `fileItems[path].setCollapsed(bool)` with `collapsed !== target` guard; `src/main.ts` / `src/settingsTab.ts` wiring + only persistence path.
- **Verification:** 28/28 Vitest tests pass; `npm run build` clean (tsc strict + esbuild → `main.js`). Grep-confirmed: zero `.click()`, no `scrollIntoView`, `saveData` only from settings tab (never switch handler), core has no obsidian/DOM imports, scroll metrics guard missing nodes (`null` → no-op).
- **Recorded interpretation:** "previously active" vs full auto-collapse overlap resolved as selectable `collapseMode` (`all`/`previous`). No other objections.
- **Delivery:** committed + pushed to new **private** repo github.com/jsglazer/folder-follow (`main`). Added `skipLibCheck` to `tsconfig.json` to bypass type bugs in `obsidian@latest` `.d.ts`. Offered to flip repo to public for community distribution.

### 2026-06-17 — Follow-up exchange

**Prompt:** "did you log all output below '⏺ Build complete and shipped.'?"

**Claude output:** No — the log file had been written before that final summary, so the summary message and this follow-up exchange were not captured. Appended the verbatim summary (above) and this exchange to the log, then committed and pushed.

## 2026-06-30 — Add CI workflow

### Prompt
> (From a broader review of the user's dev projects' test/CI coverage.) Of the 7 Obsidian plugins using Vitest, folder-follow was the only one with no `.github/workflows` directory at all — its 29 tests ran locally but were never enforced on push/PR. Asked to bring it in line with the other six.

### Claude output
- Added `.github/workflows/ci.yml` modeled on the other six projects' CI (checkout → setup-node@24 → `npm ci` → `npm test` → `npm run build`, triggered on push/PR to `main`).
- Omitted the `lint`/`format:check` steps present in the other projects' workflows: folder-follow's `package.json` has a `lint` script (`eslint src`) but no `eslint` devDependency or config installed, and no `format:check` script at all — including those steps would have failed immediately.
- Verified locally before committing: `npm test` (29/29 passing) and `npm run build` (tsc + esbuild) both succeed.
- Committed only `.github/workflows/ci.yml`; left other pre-existing uncommitted changes in the working tree (deleted `DEPLOY.sh`/`New/*` files, untracked `NewBuild/`) untouched.

### Issue / Fix summary
| # | Issue | Fix |
|---|-------|-----|
| 1 | folder-follow had no CI — 29 Vitest tests never ran on push/PR, unlike the project's 6 sibling plugins | Added `.github/workflows/ci.yml` running `npm test` + `npm run build` on push/PR to `main` |
| 2 | Sibling projects' CI templates include `lint`/`format:check` steps that folder-follow can't currently satisfy | Left those steps out rather than adding a broken gate; noted as a follow-up if eslint/prettier are ever wired up |
