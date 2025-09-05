import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	"apps/cortex-os",
	"apps/cortex-webui",
	"packages/a2a",
	"packages/a2a-services/schema-registry",
	"packages/orchestration/src/lib/outbox",
	"packages/a2a-services/common",
	"packages/agents",
	"packages/asbr",
	"packages/kernel",
	"packages/mcp",
	// Removed non-existent workspace entries causing Vitest startup errors
	// "packages/mcp-bridge",
	// "packages/mcp-server",
	"packages/memories",
	"packages/mvp",
	"packages/mvp-core",
	"packages/mvp-server",
	"packages/orchestration",
	"packages/prp-runner",
	"packages/model-gateway",
	"packages/rag",
	"packages/simlab",
	"libs/typescript/contracts",
]);
