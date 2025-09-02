import { createBus, type Handler } from "@cortex-os/a2a-core/bus";
import { inproc } from "@cortex-os/a2a-transport/inproc";
import { uuid } from "@cortex-os/utils";
import { describe, expect, it } from "vitest";

describe("createBus", () => {
	it("routes by type", async () => {
		const { publish, bind } = createBus(inproc());
		let got = false;
		const handler: Handler = {
			type: "event.ping.v1",
			handle: async () => {
				got = true;
			},
		};
		await bind([handler]);
		await publish({
			id: uuid(),
			type: "event.ping.v1",
			occurredAt: new Date().toISOString(),
			headers: {},
			payload: {},
		} as any);
		expect(got).toBe(true);
	});

	it("returns publish and bind functions", () => {
		const bus = createBus(inproc());
		expect(typeof bus.publish).toBe("function");
		expect(typeof bus.bind).toBe("function");
	});
});
