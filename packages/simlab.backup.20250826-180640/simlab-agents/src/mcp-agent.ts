// Placeholder MCP-backed agent adapter; implementation deferred.
export type MCPAgent = { decide(s: unknown): Promise<unknown> };
export function mcpAgent(): MCPAgent { return { async decide() { throw new Error("MCP agent not implemented"); } }; }

