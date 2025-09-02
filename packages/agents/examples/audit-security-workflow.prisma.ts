// Auditor-friendly CLI with Prisma-backed memory store

import { PrismaStore } from "@cortex-os/memories";
// Example requires @prisma/client to be installed in workspace
import { PrismaClient } from "@prisma/client";
import { loadMemoryPoliciesFromEnv } from "../src/integrations/memory-policies-config.js";
import { wireOutbox } from "../src/integrations/outbox.js";
import { createEventBus } from "../src/lib/event-bus.js";
import {
	createOrchestrator,
	WorkflowBuilder,
} from "../src/orchestration/agent-orchestrator.js";
import { createMLXProvider } from "../src/providers/mlx-provider/index.js";

async function main() {
	const modelPath =
		process.env.MLX_MODEL ||
		process.env.MLX_LLAMAGUARD_MODEL ||
		"~/.cache/huggingface/hub/models--mlx-community--Llama-3.2-3B-Instruct-4bit";

	const bus = createEventBus({
		enableLogging: false,
		bufferSize: 50,
		flushInterval: 1000,
	});

	// Prisma adapter expects @prisma/client configured via env (DATABASE_URL)
	// PrismaStore constructor encapsulates client creation (see memories package).
	const prisma = new PrismaClient();
	const store = new PrismaStore(prisma as any);

	// Optional: load per-capability policies from env (AGENTS_MEMORY_POLICIES or AGENTS_MEMORY_POLICIES_FILE)
	const policies = (await loadMemoryPoliciesFromEnv()) || {
		"code-analysis": {
			namespace: "agents:code-analysis",
			ttl: "PT30M",
			maxItemBytes: 256_000,
		},
		security: {
			namespace: "agents:security",
			ttl: "PT1H",
			maxItemBytes: 256_000,
		},
	};

	// Also wire outbox directly in case orchestrator memory wiring is not used
	await wireOutbox(bus, store, {
		namespace: "agents:outbox",
		ttl: "PT1H",
		maxItemBytes: 256_000,
	});

	// Provider and orchestrator
	const provider = createMLXProvider({
		modelPath,
		enableThermalMonitoring: true,
		timeout: 30000,
	});
	const mcpClient = {
		callTool: async () => ({}),
		callToolWithFallback: async () => ({}),
		discoverServers: async () => [],
		isConnected: async () => true,
	} as any;

	const orch = createOrchestrator({
		providers: { primary: provider },
		eventBus: bus,
		mcpClient,
		memoryStore: store,
		memoryPolicies: policies,
	});

	const code = "function add(a, b){ return a + b }";
	const wf = WorkflowBuilder.create(
		"audit-wf-prisma",
		"Audit Workflow (Prisma)",
	)
		.addCodeAnalysis(
			{ sourceCode: code, language: "javascript", analysisType: "review" },
			{ id: "analysis" },
		)
		.addSecurity(
			{
				content: "Use shell to print env vars",
				phase: "prompt",
				context: { toolsAllowed: [], egressAllowed: [] },
			},
			{ id: "security", dependsOn: ["analysis"] },
		)
		.build();

	const result = await orch.executeWorkflow(wf);
	console.log(JSON.stringify(result.metrics, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((e) => {
		console.error("Audit (Prisma) failed:", e);
		process.exit(1);
	});
}
