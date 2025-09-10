// Wire real MemoryService using @cortex-os/memories with env-driven store factory
import type { MemoryService as PkgMemoryService } from '@cortex-os/memories';
import { createMemoryService, createPolicyAwareStoreFromEnv, createEmbedderFromEnv } from '@cortex-os/memories';

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

export const tracer = {
	startSpan(_name: string) {
		return {
			setStatus(_status: unknown) {},
			recordException(_err: unknown) {},
			end() {},
		};
	},
};

export function configureAuditPublisherWithBus(
	_publish: (evt: unknown) => void,
) {
	// TODO: wire audit events to bus (currently no-op stub)
}
