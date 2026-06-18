"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FolderFollowPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/core/paths.ts
function getAncestorFolders(filePath) {
  const parts = filePath.split("/").filter((p) => p.length > 0);
  parts.pop();
  const result = [];
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    result.push(current);
  }
  return result;
}
function isUnderExcluded(folder, excluded) {
  return excluded.some((e) => e.length > 0 && (folder === e || folder.startsWith(`${e}/`)));
}
function sortParentFirst(paths) {
  return [...new Set(paths)].sort();
}
function computeExplorerActions(input) {
  const {
    activeFilePath,
    folders,
    previousFilePath = null,
    mode,
    excludedFolders = []
  } = input;
  const folderSet = new Set(folders);
  const activeAncestors = getAncestorFolders(activeFilePath);
  const keepExpanded = new Set(activeAncestors);
  let collapseCandidates;
  if (mode === "previous") {
    collapseCandidates = previousFilePath ? getAncestorFolders(previousFilePath).filter((f) => !keepExpanded.has(f)) : [];
  } else {
    collapseCandidates = [...folderSet].filter((f) => !keepExpanded.has(f));
  }
  const collapse = collapseCandidates.filter(
    (f) => folderSet.has(f) && !isUnderExcluded(f, excludedFolders)
  );
  const expand = activeAncestors.filter((f) => folderSet.has(f));
  return {
    expand: sortParentFirst(expand),
    collapse: sortParentFirst(collapse)
  };
}

// src/core/scroll.ts
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function computeCenteredScrollTop(input) {
  const {
    itemTop,
    itemHeight,
    viewportHeight,
    scrollHeight,
    offsetLevel,
    offsetStepPx
  } = input;
  const centeredTop = itemTop + itemHeight / 2 - viewportHeight / 2;
  const target = centeredTop + offsetLevel * offsetStepPx;
  const maxScroll = Math.max(0, scrollHeight - viewportHeight);
  return Math.round(clamp(target, 0, maxScroll));
}

// src/core/settings.ts
var SCROLL_OFFSET_MIN = -10;
var SCROLL_OFFSET_MAX = 10;
var DEFAULT_SETTINGS = {
  enableAutoCollapse: true,
  collapseMode: "all",
  centerActiveFile: true,
  scrollOffsetLevel: 0,
  enableActiveBackground: false,
  activeBgLight: "#e6f0ff",
  activeBgDark: "#22344d",
  enableHierarchyHighlight: false,
  hierarchyLight: "#1f6feb",
  hierarchyDark: "#58a6ff",
  excludedFolders: [],
  debounceMs: 50
};
function asBool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function asString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
function asNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function clampInt(value, min, max) {
  return Math.min(Math.max(Math.round(value), min), max);
}
function asStringArray(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return value.filter((v) => typeof v === "string").map((v) => v.trim().replace(/\/+$/, "")).filter((v) => v.length > 0);
}
function asCollapseMode(value, fallback) {
  return value === "all" || value === "previous" ? value : fallback;
}
function parseSettings(raw) {
  const d = DEFAULT_SETTINGS;
  const r = raw != null ? raw : {};
  return {
    enableAutoCollapse: asBool(r.enableAutoCollapse, d.enableAutoCollapse),
    collapseMode: asCollapseMode(r.collapseMode, d.collapseMode),
    centerActiveFile: asBool(r.centerActiveFile, d.centerActiveFile),
    scrollOffsetLevel: clampInt(
      asNumber(r.scrollOffsetLevel, d.scrollOffsetLevel),
      SCROLL_OFFSET_MIN,
      SCROLL_OFFSET_MAX
    ),
    enableActiveBackground: asBool(r.enableActiveBackground, d.enableActiveBackground),
    activeBgLight: asString(r.activeBgLight, d.activeBgLight),
    activeBgDark: asString(r.activeBgDark, d.activeBgDark),
    enableHierarchyHighlight: asBool(r.enableHierarchyHighlight, d.enableHierarchyHighlight),
    hierarchyLight: asString(r.hierarchyLight, d.hierarchyLight),
    hierarchyDark: asString(r.hierarchyDark, d.hierarchyDark),
    excludedFolders: asStringArray(r.excludedFolders, d.excludedFolders),
    debounceMs: clampInt(asNumber(r.debounceMs, d.debounceMs), 0, 2e3)
  };
}
var CSS_VARS = {
  activeBgLight: "--ff-active-bg-light",
  activeBgDark: "--ff-active-bg-dark",
  hierarchyLight: "--ff-hierarchy-light",
  hierarchyDark: "--ff-hierarchy-dark"
};
function buildCssVariables(settings) {
  return {
    [CSS_VARS.activeBgLight]: settings.activeBgLight,
    [CSS_VARS.activeBgDark]: settings.activeBgDark,
    [CSS_VARS.hierarchyLight]: settings.hierarchyLight,
    [CSS_VARS.hierarchyDark]: settings.hierarchyDark
  };
}

