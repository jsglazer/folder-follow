/**
 * Settings UI. This is the ONLY place that persists `data.json` (via
 * `plugin.saveSettings`), and it does so strictly in response to user input —
 * never during a note switch.
 */

import { App, PluginSettingTab, Setting } from "obsidian";
import { SCROLL_OFFSET_MAX, SCROLL_OFFSET_MIN } from "./core/settings";
import type FolderFollowPlugin from "./main";

export class FolderFollowSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: FolderFollowPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;

		new Setting(containerEl)
			.setName("Enable folder-follow")
			.setDesc("Master switch. Turns off all follow behavior without disabling the plugin.")
			.addToggle((t) =>
				t.setValue(s.enabled).onChange(async () => {
					await this.plugin.toggleEnabled();
				}),
			);

		new Setting(containerEl).setName("Auto-collapse").setHeading();

		new Setting(containerEl)
			.setName("Auto-collapse on note switch")
			.setDesc("Collapse inactive folder branches when you open a note.")
			.addToggle((t) =>
				t.setValue(s.enableAutoCollapse).onChange(async (v) => {
					s.enableAutoCollapse = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Collapse strategy")
			.setDesc(
				"Collapse all off-path folders, or only the branch you just navigated away from.",
			)
			.addDropdown((d) =>
				d
					.addOption("all", "Collapse everything off-path")
					.addOption("previous", "Collapse previously active branch only")
					.setValue(s.collapseMode)
					.onChange(async (v) => {
						s.collapseMode = v === "previous" ? "previous" : "all";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Excluded folders")
			.setDesc(
				"One path per line. These folders (and their subfolders) are never auto-collapsed.",
			)
			.addTextArea((t) =>
				t
					.setPlaceholder("Templates\nDaily/Archive")
					.setValue(s.excludedFolders.join("\n"))
					.onChange(async (v) => {
						s.excludedFolders = v
							.split("\n")
							.map((line) => line.trim().replace(/\/+$/, ""))
							.filter((line) => line.length > 0);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Debounce (ms)")
			.setDesc("Coalesce rapid note switches to avoid explorer thrashing.")
			.addText((t) =>
				t.setValue(String(s.debounceMs)).onChange(async (v) => {
					const n = Number(v);
					if (Number.isFinite(n)) {
						s.debounceMs = Math.min(Math.max(Math.round(n), 0), 2000);
						await this.plugin.saveSettings();
					}
				}),
			);

		new Setting(containerEl).setName("Scroll").setHeading();

		new Setting(containerEl)
			.setName("Center active file")
			.setDesc("Scroll the active file toward the center of the explorer.")
			.addToggle((t) =>
				t.setValue(s.centerActiveFile).onChange(async (v) => {
					s.centerActiveFile = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Vertical offset")
			.setDesc(`Shift the centered position. ${SCROLL_OFFSET_MIN} = up, 0 = centered, ${SCROLL_OFFSET_MAX} = down.`)
			.addSlider((sl) =>
				sl
					.setLimits(SCROLL_OFFSET_MIN, SCROLL_OFFSET_MAX, 1)
					.setValue(s.scrollOffsetLevel)
					.setDynamicTooltip()
					.onChange(async (v) => {
						s.scrollOffsetLevel = v;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl).setName("Styling").setHeading();

		new Setting(containerEl)
			.setName("Highlight active background")
			.setDesc("Apply a background color to the active file/folder tree item.")
			.addToggle((t) =>
				t.setValue(s.enableActiveBackground).onChange(async (v) => {
					s.enableActiveBackground = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Active background — light theme")
			.addColorPicker((c) =>
				c.setValue(s.activeBgLight).onChange(async (v) => {
					s.activeBgLight = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Active background — dark theme")
			.addColorPicker((c) =>
				c.setValue(s.activeBgDark).onChange(async (v) => {
					s.activeBgDark = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Highlight folder hierarchy")
			.setDesc("Color the folder hierarchy from the active file up to the root.")
			.addToggle((t) =>
				t.setValue(s.enableHierarchyHighlight).onChange(async (v) => {
					s.enableHierarchyHighlight = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Hierarchy color — light theme")
			.addColorPicker((c) =>
				c.setValue(s.hierarchyLight).onChange(async (v) => {
					s.hierarchyLight = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Hierarchy color — dark theme")
			.addColorPicker((c) =>
				c.setValue(s.hierarchyDark).onChange(async (v) => {
					s.hierarchyDark = v;
					await this.plugin.saveSettings();
				}),
			);
	}
}
