import { createEnvelope } from "@cortex-os/a2a-contracts/envelope";
import { TOKENS } from "@cortex-os/contracts";
import { z } from "zod";
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

        // Wire A2A bus
        const { bus } = wireA2A();

        // Validate environment configuration
        const envSchema = z.object({
                CORTEX_MCP_MANAGER_PORT: z
                        .coerce.number()
                        .int()
                        .min(1)
                        .max(65535)
                        .default(3000),
                CORTEX_MCP_PUBLIC_URL: z.string().url().optional(),
        });
        const { CORTEX_MCP_MANAGER_PORT: port, CORTEX_MCP_PUBLIC_URL } = envSchema.parse(
                process.env,
        );

        // Publish the public URL via A2A for other services to consume
        if (CORTEX_MCP_PUBLIC_URL) {
                void bus.publish(
                        createEnvelope({
                                type: "mcp.public-url",
                                data: { url: CORTEX_MCP_PUBLIC_URL, port },
                                source: "urn:cortex-os:mcp-manager",
                        }),
                );
        }

        return { memories, orchestration, mcp, bus };
}