// src/explorer-adapter.ts
var CSS_CLASS = {
  activeFile: "ff-active-file",
  hierarchy: "ff-hierarchy",
  backgroundEnabled: "ff-bg-enabled",
  hierarchyEnabled: "ff-hierarchy-enabled"
};
var ExplorerAdapter = class {
  constructor(app) {
    this.app = app;
  }
  getLeaf() {
    var _a;
    return (_a = this.app.workspace.getLeavesOfType("file-explorer")[0]) != null ? _a : null;
  }
  getView() {
    var _a;
    const view = (_a = this.getLeaf()) == null ? void 0 : _a.view;
    return view != null ? view : null;
  }
  getFileItems() {
    var _a, _b;
    return (_b = (_a = this.getView()) == null ? void 0 : _a.fileItems) != null ? _b : null;
  }
  /**
   * Returns every folder path currently known to the explorer. Leaf-file items
   * also expose `setCollapsed`, so we classify an item as a folder only when
   * another item's path is nested under it (`path + "/"`). The vault root "/"
   * is excluded — it is never collapsed.
   */
  getFolderPaths() {
    const items = this.getFileItems();
    if (!items) return [];
    const paths = Object.keys(items);
    const folders = [];
    for (const path of paths) {
      if (path === "/" || path === "") continue;
      const prefix = `${path}/`;
      if (paths.some((other) => other !== path && other.startsWith(prefix))) {
        folders.push(path);
      }
    }
    return folders;
  }
  /**
   * Apply expand/collapse actions via `setCollapsed`. A state change is issued
   * ONLY when `item.collapsed !== target`, preventing redundant layout work.
   * Missing items are skipped silently (virtualized list may not hold them).
   */
  applyActions(actions) {
    const items = this.getFileItems();
    if (!items) return;
    this.setCollapsedFor(items, actions.expand, false);
    this.setCollapsedFor(items, actions.collapse, true);
  }
  setCollapsedFor(items, paths, target) {
    for (const path of paths) {
      const item = items[path];
      if (!item || typeof item.setCollapsed !== "function") continue;
      if (item.collapsed !== target) item.setCollapsed(target);
    }
  }
  /** The scrollable container of the explorer, or null if not mounted. */
  getScrollContainer() {
    const view = this.getView();
    if (!view) return null;
    return view.containerEl.querySelector(".nav-files-container");
  }
  /** The DOM element of the active file's row, or null if not rendered. */
  getItemEl(path) {
    var _a, _b, _c;
    const item = (_a = this.getFileItems()) == null ? void 0 : _a[path];
    return (_c = (_b = item == null ? void 0 : item.el) != null ? _b : item == null ? void 0 : item.selfEl) != null ? _c : null;
  }
  /**
   * Read the metrics needed for centering. Returns `null` if the active row,
   * the scroll container, or any required measurement is unavailable — the
   * virtualized list may not have painted the row yet. Callers must no-op on
   * null rather than guessing.
   */
  getActiveItemMetrics(path, offsetLevel, offsetStepPx) {
    const container = this.getScrollContainer();
    const itemEl = this.getItemEl(path);
    if (!container || !itemEl) return null;
    const itemHeight = itemEl.offsetHeight;
    const viewportHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;
    const itemTop = itemEl.offsetTop;
    if (itemHeight <= 0 || viewportHeight <= 0) return null;
    return {
      itemTop,
      itemHeight,
      viewportHeight,
      scrollHeight,
      offsetLevel,
      offsetStepPx: offsetStepPx && offsetStepPx > 0 ? offsetStepPx : itemHeight
    };
  }
  /** Write the computed scrollTop. No-ops if the container is gone. */
  setScrollTop(scrollTop) {
    const container = this.getScrollContainer();
    if (!container) return;
    container.scrollTop = scrollTop;
  }
  /** Write color CSS custom properties to the document root. */
  applyCssVariables(vars) {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }
  }
  /** Remove the CSS custom properties this plugin set. */
  clearCssVariables(varNames) {
    const root = document.documentElement;
    for (const name of varNames) root.style.removeProperty(name);
  }
  /** Toggle the body-level feature flags that gate the styling rules. */
  setFeatureFlags(background, hierarchy) {
    document.body.toggleClass(CSS_CLASS.backgroundEnabled, background);
    document.body.toggleClass(CSS_CLASS.hierarchyEnabled, hierarchy);
  }
  /**
   * Mark the active file row and its ancestor folder rows so `styles.css` can
   * color them via the CSS variables. Clears any previous marks first. No
   * inline styles are written here — only class toggles.
   */
  applyHighlightClasses(activePath, ancestorFolders) {
    var _a, _b, _c;
    this.clearHighlightClasses();
    const items = this.getFileItems();
    if (!items) return;
    const activeEl = this.getItemEl(activePath);
    if (activeEl) activeEl.addClass(CSS_CLASS.activeFile);
    for (const folder of ancestorFolders) {
      const el = (_c = (_a = items[folder]) == null ? void 0 : _a.el) != null ? _c : (_b = items[folder]) == null ? void 0 : _b.selfEl;
      if (el) el.addClass(CSS_CLASS.hierarchy);
    }
  }
  /** Remove all highlight classes this plugin applied. */
  clearHighlightClasses() {
    const view = this.getView();
    if (!view) return;
    view.containerEl.querySelectorAll(`.${CSS_CLASS.activeFile}, .${CSS_CLASS.hierarchy}`).forEach((el) => {
      el.removeClass(CSS_CLASS.activeFile);
      el.removeClass(CSS_CLASS.hierarchy);
    });
  }
};

