import type { Handler } from "@cortex-os/a2a-core/bus";

export const healthHandler: Handler = {
	type: "event.health.v1",
	async handle(msg) {
		// Basic health probe acknowledgement
		console.log("health.event.received", { id: msg.id, source: msg.source });
	},
};
