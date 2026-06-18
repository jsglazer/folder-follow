---
Project: folder-follow
Created: 2026-06-17 16:39
Modified: 
Status: Open
Note:
---

# Concept
## Purpose
An Obsidian plugin that auto-collapses the file explorer when you switch notes. Obsidian auto-expands to reveal the active note but never collapses, so the sidebar grows unbounded as you open files. Existing plugins do this but are old and slow; goal is a faster, modern version with more options than similar plugin provide.

## Scope
Platforms: Obsidian
User base: Community
Distribution: via Obsidian developer's channel

## Features
- auto-collapse on note switch
- Option to center the active file on scroll
- Option to auto-collapse folder that were previously active after switching to another note
- Option to apply a background (one color for dark and one for light themes) to the background of the current file & folder tree
- Option to Highlight the folder hierarchy to the root (one color for dark and one for light themes)

## Reference projects
- Highlight Active Folder Section - https://github.com/justanotherjurastudent/highlight-active-folder-section

## AI Concept Review
### AI Interview
- **Captured concept**
  - **Purpose:** A fast, modern Obsidian plugin that automatically collapses inactive folder branches in the file explorer on note switch, resolving the UI clutter of an unbounded sidebar without causing the stutter/lag observed in existing solutions.
  - **Scope:**
    - **Platforms:** Obsidian Desktop (macOS/Windows/Linux) is primary; iOS support is nice-to-have.
    - **Users & Distribution:** Published to the general community via the Obsidian community plugin store.
  - **Features:**
    - **Must-Have (v1):**
      - Auto-collapse file explorer branches on note switch (keeping only the active note's path expanded).
      - Option to auto-collapse the folder that was previously active after switching to another note.
      - Option to center the active file on scroll in the sidebar.
      - Option to apply a custom background color to the active file/folder tree item (configured separately for light and dark themes using a color picker UI).
      - Option to highlight the folder hierarchy to the root (configured separately for light and dark themes using a color picker UI).
      - All settings stored in the standard `data.json` file.
    - **Nice-to-Have:**
      - An adjustable vertical offset setting for the scroll-centering feature (e.g., from -10 to +10, where 0 is centered).
      - iOS/Mobile compatibility.
  - **Non-goals:** No writes to files or directories in the vault; no changes to the explorer tree state except during a note switch event.
  - **Proposed Language/Runtime:** TypeScript (Obsidian plugin API).
- **Reference leads**
  - [Highlight Active Folder Section](https://github.com/justanotherjurastudent/highlight-active-folder-section) — incumbent plugin with reported performance lag.
  - `dynamic-file-folder-highlighter` — an adjacent repository of the developer's containing existing hierarchical highlighting logic.
- **Handoff to audit**
  The concept focuses on a community plugin that merges auto-collapse behavior with custom styling and scroll-centering. The critical requirement is performance: reducing note-switch UI stutter/lag by 75% relative to the incumbent to achieve instantaneous transitions. The technical audit should focus on:
  1. Identifying the specific DOM traversal/observer inefficiencies in the incumbent plugin and the developer's adjacent `dynamic-file-folder-highlighter` repo.
  2. Confirming how scroll-centering (including the custom vertical offset) can be cleanly implemented within Obsidian's virtualized, dynamic sidebar DOM.
  3. Ensuring styling options (custom backgrounds and hierarchical highlights) interact robustly with various custom themes and dark/light modes.

### AI Audit

### Verdict
- **Feasibility (solo, local-first):** High
- **Automated-testability:** Hybrid — state and path resolution logic are fully headless; virtual DOM state and scroll computations require visual QA or Obsidian runtime.
- **Recommendation:** Build new project
- **Single biggest risk:** Obsidian's virtualized sidebar DOM causes immediate scroll centering to fail or misalign when folders are programmatically expanded, because child elements are not instantly instantiated in the DOM.
- **Confidence:** High — Prior art analysis of the incumbent and sibling repositories reveals clear paths to resolve performance lags and styling virtualization hurdles.

### 1. Prior Art & Repo Alignment
- The core features (auto-collapse, folder highlighting, auto-scroll) already exist in the incumbent plugin `highlight-active-folder-section` [VERIFIED via source check].
- However, the incumbent's implementation of auto-collapse queries the entire DOM and sequentially fires synthetic clicks (`folderEl.click()`) with timers, leading to massive layout thrashing and UI stutter in large vaults.
- The sibling repository [dynamic-file-folder-highlighter](file:///Users/josh/Dev/Obsidian/dynamic-file-folder-highlighter/src/main.ts) focuses on static regex/YAML coloring rules via DOM observers and does not cover dynamic viewport-follow actions.
- **Deciding factor:** Build a new project. The proposed features are highly dynamic, event-driven behaviors centered around note switching. Bundling this logic with the static coloring rules of the highlighter repo would overcomplicate settings and trigger redundant evaluations.

### 2. High-Risk Technical Hurdles
- **Performance lag from DOM operations:** Sequential click-simulation thrashing can be bypassed entirely by utilizing Obsidian's internal `fileItems` API to call `item.setCollapsed(boolean)` directly on the state objects, but this requires handling undocumented internals.
- **Virtualized sidebar positioning:** Immediate scroll-centering calls fail after expanding a folder. The DOM is virtualized and does not paint the children synchronously. A post-collapse rendering buffer (e.g., `requestAnimationFrame` or `setTimeout`) is necessary before performing scroll top calculations.
- **Custom scroll offsets:** Native `scrollIntoView` cannot handle customizable offset levels. A manual calculation of `scrollContainer.scrollTop` is required, which is highly sensitive to vault UI theme paddings.
- **CSS specificity conflicts:** Light and dark custom background styles applied to active nodes can collide with third-party CSS rules that target `.nav-file-title` with `!important` flags.

### 3. Testability & Automation (critical)
- **Hardest to mock/isolate:** The Obsidian global `app` state, active workspace leaf transitions, and DOM scroll dimensions (`scrollContainer.scrollTop`, `clientHeight`).
- **Headless verdict:** ~60% of the plugin is headlessly verifiable. The core path computation logic—mapping an active file path to the list of folders that must be collapsed/expanded—can be structured as pure, Obsidian-free functions and tested via Vitest. The rendering details (scroll centering, style application, and layout offset calculations) require visual QA.
- **Sandbox hazards:** Low. The plugin strictly reads UI states and writes to the plugin settings file (`data.json`); it performs no vault filesystem writes.

### 4. Forward Constraints (feeds the pipeline)
- **Builder constraints (for Opus 4.8):**
  - All folder collapse/expand operations must run through the internal `fileExplorer.view.fileItems[path].setCollapsed(bool)` API instead of synthetic click triggers.
  - Collapse updates must only execute if `item.collapsed !== targetCollapsed` to prevent redundant UI layout updates.
  - Isolate path calculation logic (which folders to expand/collapse based on active path) into pure, testable functions with zero `obsidian` module dependencies.
  - Implement scroll centering with customizable offset by calculating and setting the container's `scrollTop` rather than using `scrollIntoView`.
  - Store color customizations as root-level CSS custom properties instead of injecting multiple inline styles directly on elements.
- **Deterministic test requirements (the backstop):**
  - Unit-test path parser rules: given a file path and a directory structure, return the correct lists of paths to collapse and expand.
  - Unit-test the scroll offset calculation formula using mocked dimensions to verify math correctness.
  - Unit-test settings load/save structures to verify theme variable persistence.
- **Reviewer criteria (for Gemini Flash, enforced by reading):**
  - Confirm that NO folder click simulations (`.click()`) exist in the source code.
  - Confirm that scroll centering is safely guarded against missing DOM nodes.
  - Confirm that no files are written to the vault during note-switch events.

### 5. Complementary Features
- **Exclusion folders:** A setting listing specific directories that are exempt from auto-collapsing.
- **Debounced note switches:** A customizable transition window to avoid explorer thrashing during rapid note navigation.

### Machine-readable constraints (mandatory)

<!-- PIPELINE-CONSTRAINTS:BEGIN -->
```yaml
recommendation: "Build new project"
feasibility: "High"
hurdles:
  - "Obsidian's virtualized file explorer DOM causes immediate scroll centering to fail after expanding folders because child nodes are not instantly rendered."
  - "Simulating clicks or querying the DOM on note switch causes layout thrashing and UI stutter in large vaults."
  - "CSS specificity collisions with custom Obsidian themes that overwrite active file/folder styles."
builder_constraints:
  - "Use the internal fileItems[path].setCollapsed(bool) API instead of simulating DOM clicks."
  - "Apply collapse state changes only when the target state differs from the current item.collapsed status."
  - "Decouple decision logic (computing which paths should collapse/expand) from the Obsidian API into pure testable functions."
  - "Configure custom styling colors by writing CSS custom properties to the document root rather than injecting inline styles into elements."
  - "Implement scroll-centering with vertical offset by calculating and setting the container's scrollTop rather than relying on scrollIntoView."
deterministic_tests:
  - "Unit-test the path-resolving function: given file path and current explorer structure, verify the expected collapse/expand array."
  - "Unit-test the scroll-centering offset formula for correct scrollTop computation across different viewport heights."
  - "Unit-test the settings parser to ensure light and dark color variables are correctly instantiated and saved."
reviewer_criteria:
  - "Confirm zero folder-click simulation calls in the codebase."
  - "Confirm that no filesystem writes are performed on note switch."
  - "Verify that scroll alignment logic safely guards against missing DOM elements in virtualized lists."
```
<!-- PIPELINE-CONSTRAINTS:END -->
---
# Architecture
Languages: 