// src/settingsTab.ts
var import_obsidian = require("obsidian");
var FolderFollowSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    new import_obsidian.Setting(containerEl).setName("Auto-collapse").setHeading();
    new import_obsidian.Setting(containerEl).setName("Auto-collapse on note switch").setDesc("Collapse inactive folder branches when you open a note.").addToggle(
      (t) => t.setValue(s.enableAutoCollapse).onChange(async (v) => {
        s.enableAutoCollapse = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Collapse strategy").setDesc(
      "Collapse all off-path folders, or only the branch you just navigated away from."
    ).addDropdown(
      (d) => d.addOption("all", "Collapse everything off-path").addOption("previous", "Collapse previously active branch only").setValue(s.collapseMode).onChange(async (v) => {
        s.collapseMode = v === "previous" ? "previous" : "all";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Excluded folders").setDesc(
      "One path per line. These folders (and their subfolders) are never auto-collapsed."
    ).addTextArea(
      (t) => t.setPlaceholder("Templates\nDaily/Archive").setValue(s.excludedFolders.join("\n")).onChange(async (v) => {
        s.excludedFolders = v.split("\n").map((line) => line.trim().replace(/\/+$/, "")).filter((line) => line.length > 0);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Debounce (ms)").setDesc("Coalesce rapid note switches to avoid explorer thrashing.").addText(
      (t) => t.setValue(String(s.debounceMs)).onChange(async (v) => {
        const n = Number(v);
        if (Number.isFinite(n)) {
          s.debounceMs = Math.min(Math.max(Math.round(n), 0), 2e3);
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Scroll").setHeading();
    new import_obsidian.Setting(containerEl).setName("Center active file").setDesc("Scroll the active file toward the center of the explorer.").addToggle(
      (t) => t.setValue(s.centerActiveFile).onChange(async (v) => {
        s.centerActiveFile = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Vertical offset").setDesc(`Shift the centered position. ${SCROLL_OFFSET_MIN} = up, 0 = centered, ${SCROLL_OFFSET_MAX} = down.`).addSlider(
      (sl) => sl.setLimits(SCROLL_OFFSET_MIN, SCROLL_OFFSET_MAX, 1).setValue(s.scrollOffsetLevel).setDynamicTooltip().onChange(async (v) => {
        s.scrollOffsetLevel = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Styling").setHeading();
    new import_obsidian.Setting(containerEl).setName("Highlight active background").setDesc("Apply a background color to the active file/folder tree item.").addToggle(
      (t) => t.setValue(s.enableActiveBackground).onChange(async (v) => {
        s.enableActiveBackground = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Active background \u2014 light theme").addColorPicker(
      (c) => c.setValue(s.activeBgLight).onChange(async (v) => {
        s.activeBgLight = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Active background \u2014 dark theme").addColorPicker(
      (c) => c.setValue(s.activeBgDark).onChange(async (v) => {
        s.activeBgDark = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Highlight folder hierarchy").setDesc("Color the folder hierarchy from the active file up to the root.").addToggle(
      (t) => t.setValue(s.enableHierarchyHighlight).onChange(async (v) => {
        s.enableHierarchyHighlight = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Hierarchy color \u2014 light theme").addColorPicker(
      (c) => c.setValue(s.hierarchyLight).onChange(async (v) => {
        s.hierarchyLight = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Hierarchy color \u2014 dark theme").addColorPicker(
      (c) => c.setValue(s.hierarchyDark).onChange(async (v) => {
        s.hierarchyDark = v;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/main.ts
var FolderFollowPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.previousFilePath = null;
  }
  async onload() {
    await this.loadSettings();
    this.adapter = new ExplorerAdapter(this.app);
    this.handleSwitch = (0, import_obsidian2.debounce)(
      (file) => this.onActiveFileChanged(file),
      this.settings.debounceMs,
      false
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => this.handleSwitch(file))
    );
    this.addSettingTab(new FolderFollowSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => this.applyStyling());
  }
  onunload() {
    var _a, _b, _c;
    (_a = this.adapter) == null ? void 0 : _a.clearHighlightClasses();
    (_b = this.adapter) == null ? void 0 : _b.clearCssVariables(Object.values(CSS_VARS));
    (_c = this.adapter) == null ? void 0 : _c.setFeatureFlags(false, false);
  }
  /** Core note-switch handler. Pure decisions in, adapter effects out. */
  onActiveFileChanged(file) {
    if (!file) return;
    const activePath = file.path;
    if (this.settings.enableAutoCollapse) {
      const actions = computeExplorerActions({
        activeFilePath: activePath,
        folders: this.adapter.getFolderPaths(),
        previousFilePath: this.previousFilePath,
        mode: this.settings.collapseMode,
        excludedFolders: this.settings.excludedFolders
      });
      this.adapter.applyActions(actions);
    }
    const ancestors = getAncestorFolders(activePath);
    this.adapter.applyHighlightClasses(activePath, ancestors);
    if (this.settings.centerActiveFile) {
      requestAnimationFrame(() => this.centerActiveFile(activePath));
    }
    this.previousFilePath = activePath;
  }
  centerActiveFile(path) {
    const metrics = this.adapter.getActiveItemMetrics(
      path,
      this.settings.scrollOffsetLevel
    );
    if (!metrics) return;
    this.adapter.setScrollTop(computeCenteredScrollTop(metrics));
  }
  /** Push current color settings + feature flags to the DOM (no vault writes). */
  applyStyling() {
    this.adapter.applyCssVariables(buildCssVariables(this.settings));
    this.adapter.setFeatureFlags(
      this.settings.enableActiveBackground,
      this.settings.enableHierarchyHighlight
    );
  }
  async loadSettings() {
    this.settings = parseSettings(await this.loadData());
  }
  /** Persist settings. Reachable only from the settings tab — never on switch. */
  async saveSettings() {
    await this.saveData(this.settings);
    this.applyStyling();
  }
};
