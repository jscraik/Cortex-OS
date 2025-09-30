import { z } from 'zod';
import { wireA2A } from './boot/a2a.js';
import { container } from './boot.js';
import { createEventManager, type EventManager } from './events';
import { createRuntimeHttpServer } from './http/runtime-server.js';
import { createMcpHttpServer } from './mcp/server.js';
import type { ArtifactRepository } from './persistence/artifact-repository.js';
import type { EvidenceRepository } from './persistence/evidence-repository.js';
import type { ProfileRepository } from './persistence/profile-repository.js';
import type { TaskRepository } from './persistence/task-repository.js';
import { TOKENS } from './tokens.js';

export interface RuntimeHandle {
	httpUrl: string;
	mcpUrl: string;
	stop: () => Promise<void>;
	events: EventManager;
}

export async function startRuntime(): Promise<RuntimeHandle> {
	const memories = container.get(TOKENS.Memories);
	const orchestration = container.get(TOKENS.Orchestration);
	const mcpGateway = container.get(TOKENS.MCPGateway);
	const taskRepository = container.get<TaskRepository>(TOKENS.TaskRepository);
	const profileRepository = container.get<ProfileRepository>(TOKENS.ProfileRepository);
	const artifactRepository = container.get<ArtifactRepository>(TOKENS.ArtifactRepository);
	const evidenceRepository = container.get<EvidenceRepository>(TOKENS.EvidenceRepository);

	// Memories and orchestration will be used in future implementations
	// Currently available but not actively used in this runtime initialization

	const _memories = memories;

	const _orchestration = orchestration;

	const { publish } = (() => {
		const wiring = wireA2A();
		return {
			publish: wiring.publish,
		};
	})();

	const envSchema = z.object({
		CORTEX_HTTP_PORT: z.coerce.number().int().min(0).max(65535).default(7439),
		CORTEX_HTTP_HOST: z.string().default('127.0.0.1'),
		CORTEX_MCP_MANAGER_PORT: z.coerce.number().int().min(0).max(65535).default(3000),
		CORTEX_MCP_MANAGER_HOST: z.string().default('127.0.0.1'),
		CORTEX_MCP_PUBLIC_URL: z.string().url().optional(),
		CORTEX_PRIVACY_MODE: z.enum(['true', 'false']).optional().default('false'),
	});

	const {
		CORTEX_HTTP_PORT: httpPort,
		CORTEX_HTTP_HOST: httpHost,
		CORTEX_MCP_MANAGER_PORT: mcpPort,
		CORTEX_MCP_MANAGER_HOST: mcpHost,
		CORTEX_MCP_PUBLIC_URL,
		CORTEX_PRIVACY_MODE: privacyMode,
	} = envSchema.parse(process.env);

	const httpServer = createRuntimeHttpServer({
		tasks: taskRepository,
		profiles: profileRepository,
		artifacts: artifactRepository,
		evidence: evidenceRepository,
	});
	const eventManager = createEventManager({ httpServer });
	const { port: boundHttpPort } = await httpServer.listen(httpPort, httpHost);
	const httpUrl = `http://${httpHost}:${boundHttpPort}`;

	const mcpServer = createMcpHttpServer(mcpGateway);
	const { port: boundMcpPort } = await mcpServer.listen(mcpPort, mcpHost);
	const mcpUrl = `http://${mcpHost}:${boundMcpPort}`;

	if (CORTEX_MCP_PUBLIC_URL) {
		await publish('mcp.public-url', {
			url: CORTEX_MCP_PUBLIC_URL,
			port: boundMcpPort,
		});
	}

	if (privacyMode === 'true') {
		console.warn('🔒 Cortex-OS Privacy Mode: ENABLED');
		console.warn('Only local MLX models will be used for all operations.');
	}

	await eventManager.emitEvent({
		type: 'runtime.started',
		data: {
			httpUrl,
			mcpUrl,
			startedAt: new Date().toISOString(),
		},
	});

	const stop = async () => {
		await Promise.all([httpServer.close(), mcpServer.close()]);
	};

	const shutdown = async (signal: string) => {
		console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
		await stop();
		console.log('✅ Servers closed');
		process.exit(0);
	};

	const onSignal = (signal: NodeJS.Signals) => {
		void shutdown(signal);
	};

	process.once('SIGTERM', onSignal);
	process.once('SIGINT', onSignal);

	return {
		httpUrl,
		mcpUrl,
		events: eventManager,
		stop: async () => {
			process.removeListener('SIGTERM', onSignal);
			process.removeListener('SIGINT', onSignal);
			await stop();
		},
	};
}
