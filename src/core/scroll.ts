/**
 * Pure scroll-centering math.
 *
 * Imports nothing; takes only plain numbers so the formula is verifiable
 * headlessly across arbitrary viewport heights. The shell reads the real DOM
 * metrics via the adapter, calls this, then writes the result to
 * `scrollContainer.scrollTop`. We never use `scrollIntoView` (it cannot honor a
 * custom vertical offset and misbehaves in the virtualized list).
 */

export interface ScrollCenterInput {
	/** Active item's top offset within the scrollable content (px). */
	itemTop: number;
	/** Active item's height (px). */
	itemHeight: number;
	/** Visible height of the scroll container (clientHeight, px). */
	viewportHeight: number;
	/** Total scrollable content height (scrollHeight, px). */
	scrollHeight: number;
	/** Vertical offset level, typically -10..+10; 0 = centered. */
	offsetLevel: number;
	/** Pixels moved per offset level (the shell passes one row height). */
	offsetStepPx: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Compute the `scrollTop` that centers the active item in the viewport, shifted
 * by `offsetLevel * offsetStepPx`, then clamped to the legal scroll range.
 * Result is rounded to an integer pixel for deterministic, repaint-stable output.
 */
export function computeCenteredScrollTop(input: ScrollCenterInput): number {
	const {
		itemTop,
		itemHeight,
		viewportHeight,
		scrollHeight,
		offsetLevel,
		offsetStepPx,
	} = input;

	const centeredTop = itemTop + itemHeight / 2 - viewportHeight / 2;
	const target = centeredTop + offsetLevel * offsetStepPx;
	const maxScroll = Math.max(0, scrollHeight - viewportHeight);
	return Math.round(clamp(target, 0, maxScroll));
}
