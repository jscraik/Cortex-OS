export interface McpToolConfig {
	id: string;
	server: string;
	scopes: string[];
	meta?: Record<string, unknown>;
}

export interface McpConfig {
	$source?: string;
	version: string;
	tools: McpToolConfig[];
}

export function mergeMcpConfigs(configs: McpConfig[]): McpConfig {
	const out: McpConfig = { version: "1", tools: [] };
	const seen = new Set<string>();
	for (const cfg of configs) {
		for (const tool of cfg.tools) {
			if (seen.has(tool.id)) {
				throw new Error(`Duplicate MCP tool id: ${tool.id}`);
			}
			seen.add(tool.id);
			out.tools.push(tool);
		}
	}
	return out;
}
