import { z } from 'zod';
import { container } from './boot';
import { wireA2A } from './boot/a2a';
import { TOKENS } from './tokens';

// Lightweight service shapes to avoid any

export async function startRuntime() {
	container.get(TOKENS.Memories);
	container.get(TOKENS.Orchestration);
	const mcp = container.get(TOKENS.MCPGateway);

	// Wire A2A bus
	const { publish } = wireA2A();

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
		await publish('mcp.public-url', { url: CORTEX_MCP_PUBLIC_URL, port });
	}

	// Log privacy mode status (use warn for visibility, avoid log/info in prod)
	if (privacyMode === 'true') {
		console.warn('🔒 Cortex-OS Privacy Mode: ENABLED');
		console.warn('Only local MLX models will be used for all operations.');
	}

	// Start MCP gateway server
	const server = await mcp.listen(port);
	console.log(`🚀 Cortex-OS MCP Gateway listening on port ${port}`);

	// Graceful shutdown handling
	const shutdown = async (signal: string) => {
		console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
		await server.close();
		console.log('✅ Server closed');
		process.exit(0);
	};

	process.on('SIGTERM', () => shutdown('SIGTERM'));
	process.on('SIGINT', () => shutdown('SIGINT'));
}
