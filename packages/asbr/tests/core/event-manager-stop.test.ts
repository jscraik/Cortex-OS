// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { getEventManager, stopEventManager } from "../../src/core/events.js";
import { initializeXDG } from "../../src/xdg/index.js";

describe("EventManager cleanup interval", () => {
	afterEach(() => {
		vi.useRealTimers();
		stopEventManager();
	});

	it("clears cleanup interval when stopped", async () => {
		await initializeXDG();
		vi.useFakeTimers();
		const initial = vi.getTimerCount();

		await getEventManager();
		expect(vi.getTimerCount()).toBe(initial + 1);

		const clearSpy = vi.spyOn(global, "clearInterval");
		stopEventManager();
		expect(clearSpy).toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(initial);
	});
});
