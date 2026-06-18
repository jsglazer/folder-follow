/**
 * Explorer adapter — THE ONLY module permitted to touch Obsidian's undocumented
 * file-explorer internals or the DOM.
 *
 * Every use of `getLeavesOfType('file-explorer')`, `view.fileItems`,
 * `item.setCollapsed`, `item.collapsed`, scroll metrics, class application, and
 * CSS-variable writes lives here and nowhere else. If Obsidian breaks this
 * internal shape, this one file is the fix; `src/core/*` never references it.
 *
 * Targeted internal contract (Obsidian 1.5.12): the file-explorer leaf's view
 * exposes `fileItems: Record<vaultPath, FileExplorerItem>` where each item has a
 * boolean `collapsed` and a `setCollapsed(collapsed: boolean): void` method plus
 * an `el: HTMLElement`. We drive collapse/expand exclusively through that method
 * — never through synthetic clicks.
 */

import { App, WorkspaceLeaf } from "obsidian";
import { ExplorerActions } from "./core/paths";
import { ScrollCenterInput } from "./core/scroll";

/** Minimal structural view of an internal explorer item. */
interface FileExplorerItem {
	collapsed: boolean;
	setCollapsed(collapsed: boolean): void;
	el?: HTMLElement;
	selfEl?: HTMLElement;
	file?: { path: string };
}

/** Minimal structural view of the internal file-explorer view. */
interface FileExplorerView {
	containerEl: HTMLElement;
	fileItems?: Record<string, FileExplorerItem>;
}

/** CSS classes this adapter owns on explorer elements / document body. */
export const CSS_CLASS = {
	activeFile: "ff-active-file",
	hierarchy: "ff-hierarchy",
	backgroundEnabled: "ff-bg-enabled",
	hierarchyEnabled: "ff-hierarchy-enabled",
} as const;

export class ExplorerAdapter {
	constructor(private readonly app: App) {}

	private getLeaf(): WorkspaceLeaf | null {
		return this.app.workspace.getLeavesOfType("file-explorer")[0] ?? null;
	}

	private getView(): FileExplorerView | null {
		const view = this.getLeaf()?.view as unknown as FileExplorerView | undefined;
		return view ?? null;
	}

	private getFileItems(): Record<string, FileExplorerItem> | null {
		return this.getView()?.fileItems ?? null;
	}

	/**
	 * Returns every folder path currently known to the explorer. Leaf-file items
	 * also expose `setCollapsed`, so we classify an item as a folder only when
	 * another item's path is nested under it (`path + "/"`). The vault root "/"
	 * is excluded — it is never collapsed.
	 */
	getFolderPaths(): string[] {
		const items = this.getFileItems();
		if (!items) return [];
		const paths = Object.keys(items);
		const folders: string[] = [];
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
	applyActions(actions: ExplorerActions): void {
		const items = this.getFileItems();
		if (!items) return;
		this.setCollapsedFor(items, actions.expand, false);
		this.setCollapsedFor(items, actions.collapse, true);
	}

	private setCollapsedFor(
		items: Record<string, FileExplorerItem>,
		paths: readonly string[],
		target: boolean,
	): void {
		for (const path of paths) {
			const item = items[path];
			if (!item || typeof item.setCollapsed !== "function") continue;
			if (item.collapsed !== target) item.setCollapsed(target);
		}
	}

	/** The scrollable container of the explorer, or null if not mounted. */
	private getScrollContainer(): HTMLElement | null {
		const view = this.getView();
		if (!view) return null;
		return view.containerEl.querySelector<HTMLElement>(".nav-files-container");
	}

	/** The DOM element of the active file's row, or null if not rendered. */
	private getItemEl(path: string): HTMLElement | null {
		const item = this.getFileItems()?.[path];
		return item?.el ?? item?.selfEl ?? null;
	}

	/**
	 * Read the metrics needed for centering. Returns `null` if the active row,
	 * the scroll container, or any required measurement is unavailable — the
	 * virtualized list may not have painted the row yet. Callers must no-op on
	 * null rather than guessing.
	 */
	getActiveItemMetrics(
		path: string,
		offsetLevel: number,
		offsetStepPx?: number,
	): ScrollCenterInput | null {
		const container = this.getScrollContainer();
		const itemEl = this.getItemEl(path);
		if (!container || !itemEl) return null;

		const itemHeight = itemEl.offsetHeight;
		const viewportHeight = container.clientHeight;
		const scrollHeight = container.scrollHeight;
		// offsetTop is relative to the nearest positioned ancestor; the explorer
		// rows are laid out within the scroll container, so this is the in-content
		// top we need. Guard against a detached (zero-sized) container.
		const itemTop = itemEl.offsetTop;
		if (itemHeight <= 0 || viewportHeight <= 0) return null;

		return {
			itemTop,
			itemHeight,
			viewportHeight,
			scrollHeight,
			offsetLevel,
			offsetStepPx: offsetStepPx && offsetStepPx > 0 ? offsetStepPx : itemHeight,
		};
	}

	/** Write the computed scrollTop. No-ops if the container is gone. */
	setScrollTop(scrollTop: number): void {
		const container = this.getScrollContainer();
		if (!container) return;
		container.scrollTop = scrollTop;
	}

	/** Write color CSS custom properties to the document root. */
	applyCssVariables(vars: Record<string, string>): void {
		const root = document.documentElement;
		for (const [name, value] of Object.entries(vars)) {
			root.style.setProperty(name, value);
		}
	}

	/** Remove the CSS custom properties this plugin set. */
	clearCssVariables(varNames: readonly string[]): void {
		const root = document.documentElement;
		for (const name of varNames) root.style.removeProperty(name);
	}

	/** Toggle the body-level feature flags that gate the styling rules. */
	setFeatureFlags(background: boolean, hierarchy: boolean): void {
		document.body.toggleClass(CSS_CLASS.backgroundEnabled, background);
		document.body.toggleClass(CSS_CLASS.hierarchyEnabled, hierarchy);
	}

	/**
	 * Mark the active file row and its ancestor folder rows so `styles.css` can
	 * color them via the CSS variables. Clears any previous marks first. No
	 * inline styles are written here — only class toggles.
	 */
	applyHighlightClasses(activePath: string, ancestorFolders: readonly string[]): void {
		this.clearHighlightClasses();
		const items = this.getFileItems();
		if (!items) return;

		const activeEl = this.getItemEl(activePath);
		if (activeEl) activeEl.addClass(CSS_CLASS.activeFile);

		for (const folder of ancestorFolders) {
			const el = items[folder]?.el ?? items[folder]?.selfEl;
			if (el) el.addClass(CSS_CLASS.hierarchy);
		}
	}

	/** Remove all highlight classes this plugin applied. */
	clearHighlightClasses(): void {
		const view = this.getView();
		if (!view) return;
		view.containerEl
			.querySelectorAll(`.${CSS_CLASS.activeFile}, .${CSS_CLASS.hierarchy}`)
			.forEach((el) => {
				el.removeClass(CSS_CLASS.activeFile);
				el.removeClass(CSS_CLASS.hierarchy);
			});
	}
}
