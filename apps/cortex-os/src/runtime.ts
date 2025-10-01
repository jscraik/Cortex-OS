import { createObservabilityBus, OBSERVABILITY_EVENT_TYPES } from '@cortex-os/observability';
import { z } from 'zod';
import type { Envelope as A2AEnvelope } from './boot/a2a.js';
import { wireA2A } from './boot/a2a.js';
import { container } from './boot.js';
import { createEventManager, type EventManager } from './events';
import { setA2aPublishers } from './services.js';
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
	const wiring = wireA2A();
	setA2aPublishers({
		publishMcpEvent: wiring.publishMcpEvent,
		publishToolEvent: wiring.publishToolEvent,
	});

	const observabilityBus = createObservabilityBus({ source: 'urn:cortex-os:runtime' });

	const memories = container.get(TOKENS.Memories);
	const orchestration = container.get(TOKENS.Orchestration);
	const mcpGateway = container.get(TOKENS.MCPGateway);
	mcpGateway.setPublishers({
		publishMcpEvent: wiring.publishMcpEvent,
		publishToolEvent: wiring.publishToolEvent,
	});
	const taskRepository = container.get<TaskRepository>(TOKENS.TaskRepository);
	const profileRepository = container.get<ProfileRepository>(TOKENS.ProfileRepository);
	const artifactRepository = container.get<ArtifactRepository>(TOKENS.ArtifactRepository);
	const evidenceRepository = container.get<EvidenceRepository>(TOKENS.EvidenceRepository);

	// Memories and orchestration will be used in future implementations
	// Currently available but not actively used in this runtime initialization

	const _memories = memories;

	const _orchestration = orchestration;

	const publish = wiring.publish;

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

	const forwardToolEvent = async (envelope: A2AEnvelope) => {
		await eventManager.emitEvent({
			id: envelope.id,
			type: envelope.type,
			data: envelope.payload,
			timestamp: envelope.occurredAt,
		});
		await publishObservabilityToolEvent(envelope);
	};

	const publishObservabilityToolEvent = async (envelope: A2AEnvelope) => {
		const safePublish = async (fn: () => Promise<void>) => {
			try {
				await fn();
			} catch (error) {
				console.warn('cortex-os observability publish failed', error);
			}
		};

		if (envelope.type === 'cortex.mcp.tool.execution.started') {
			const payload = envelope.payload as {
				tool: string;
				correlationId: string;
				startedAt: string;
				session?: string;
				inputDigest?: string;
			};
			await safePublish(() =>
				observabilityBus.publish(OBSERVABILITY_EVENT_TYPES.TRACE_CREATED, {
					traceId: payload.correlationId,
					operationName: payload.tool,
					service: 'cortex-os/mcp-gateway',
					startTime: payload.startedAt,
					tags: {
						session: payload.session ?? 'unknown',
						inputDigest: payload.inputDigest ?? 'unknown',
					},
				}),
			);
			return;
		}

		if (envelope.type === 'cortex.mcp.tool.execution.completed') {
			const payload = envelope.payload as {
				tool: string;
				correlationId: string;
				finishedAt: string;
				durationMs: number;
				status: 'success' | 'error' | 'rate_limited' | 'forbidden' | 'validation_failed';
				resultSource?: 'cache' | 'direct';
				errorCode?: string;
				errorMessage?: string;
			};
			await safePublish(() =>
				observabilityBus.publish(OBSERVABILITY_EVENT_TYPES.TRACE_COMPLETED, {
					traceId: payload.correlationId,
					duration: Math.max(0, payload.durationMs),
					status: payload.status === 'success' ? 'success' : 'error',
					completedAt: payload.finishedAt,
				}),
			);
			await safePublish(() =>
				observabilityBus.publish(OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED, {
					name: 'mcp.tool.execution',
					value: 1,
					type: 'counter',
					timestamp: payload.finishedAt,
					tags: {
						tool: payload.tool,
						status: payload.status,
						resultSource: payload.resultSource ?? 'unknown',
						errorCode: payload.errorCode ?? 'none',
					},
				}),
			);
		}
	};

	await wiring.on('cortex.mcp.tool.execution.started', forwardToolEvent);
	await wiring.on('cortex.mcp.tool.execution.completed', forwardToolEvent);

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
