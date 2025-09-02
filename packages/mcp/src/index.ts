import { AgentConfigSchema, MCPRequestSchema } from "@cortex-os/contracts";
import {
	createInMemoryStore,
	createJsonOutput,
	createStdOutput,
	StructuredError,
} from "@cortex-os/lib";
import { z } from "zod";

const InputSchema = z.object({
	config: AgentConfigSchema,
	request: MCPRequestSchema,
	json: z.boolean().optional(),
});
export type MCPInput = z.infer<typeof InputSchema>;

export async function handleMCP(input: unknown): Promise<string> {
	const parsed = InputSchema.safeParse(input);
	if (!parsed.success) {
		const err = new StructuredError("INVALID_INPUT", "Invalid MCP input", {
			issues: parsed.error.issues,
		});
		return createJsonOutput({ error: err.toJSON() });
	}

	const { config, request, json } = parsed.data;
	const _memory = createInMemoryStore({
		maxItems: config.memory.maxItems,
		maxBytes: config.memory.maxBytes,
	});

	// Example: deterministic seed usage
	const seed = config.seed;
	const response = {
		tool: request.tool,
		args: request.args ?? {},
		seed,
	};

	if (json) return createJsonOutput(response);
	return createStdOutput(`MCP handled tool=${request.tool}`);
}

// No default export — follow named exports only convention

//
// Consolidated canonical exports
//
// To reduce duplication across MCP packages and provide a single
// operational entrypoint, we re-export the stable, working modules
// below. Consumers can import from `@cortex-os/mcp` exclusively.

// Transport bridge (canonical): stdio <-> streamable HTTP bridge and CLI
export * from "./bridge.js";
// Client (canonical): thin facade of the enhanced MCP client
export * from "./client.js";

// Registry (canonical): schemas + validation utilities for MCP servers/registry
export * from "./registry.js";

// Note: Management utilities live in `@cortex-os/mcp-bridge`.
// To avoid circular dependencies, import those directly from that package.
