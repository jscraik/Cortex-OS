import { trace } from '@opentelemetry/api';
import { createMcpGateway, type McpGateway, type MemoriesLike } from './mcp/gateway.js';
import { ArtifactRepository } from './persistence/artifact-repository.js';
import { EvidenceRepository } from './persistence/evidence-repository.js';
import { ProfileRepository } from './persistence/profile-repository.js';
import { TaskRepository } from './persistence/task-repository.js';

export interface MemoryRecord {
	id: string;
	[key: string]: unknown;
}

export interface MemoryService {
	save(record: MemoryRecord): Promise<MemoryRecord>;
	get(id: string): Promise<MemoryRecord | undefined>;
}

export function provideMemories(): MemoryService {
	const store = new Map<string, MemoryRecord>();
	return {
		async save(record) {
			store.set(record.id, record);
			return record;
		},
		async get(id) {
			return store.get(id);
		},
	};
}

export function provideOrchestration() {
	// Placeholder orchestration surface – extend with real orchestrator wiring.
	return { config: {} };
}

export function provideTaskRepository(): TaskRepository {
	return new TaskRepository();
}

export function provideProfileRepository(): ProfileRepository {
	return new ProfileRepository();
}

export function provideArtifactRepository(): ArtifactRepository {
	return new ArtifactRepository();
}

export function provideEvidenceRepository(): EvidenceRepository {
	return new EvidenceRepository();
}

export function provideMCP(opts?: {
	audit?: (e: Record<string, unknown>) => void;
	publishMcpEvent?: (evt: { type: string; payload: Record<string, unknown> }) => void;
}): McpGateway {
	return createMcpGateway({
		memories: provideMemories() as unknown as MemoriesLike,
		orchestration: provideOrchestration(),
		config: { runtime: {} },
		audit: opts?.audit,
		publishMcpEvent: opts?.publishMcpEvent,
		security: {
			allowTool: (name: string) => {
				if (['system.restart_service', 'config.set'].includes(name)) {
					return process.env.CORTEX_MCP_ALLOW_MUTATIONS === 'true';
				}
				return true;
			},
		},
	});
}

// Real tracer (no-op if no SDK registered in runtime)
export const tracer = trace.getTracer('cortex-os');

export function configureAuditPublisherWithBus(
	publishMcp?: (evt: { type: string; payload: Record<string, unknown> }) => void,
) {
	if (!publishMcp) return { publishMcpEvent: undefined };
	return { publishMcpEvent: publishMcp };
}
