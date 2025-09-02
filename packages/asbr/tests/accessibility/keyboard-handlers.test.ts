/**
 * Unit tests for keyboard navigation helpers
 */
// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import type { KeyboardNavigationManager } from "../../src/accessibility/keyboard-nav.js";
import {
	handleArrow,
	handleEscape,
	handleHomeEnd,
	handleTab,
} from "../../src/accessibility/lib/key-handlers.js";

describe("keyboard navigation handlers", () => {
	it("handleTab moves focus forward", () => {
		const manager = {
			moveFocus: vi.fn().mockReturnValue(true),
		} as unknown as KeyboardNavigationManager;
		const event = new KeyboardEvent("keydown", { key: "Tab" });
		const handled = handleTab(event, manager);
		expect(manager.moveFocus).toHaveBeenCalledWith("next");
		expect(handled).toBe(true);
	});

	it("handleArrow delegates to handleArrowKey", () => {
		const manager = {
			handleArrowKey: vi.fn().mockReturnValue(true),
		} as unknown as KeyboardNavigationManager;
		const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
		const handled = handleArrow(event, manager);
		expect(manager.handleArrowKey).toHaveBeenCalledWith("ArrowUp");
		expect(handled).toBe(true);
	});

	it("handleHomeEnd moves to start or end", () => {
		const manager = {
			moveFocus: vi.fn().mockReturnValue(true),
		} as unknown as KeyboardNavigationManager;
		const homeEvent = new KeyboardEvent("keydown", { key: "Home" });
		const endEvent = new KeyboardEvent("keydown", { key: "End" });
		expect(handleHomeEnd(homeEvent, manager)).toBe(true);
		expect(manager.moveFocus).toHaveBeenCalledWith("first");
		expect(handleHomeEnd(endEvent, manager)).toBe(true);
		expect(manager.moveFocus).toHaveBeenCalledWith("last");
	});

	it("handleEscape deactivates context", () => {
		const manager = {
			deactivateContext: vi.fn(),
		} as unknown as KeyboardNavigationManager;
		const event = new KeyboardEvent("keydown", { key: "Escape" });
		const handled = handleEscape(event, manager);
		expect(manager.deactivateContext).toHaveBeenCalled();
		expect(handled).toBe(true);
	});
});
