// Wire real MemoryService using @cortex-os/memories with env-driven store factory
import type { MemoryService as PkgMemoryService } from '@cortex-os/memories';
import {
	createEmbedderFromEnv,
	createMemoryService,
	createPolicyAwareStoreFromEnv,
} from '@cortex-os/memories';
import { trace } from '@opentelemetry/api';

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

export function provideMCP() {
	// Minimal MCP facade; extend with tool registry + lifecycle as needed.
	return {
		async callTool() {
			return {};
		},
		async close() {},
	};
}

// Real tracer (no-op if no SDK registered in runtime)
export const tracer = trace.getTracer('cortex-os');

export function configureAuditPublisherWithBus() {
	// TODO: wire audit events to bus (currently no-op stub)
}
