import { z } from 'zod';
import { container } from './boot';
import { createEnvelope, wireA2A } from './boot/a2a';
import { TOKENS } from './tokens';

// Lightweight service shapes to avoid any

export async function startRuntime() {
	const memories = container.get(TOKENS.Memories);
	const orchestration = container.get(TOKENS.Orchestration);
	const mcp = container.get(TOKENS.MCPGateway);

	// Wire A2A bus
	const { bus } = wireA2A();

	// Validate environment configuration
	const envSchema = z.object({
		CORTEX_MCP_MANAGER_PORT: z.coerce
			.number()
			.int()
			.min(1)
			.max(65535)
			.default(3000),
		CORTEX_MCP_PUBLIC_URL: z.string().url().optional(),
		CORTEX_PRIVACY_MODE: z.enum(['true', 'false']).optional().default('false'),
	});
	const {
		CORTEX_MCP_MANAGER_PORT: port,
		CORTEX_MCP_PUBLIC_URL,
		CORTEX_PRIVACY_MODE: privacyMode,
	} = envSchema.parse(process.env);

	// Publish the public URL via A2A for other services to consume
	if (CORTEX_MCP_PUBLIC_URL) {
		void bus.publish(
			createEnvelope({
				type: 'mcp.public-url',
				data: { url: CORTEX_MCP_PUBLIC_URL, port },
				source: 'urn:cortex-os:mcp-manager',
			}),
		);
	}

	// Log privacy mode status (use warn for visibility, avoid log/info in prod)
	if (privacyMode === 'true') {
		console.warn('🔒 Cortex-OS Privacy Mode: ENABLED');
		console.warn('Only local MLX models will be used for all operations.');
	} else {
		console.warn('🔓 Cortex-OS Privacy Mode: DISABLED');
		console.warn('All available providers will be used for operations.');
	}

	return { memories, orchestration, mcp, bus };
}
