import { createBus } from "@cortex-os/a2a-core/bus";
import { inproc } from "@cortex-os/a2a-transport/inproc";
import { tracer } from "@cortex-os/telemetry";
import { uuid } from "@cortex-os/utils";
import { Command } from "commander";

export const a2aDoctor = new Command("doctor")
	.description("Run A2A health checks")
	.option("--json", "JSON output")
	.action(async (opts: { json?: boolean }) => {
		const span = tracer.startSpan("cli.a2a.doctor");
		try {
			const bus = createBus(inproc());
			await bus.publish({
				id: uuid(),
				type: "event.health.v1",
				source: "cortex://cli/a2a/doctor",
				specversion: "1.0",
				time: new Date().toISOString(),
				data: {},
				ttlMs: 60000,
				headers: {},
			});
			if (opts.json)
				process.stdout.write(`${JSON.stringify({ ok: true }, null, 2)}\n`);
			else process.stdout.write("A2A OK\n");
		} finally {
			span.end();
		}
	});
