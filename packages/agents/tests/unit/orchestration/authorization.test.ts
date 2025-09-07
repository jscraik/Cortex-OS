import { describe, expect, it, vi } from 'vitest';

vi.mock(
	'@cortex-os/utils',
	() => ({
		secureId: (p: string) => `${p}-${Math.random().toString(36).slice(2)}`,
	}),
	{ virtual: true },
);

import { createMockEventBus, createMockMCPClient } from '@tests/setup.js';
import { LocalInMemoryStore } from '@/integrations/outbox.js';
import type { ModelProvider } from '@/lib/types.js';
import {
	createOrchestrator,
	WorkflowBuilder,
} from '@/orchestration/agent-orchestrator.js';

describe('Authorization and Audit', () => {
	it('publishes audit event for unauthorized workflow', async () => {
		const mockProvider: ModelProvider = {
			name: 'test-provider',
			generate: vi.fn().mockResolvedValue({
				text: JSON.stringify({ suggestions: [] }),
				usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
				latencyMs: 1,
				provider: 'test-provider',
			}),
			shutdown: vi.fn(),
		};
		const bus = createMockEventBus();
		const mcp = createMockMCPClient();
		const store = new LocalInMemoryStore();

		const orch = createOrchestrator({
			providers: { primary: mockProvider },
			eventBus: bus,
			mcpClient: mcp,
			memoryStore: store,
			authorize: async () => false,
		});

		const workflow = WorkflowBuilder.create('unauth', 'Unauthorized')
			.addCodeAnalysis({
				sourceCode: 'function test() {}',
				language: 'javascript',
				analysisType: 'review',
			})
			.build();

		const result = await orch.executeWorkflow(workflow);
		expect(result.status).toBe('failed');

		const auditEvent = bus.published.find(
			(e) => e.type === 'security.workflow_unauthorized',
		);
		expect(auditEvent).toBeTruthy();

		const records = await store.searchByText();
		expect(
			records.some((r) =>
				r.tags.includes('evt:security.workflow_unauthorized'),
			),
		).toBe(true);
	});
});
