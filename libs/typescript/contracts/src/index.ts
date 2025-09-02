export const TOKENS = {
	Memories: Symbol.for("Memories"),
	Orchestration: Symbol.for("Orchestration"),
	MCPGateway: Symbol.for("MCPGateway"),
} as const;

export type Token = (typeof TOKENS)[keyof typeof TOKENS];

export * from "./mcp-events.js";
