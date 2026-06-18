/**
 * Pure path-resolution logic for the file explorer.
 *
 * This module imports NOTHING from `obsidian` and touches no DOM. Given an
 * active file path and the set of folder paths currently in the explorer, it
 * computes which folders must be expanded and which must be collapsed. The
 * Obsidian-facing shell feeds these arrays to the adapter; the adapter applies
 * them. Keeping this logic pure makes every collapse/expand decision headlessly
 * testable.
 */

export type CollapseMode = "all" | "previous";

export interface ExplorerActionInput {
	/** Vault-relative path of the newly active file, e.g. "a/b/note.md". */
	activeFilePath: string;
	/** All folder paths currently known to the explorer (no trailing slash). */
	folders: readonly string[];
	/** Path of the file that was active before this switch, if any. */
	previousFilePath?: string | null;
	/** `all` collapses every off-path folder; `previous` only the branch left. */
	mode: CollapseMode;
	/** Folder paths exempt from collapsing (matches the folder and its subtree). */
	excludedFolders?: readonly string[];
}

export interface ExplorerActions {
	/** Folders to expand (set collapsed=false), parent-before-child order. */
	expand: string[];
	/** Folders to collapse (set collapsed=true), parent-before-child order. */
	collapse: string[];
}

/**
 * Returns the ancestor folders of a file path, root-first.
 * "a/b/c/note.md" -> ["a", "a/b", "a/b/c"]. The file itself is excluded.
 */
export function getAncestorFolders(filePath: string): string[] {
	const parts = filePath.split("/").filter((p) => p.length > 0);
	parts.pop(); // drop the file segment
	const result: string[] = [];
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		result.push(current);
	}
	return result;
}

/** True if `folder` is one of, or nested under, any excluded path. */
export function isUnderExcluded(
	folder: string,
	excluded: readonly string[],
): boolean {
	return excluded.some((e) => e.length > 0 && (folder === e || folder.startsWith(`${e}/`)));
}

/**
 * Sort folder paths so that a parent always precedes its descendants. Because a
 * parent path is a strict prefix (and shorter) than its children, the default
 * code-unit string sort already yields parent-before-child order, which is the
 * order expansion must happen in (a child cannot be revealed before its parent).
 * It is also fully deterministic, independent of locale.
 */
function sortParentFirst(paths: Iterable<string>): string[] {
	return [...new Set(paths)].sort();
}

/**
 * Compute the expand/collapse actions for a note switch.
 *
 * - `expand`: every existing ancestor folder of the active file.
 * - `collapse` (`mode: "all"`): every existing folder that is not on the active
 *   path and not excluded — the audit's "keep only the active path expanded".
 * - `collapse` (`mode: "previous"`): only the ancestors of the previous file
 *   that are no longer on the active path (and not excluded) — a lighter touch.
 */
export function computeExplorerActions(input: ExplorerActionInput): ExplorerActions {
	const {
		activeFilePath,
		folders,
		previousFilePath = null,
		mode,
		excludedFolders = [],
	} = input;

	const folderSet = new Set(folders);
	const activeAncestors = getAncestorFolders(activeFilePath);
	const keepExpanded = new Set(activeAncestors);

	let collapseCandidates: string[];
	if (mode === "previous") {
		collapseCandidates = previousFilePath
			? getAncestorFolders(previousFilePath).filter((f) => !keepExpanded.has(f))
			: [];
	} else {
		collapseCandidates = [...folderSet].filter((f) => !keepExpanded.has(f));
	}

	const collapse = collapseCandidates.filter(
		(f) => folderSet.has(f) && !isUnderExcluded(f, excludedFolders),
	);
	const expand = activeAncestors.filter((f) => folderSet.has(f));

	return {
		expand: sortParentFirst(expand),
		collapse: sortParentFirst(collapse),
	};
}
