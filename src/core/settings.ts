/**
 * Pure settings model: defaults, a defensive parser/validator, and the builder
 * that maps settings to root-level CSS custom properties.
 *
 * Imports nothing. The shell calls `parseSettings` on whatever `data.json`
 * yields and `buildCssVariables` to get the `:root` properties to write — colors
 * are delivered as CSS variables, never as inline element styles.
 */

import type { CollapseMode } from "./paths";

export interface FolderFollowSettings {
	/** Master switch for the auto-collapse behavior. */
	enableAutoCollapse: boolean;
	/** "all" = collapse every off-path folder; "previous" = only the branch left. */
	collapseMode: CollapseMode;
	/** Scroll the active file toward the viewport center on switch. */
	centerActiveFile: boolean;
	/** Vertical offset level for centering, clamped to [-10, 10]; 0 = centered. */
	scrollOffsetLevel: number;
	/** Apply a background color to the active file/folder tree item. */
	enableActiveBackground: boolean;
	activeBgLight: string;
	activeBgDark: string;
	/** Highlight the folder hierarchy from the active file up to the root. */
	enableHierarchyHighlight: boolean;
	hierarchyLight: string;
	hierarchyDark: string;
	/** Folders exempt from auto-collapse (folder + its subtree). */
	excludedFolders: string[];
	/** Debounce window (ms) to coalesce rapid note switches. */
	debounceMs: number;
}

export const SCROLL_OFFSET_MIN = -10;
export const SCROLL_OFFSET_MAX = 10;

export const DEFAULT_SETTINGS: FolderFollowSettings = {
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
	debounceMs: 50,
};

function asBool(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampInt(value: number, min: number, max: number): number {
	return Math.min(Math.max(Math.round(value), min), max);
}

function asStringArray(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value)) return [...fallback];
	return value
		.filter((v): v is string => typeof v === "string")
		.map((v) => v.trim().replace(/\/+$/, ""))
		.filter((v) => v.length > 0);
}

function asCollapseMode(value: unknown, fallback: CollapseMode): CollapseMode {
	return value === "all" || value === "previous" ? value : fallback;
}

/**
 * Merge unknown persisted data over the defaults, validating every field and
 * clamping ranges. Always returns a fully-populated, well-typed settings object
 * regardless of how malformed the input is.
 */
export function parseSettings(raw: unknown): FolderFollowSettings {
	const d = DEFAULT_SETTINGS;
	const r = (raw ?? {}) as Record<string, unknown>;
	return {
		enableAutoCollapse: asBool(r.enableAutoCollapse, d.enableAutoCollapse),
		collapseMode: asCollapseMode(r.collapseMode, d.collapseMode),
		centerActiveFile: asBool(r.centerActiveFile, d.centerActiveFile),
		scrollOffsetLevel: clampInt(
			asNumber(r.scrollOffsetLevel, d.scrollOffsetLevel),
			SCROLL_OFFSET_MIN,
			SCROLL_OFFSET_MAX,
		),
		enableActiveBackground: asBool(r.enableActiveBackground, d.enableActiveBackground),
		activeBgLight: asString(r.activeBgLight, d.activeBgLight),
		activeBgDark: asString(r.activeBgDark, d.activeBgDark),
		enableHierarchyHighlight: asBool(r.enableHierarchyHighlight, d.enableHierarchyHighlight),
		hierarchyLight: asString(r.hierarchyLight, d.hierarchyLight),
		hierarchyDark: asString(r.hierarchyDark, d.hierarchyDark),
		excludedFolders: asStringArray(r.excludedFolders, d.excludedFolders),
		debounceMs: clampInt(asNumber(r.debounceMs, d.debounceMs), 0, 2000),
	};
}

/** CSS custom-property names written to the document root. */
export const CSS_VARS = {
	activeBgLight: "--ff-active-bg-light",
	activeBgDark: "--ff-active-bg-dark",
	hierarchyLight: "--ff-hierarchy-light",
	hierarchyDark: "--ff-hierarchy-dark",
} as const;

/**
 * Build the `:root` CSS custom properties for both themes. `styles.css` selects
 * between the light/dark variable based on the body's `.theme-dark` /
 * `.theme-light` class, so theme switches need no recomputation here.
 */
export function buildCssVariables(
	settings: FolderFollowSettings,
): Record<string, string> {
	return {
		[CSS_VARS.activeBgLight]: settings.activeBgLight,
		[CSS_VARS.activeBgDark]: settings.activeBgDark,
		[CSS_VARS.hierarchyLight]: settings.hierarchyLight,
		[CSS_VARS.hierarchyDark]: settings.hierarchyDark,
	};
}
