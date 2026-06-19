/**
 * Plugin shell: event wiring only.
 *
 * This file owns no decision logic and no internal-API access. It listens for
 * note switches, asks `src/core/*` (pure) what to do, and asks
 * `ExplorerAdapter` (the single internals boundary) to do it. It performs NO
 * filesystem writes on note switch — settings persistence happens only from the
 * settings tab in response to user input.
 */

import { Notice, Plugin, debounce, TFile } from "obsidian";
import { computeExplorerActions, getAncestorFolders } from "./core/paths";
import { computeCenteredScrollTop } from "./core/scroll";
import {
	buildCssVariables,
	CSS_VARS,
	DEFAULT_SETTINGS,
	FolderFollowSettings,
	parseSettings,
} from "./core/settings";
import { ExplorerAdapter } from "./explorer-adapter";
import { FolderFollowSettingTab } from "./settingsTab";

export default class FolderFollowPlugin extends Plugin {
	settings: FolderFollowSettings = DEFAULT_SETTINGS;
	private adapter!: ExplorerAdapter;
	private previousFilePath: string | null = null;
	private handleSwitch!: (file: TFile | null) => void;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.adapter = new ExplorerAdapter(this.app);

		this.handleSwitch = debounce(
			(file: TFile | null) => this.onActiveFileChanged(file),
			this.settings.debounceMs,
			false,
		);

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => this.handleSwitch(file)),
		);

		this.addSettingTab(new FolderFollowSettingTab(this.app, this));

		this.addCommand({
			id: "toggle-follow",
			name: "Toggle folder-follow",
			callback: () => this.toggleEnabled(),
		});

		// Apply styling once the layout is ready.
		this.app.workspace.onLayoutReady(() => this.applyStyling());
	}

	onunload(): void {
		this.adapter?.clearHighlightClasses();
		this.adapter?.clearCssVariables(Object.values(CSS_VARS));
		this.adapter?.setFeatureFlags(false, false);
	}

	/** Core note-switch handler. Pure decisions in, adapter effects out. */
	private onActiveFileChanged(file: TFile | null): void {
		if (!this.settings.enabled) return;
		if (!file) return;
		const activePath = file.path;

		if (this.settings.enableAutoCollapse) {
			const actions = computeExplorerActions({
				activeFilePath: activePath,
				folders: this.adapter.getFolderPaths(),
				previousFilePath: this.previousFilePath,
				mode: this.settings.collapseMode,
				excludedFolders: this.settings.excludedFolders,
			});
			this.adapter.applyActions(actions);
		}

		const ancestors = getAncestorFolders(activePath);
		this.adapter.applyHighlightClasses(activePath, ancestors);

		if (this.settings.centerActiveFile) {
			// The virtualized list does not paint expanded children synchronously;
			// defer the measure-and-scroll one frame so rows exist before we read
			// their geometry.
			requestAnimationFrame(() => this.centerActiveFile(activePath));
		}

		this.previousFilePath = activePath;
	}

	private centerActiveFile(path: string): void {
		const metrics = this.adapter.getActiveItemMetrics(
			path,
			this.settings.scrollOffsetLevel,
		);
		if (!metrics) return; // row/container not rendered — guard the virtualized list
		this.adapter.setScrollTop(computeCenteredScrollTop(metrics));
	}

	/** Push current color settings + feature flags to the DOM (no vault writes). */
	applyStyling(): void {
		this.adapter.applyCssVariables(buildCssVariables(this.settings));
		this.adapter.setFeatureFlags(
			this.settings.enabled && this.settings.enableActiveBackground,
			this.settings.enabled && this.settings.enableHierarchyHighlight,
		);
	}

	/** Command + settings-tab entry point: flip the master switch and reset visual state. */
	async toggleEnabled(): Promise<void> {
		this.settings.enabled = !this.settings.enabled;
		await this.saveSettings();

		if (!this.settings.enabled) {
			this.adapter.clearHighlightClasses();
		} else {
			this.onActiveFileChanged(this.app.workspace.getActiveFile());
		}

		new Notice(`Folder-follow ${this.settings.enabled ? "enabled" : "disabled"}`);
	}

	async loadSettings(): Promise<void> {
		this.settings = parseSettings(await this.loadData());
	}

	/** Persist settings. Reachable only from the settings tab — never on switch. */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.applyStyling();
	}
}
