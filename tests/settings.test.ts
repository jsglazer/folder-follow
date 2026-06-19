import { describe, expect, it } from "vitest";
import {
	buildCssVariables,
	CSS_VARS,
	DEFAULT_SETTINGS,
	parseSettings,
	SCROLL_OFFSET_MAX,
	SCROLL_OFFSET_MIN,
} from "../src/core/settings";

describe("parseSettings", () => {
	it("returns defaults for empty / null input", () => {
		expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
	});

	it("defaults enabled to true and respects a persisted false", () => {
		expect(parseSettings({}).enabled).toBe(true);
		expect(parseSettings({ enabled: false }).enabled).toBe(false);
		expect(parseSettings({ enabled: "no" }).enabled).toBe(true);
	});

	it("merges valid persisted values over defaults", () => {
		const parsed = parseSettings({
			enableAutoCollapse: false,
			collapseMode: "previous",
			activeBgLight: "#ffffff",
			activeBgDark: "#000000",
			hierarchyLight: "#111111",
			hierarchyDark: "#222222",
		});
		expect(parsed.enableAutoCollapse).toBe(false);
		expect(parsed.collapseMode).toBe("previous");
		expect(parsed.activeBgLight).toBe("#ffffff");
		expect(parsed.activeBgDark).toBe("#000000");
		expect(parsed.hierarchyLight).toBe("#111111");
		expect(parsed.hierarchyDark).toBe("#222222");
	});

	it("instantiates both light and dark color variables independently", () => {
		const parsed = parseSettings({ activeBgLight: "#abcabc" });
		// light overridden, dark falls back to default — both present
		expect(parsed.activeBgLight).toBe("#abcabc");
		expect(parsed.activeBgDark).toBe(DEFAULT_SETTINGS.activeBgDark);
		expect(parsed.hierarchyLight).toBe(DEFAULT_SETTINGS.hierarchyLight);
		expect(parsed.hierarchyDark).toBe(DEFAULT_SETTINGS.hierarchyDark);
	});

	it("clamps the scroll offset into range and rounds it", () => {
		expect(parseSettings({ scrollOffsetLevel: 999 }).scrollOffsetLevel).toBe(SCROLL_OFFSET_MAX);
		expect(parseSettings({ scrollOffsetLevel: -999 }).scrollOffsetLevel).toBe(SCROLL_OFFSET_MIN);
		expect(parseSettings({ scrollOffsetLevel: 2.7 }).scrollOffsetLevel).toBe(3);
	});

	it("rejects an invalid collapse mode and falls back to default", () => {
		expect(parseSettings({ collapseMode: "bogus" }).collapseMode).toBe(
			DEFAULT_SETTINGS.collapseMode,
		);
	});

	it("sanitizes excluded folders (trims, drops trailing slash and blanks)", () => {
		const parsed = parseSettings({
			excludedFolders: ["  Templates/  ", "", "Daily/Archive", 42],
		});
		expect(parsed.excludedFolders).toEqual(["Templates", "Daily/Archive"]);
	});

	it("ignores wrong-typed fields and uses defaults", () => {
		const parsed = parseSettings({
			enableAutoCollapse: "yes",
			scrollOffsetLevel: "5",
			activeBgLight: 123,
		});
		expect(parsed.enableAutoCollapse).toBe(DEFAULT_SETTINGS.enableAutoCollapse);
		expect(parsed.scrollOffsetLevel).toBe(DEFAULT_SETTINGS.scrollOffsetLevel);
		expect(parsed.activeBgLight).toBe(DEFAULT_SETTINGS.activeBgLight);
	});

	it("round-trips: parsing its own output is stable (save/load shape)", () => {
		const once = parseSettings({ collapseMode: "previous", scrollOffsetLevel: 4 });
		const twice = parseSettings(once);
		expect(twice).toEqual(once);
	});
});

describe("buildCssVariables", () => {
	it("maps light and dark colors to their root custom properties", () => {
		const vars = buildCssVariables({
			...DEFAULT_SETTINGS,
			activeBgLight: "#aaa",
			activeBgDark: "#bbb",
			hierarchyLight: "#ccc",
			hierarchyDark: "#ddd",
		});
		expect(vars).toEqual({
			[CSS_VARS.activeBgLight]: "#aaa",
			[CSS_VARS.activeBgDark]: "#bbb",
			[CSS_VARS.hierarchyLight]: "#ccc",
			[CSS_VARS.hierarchyDark]: "#ddd",
		});
	});

	it("emits exactly the four documented variable names", () => {
		const names = Object.keys(buildCssVariables(DEFAULT_SETTINGS)).sort();
		expect(names).toEqual(
			[
				CSS_VARS.activeBgDark,
				CSS_VARS.activeBgLight,
				CSS_VARS.hierarchyDark,
				CSS_VARS.hierarchyLight,
			].sort(),
		);
	});
});
