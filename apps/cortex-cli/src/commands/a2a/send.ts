import { createBus } from "@cortex-os/a2a-core/bus";
import { inproc } from "@cortex-os/a2a-transport/inproc";
import { uuid } from "@cortex-os/utils";
import { Command } from "commander";

export const a2aSend = new Command("send")
	.description("Send an A2A message")
	.requiredOption("--type <string>")
	.requiredOption("--payload <json>")
	.action(async (opts: { type: string; payload: string }) => {
		const bus = createBus(inproc());
		await bus.publish({
			id: uuid(),
			type: opts.type,
			source: "cortex://cli/a2a/send",
			specversion: "1.0",
			time: new Date().toISOString(),
			data: JSON.parse(opts.payload),
			ttlMs: 60000,
			headers: {},
		});
		process.stdout.write("Event sent\n");
	});
