import { describe, expect, it } from "vitest";
import { computeCenteredScrollTop } from "../src/core/scroll";

describe("computeCenteredScrollTop", () => {
	it("centers the item in the viewport at offset 0", () => {
		// item spans 1000..1020; center => 1010 - 300 = 710
		const top = computeCenteredScrollTop({
			itemTop: 1000,
			itemHeight: 20,
			viewportHeight: 600,
			scrollHeight: 5000,
			offsetLevel: 0,
			offsetStepPx: 20,
		});
		expect(top).toBe(710);
	});

	it("centers correctly across a different viewport height", () => {
		// center => 1010 - 200 = 810
		const top = computeCenteredScrollTop({
			itemTop: 1000,
			itemHeight: 20,
			viewportHeight: 400,
			scrollHeight: 5000,
			offsetLevel: 0,
			offsetStepPx: 20,
		});
		expect(top).toBe(810);
	});

	it("applies a positive offset by offsetLevel * step", () => {
		// 710 + 3*20 = 770
		const top = computeCenteredScrollTop({
			itemTop: 1000,
			itemHeight: 20,
			viewportHeight: 600,
			scrollHeight: 5000,
			offsetLevel: 3,
			offsetStepPx: 20,
		});
		expect(top).toBe(770);
	});

	it("applies a negative offset", () => {
		// 710 - 5*20 = 610
		const top = computeCenteredScrollTop({
			itemTop: 1000,
			itemHeight: 20,
			viewportHeight: 600,
			scrollHeight: 5000,
			offsetLevel: -5,
			offsetStepPx: 20,
		});
		expect(top).toBe(610);
	});

	it("clamps to 0 when the centered target is negative", () => {
		const top = computeCenteredScrollTop({
			itemTop: 10,
			itemHeight: 20,
			viewportHeight: 600,
			scrollHeight: 5000,
			offsetLevel: 0,
			offsetStepPx: 20,
		});
		expect(top).toBe(0);
	});

	it("clamps to the maximum scrollable position", () => {
		// max scroll = 1000 - 600 = 400; raw center would exceed it
		const top = computeCenteredScrollTop({
			itemTop: 950,
			itemHeight: 20,
			viewportHeight: 600,
			scrollHeight: 1000,
			offsetLevel: 0,
			offsetStepPx: 20,
		});
		expect(top).toBe(400);
	});

	it("returns an integer (rounded) for sub-pixel inputs", () => {
		const top = computeCenteredScrollTop({
			itemTop: 1000,
			itemHeight: 15,
			viewportHeight: 401,
			scrollHeight: 5000,
			offsetLevel: 0,
			offsetStepPx: 15,
		});
		// 1000 + 7.5 - 200.5 = 807 exactly
		expect(Number.isInteger(top)).toBe(true);
		expect(top).toBe(807);
	});
});
