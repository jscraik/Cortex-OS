import { describe, expect, test, vi } from "vitest";
import { healthHandler, wireA2A } from "../src/boot/a2a";

function envelope() {
	return {
		id: "00000000-0000-0000-0000-000000000000",
		type: "event.health.v1",
		occurredAt: new Date(0).toISOString(),
		ttlMs: 60000,
		headers: {},
		payload: {},
	};
}

describe("routing", () => {
	test("health events route to handler", async () => {
                const { bus } = wireA2A();
		const spy = vi.spyOn(healthHandler, "handle");
		await bus.publish(envelope());
		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});
});
