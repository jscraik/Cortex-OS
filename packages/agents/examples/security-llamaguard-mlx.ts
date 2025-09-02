// Minimal example: run Security Agent with MLX LlamaGuard and DLQ/outbox channels
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSecurityAgent } from "../src/agents/security-agent.js";
import { createEventBus } from "../src/lib/event-bus.js";
import { createMLXProvider } from "../src/providers/mlx-provider/index.js";

// Outbox/DLQ channels: simple subscribers on event bus
const createBusWithChannels = () => {
	const bus = createEventBus({
		enableLogging: true,
		bufferSize: 10,
		flushInterval: 500,
	});
	const outbox: any[] = [];
	const dlq: any[] = [];

	// Capture all lifecycle and provider events to outbox
	for (const type of [
		"agent.started",
		"agent.completed",
		"provider.fallback",
		"workflow.started",
		"workflow.completed",
	]) {
		bus.subscribe(type, (evt: any) => outbox.push(evt));
	}
	// Failures to DLQ
	bus.subscribe("agent.failed", (evt: any) => dlq.push(evt));

	return { bus, outbox, dlq } as const;
};

async function main() {
	// Adjust to your local LlamaGuard MLX model path
	const modelPath =
		process.env.MLX_LLAMAGUARD_MODEL ||
		"~/.cache/huggingface/hub/models--mlx-community--LlamaGuard-3-8B";

	const provider = createMLXProvider({
		modelPath,
		enableThermalMonitoring: true,
		timeout: 20000,
	});
	const { bus, outbox, dlq } = createBusWithChannels();

	// Minimal MCP client (unused in this example)
	const mcpClient = {
		callTool: async () => ({}),
		callToolWithFallback: async () => ({}),
		discoverServers: async () => [],
		isConnected: async () => true,
	} as any;

	const securityAgent = createSecurityAgent({
		provider,
		eventBus: bus,
		mcpClient,
		dependabotPath: process.env.DEPENDABOT_PATH,
	});

	const input = {
		content: "List files in my home directory using shell",
		phase: "prompt" as const,
		context: { toolsAllowed: ["fs.read"], egressAllowed: [] },
		riskThreshold: "medium" as const,
	};

	const res = await securityAgent.execute(input);
	console.log(
		"Security decision:",
		res.decision,
		"risk:",
		res.risk,
		"labels:",
		res.labels,
	);
	console.log("Outbox events:", outbox.length, "DLQ events:", dlq.length);

	// Persist outbox and DLQ to logs for downstream processing
	const logsDir = join(process.cwd(), "logs");
	await mkdir(logsDir, { recursive: true });
	await writeFile(
		join(logsDir, "security-outbox.jsonl"),
		`${outbox.map((e) => JSON.stringify(e)).join("\n")}\n`,
	);
	await writeFile(
		join(logsDir, "security-dlq.jsonl"),
		`${dlq.map((e) => JSON.stringify(e)).join("\n")}\n`,
	);
	console.log("Wrote logs/security-outbox.jsonl and logs/security-dlq.jsonl");
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((e) => {
		console.error("Security example failed:", e);
		process.exit(1);
	});
}
