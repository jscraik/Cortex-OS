// Wire real MemoryService using @cortex-os/memories with env-driven store factory
import type { MemoryService as PkgMemoryService } from '@cortex-os/memories';
import {
	createEmbedderFromEnv,
	createMemoryService,
	createPolicyAwareStoreFromEnv,
} from '@cortex-os/memories';
import { trace } from '@opentelemetry/api';
import { createMcpGateway } from './mcp/gateway';
import type { CortexOsToolName } from './mcp/tools';

export type MemoryService = PkgMemoryService;

export function provideMemories(): MemoryService {
	const store = createPolicyAwareStoreFromEnv();
	const embedder = createEmbedderFromEnv();
	return createMemoryService(store, embedder);
}

export function provideOrchestration() {
	// Placeholder orchestration surface – extend with real orchestrator wiring.
	return { config: {} };
}

export function provideMCP(opts?: { audit?: (e: Record<string, unknown>) => void; publishMcpEvent?: (evt: { type: string; payload: Record<string, unknown> }) => void }) {
	const gateway = createMcpGateway({
		memories: provideMemories(),
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
	return {
		listTools: () => gateway.listTools(),
		callTool: (tool: CortexOsToolName, input: unknown) => gateway.callTool(tool, input),
		async close() { },
	};
}

// Real tracer (no-op if no SDK registered in runtime)
export const tracer = trace.getTracer('cortex-os');

export function configureAuditPublisherWithBus(publishMcp?: (evt: { type: string; payload: Record<string, unknown> }) => void) {
	if (!publishMcp) return { publishMcpEvent: undefined };
	return { publishMcpEvent: publishMcp };
}
