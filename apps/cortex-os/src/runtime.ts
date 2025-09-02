import { createEnvelope } from "@cortex-os/a2a-contracts/envelope";
import { TOKENS } from "@cortex-os/contracts";
// Deep import allowed by tsconfig path mapping to start the manager inside runtime
import { McpDemoServer } from "@cortex-os/mcp-bridge/src/mcp-demo-server";
import { container } from "./boot";
import { wireA2A } from "./boot/a2a";

// Lightweight service shapes to avoid any
type MemoriesService = unknown;
type OrchestrationService = unknown;
type MCPGatewayService = unknown;

export async function startRuntime() {
	const memories = container.get(TOKENS.Memories) as MemoriesService;
	const orchestration = container.get(
		TOKENS.Orchestration,
	) as OrchestrationService;
	const mcp = container.get(TOKENS.MCPGateway) as MCPGatewayService;

	// Wire A2A bus (also sets global MCP telemetry publisher when enabled)
	const bus = wireA2A();

	// Auto-start Universal MCP Manager with Cloudflare Tunnel as the server interface
	const port = process.env.CORTEX_MCP_MANAGER_PORT
		? Number(process.env.CORTEX_MCP_MANAGER_PORT)
		: 3000;
	const manager = new McpDemoServer(port);
	await manager.start();

	// Publish the public URL via A2A for other services to consume
	const publicUrl = manager.getPublicUrl() || process.env.CORTEX_MCP_PUBLIC_URL;
	if (publicUrl) {
		void bus.publish(
			createEnvelope({
				type: "mcp.public-url",
				data: { url: publicUrl, port },
				source: "urn:cortex-os:mcp-manager",
			}),
		);
	}

	return { memories, orchestration, mcp, bus, mcpManager: manager };
}
