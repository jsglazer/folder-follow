import { describe, expect, it } from "vitest";
import {
	computeExplorerActions,
	getAncestorFolders,
	isUnderExcluded,
} from "../src/core/paths";

describe("getAncestorFolders", () => {
	it("returns ancestor folders root-first, excluding the file", () => {
		expect(getAncestorFolders("a/b/c/note.md")).toEqual(["a", "a/b", "a/b/c"]);
	});

	it("returns empty for a root-level file", () => {
		expect(getAncestorFolders("note.md")).toEqual([]);
	});

	it("ignores stray leading/duplicate slashes", () => {
		expect(getAncestorFolders("a//b/note.md")).toEqual(["a", "a/b"]);
	});
});

describe("isUnderExcluded", () => {
	it("matches the folder itself and its subtree, not siblings", () => {
		expect(isUnderExcluded("Templates", ["Templates"])).toBe(true);
		expect(isUnderExcluded("Templates/sub", ["Templates"])).toBe(true);
		expect(isUnderExcluded("TemplatesX", ["Templates"])).toBe(false);
		expect(isUnderExcluded("Other", ["Templates"])).toBe(false);
	});
});

describe("computeExplorerActions — mode 'all'", () => {
	const folders = ["a", "a/b", "a/b/c", "x", "x/y", "z"];

	it("expands the active path and collapses every off-path folder", () => {
		const result = computeExplorerActions({
			activeFilePath: "a/b/c/note.md",
			folders,
			mode: "all",
		});
		expect(result.expand).toEqual(["a", "a/b", "a/b/c"]);
		expect(result.collapse).toEqual(["x", "x/y", "z"]);
	});

	it("never collapses excluded folders or their subtree", () => {
		const result = computeExplorerActions({
			activeFilePath: "a/b/c/note.md",
			folders,
			mode: "all",
			excludedFolders: ["x"],
		});
		expect(result.collapse).toEqual(["z"]);
	});

	it("only references folders that actually exist", () => {
		const result = computeExplorerActions({
			activeFilePath: "ghost/missing/note.md",
			folders,
			mode: "all",
		});
		expect(result.expand).toEqual([]);
		expect(result.collapse).toEqual(["a", "a/b", "a/b/c", "x", "x/y", "z"]);
	});

	it("orders output parent-before-child deterministically", () => {
		const result = computeExplorerActions({
			activeFilePath: "x/y/note.md",
			folders: ["a/b/c", "a", "a/b", "x", "x/y"],
			mode: "all",
		});
		expect(result.collapse).toEqual(["a", "a/b", "a/b/c"]);
		expect(result.expand).toEqual(["x", "x/y"]);
	});
});

describe("computeExplorerActions — mode 'previous'", () => {
	const folders = ["a", "a/b", "a/b/c", "a/x", "z"];

	it("collapses only the previous branch no longer on the active path", () => {
		const result = computeExplorerActions({
			activeFilePath: "a/x/note.md",
			previousFilePath: "a/b/c/old.md",
			folders,
			mode: "previous",
		});
		expect(result.expand).toEqual(["a", "a/x"]);
		expect(result.collapse).toEqual(["a/b", "a/b/c"]);
	});

	it("collapses nothing when there is no previous file", () => {
		const result = computeExplorerActions({
			activeFilePath: "a/x/note.md",
			previousFilePath: null,
			folders,
			mode: "previous",
		});
		expect(result.collapse).toEqual([]);
		expect(result.expand).toEqual(["a", "a/x"]);
	});

	it("respects exclusions in previous mode", () => {
		const result = computeExplorerActions({
			activeFilePath: "a/x/note.md",
			previousFilePath: "a/b/c/old.md",
			folders,
			mode: "previous",
			excludedFolders: ["a/b/c"],
		});
		expect(result.collapse).toEqual(["a/b"]);
	});
});
