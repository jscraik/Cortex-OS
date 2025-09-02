import { createBus } from "@cortex-os/a2a-core/bus";
import { inproc } from "@cortex-os/a2a-transport/inproc";
import { uuid } from "@cortex-os/utils";

export async function runProducer() {
	const bus = createBus(inproc());
	await bus.publish({
		id: uuid(),
		type: "event.ping.v1",
		occurredAt: new Date().toISOString(),
		headers: {},
		payload: { ping: true },
	} as unknown);
}
