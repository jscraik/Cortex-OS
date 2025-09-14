import { describe, expect, it } from 'vitest';
import { createCortexArchonService } from '../src/service.js';

// Minimal config (will rely on mocked MCP in current AgentMCPClient implementation)
const config: any = {
	enableAgentIntegration: false,
	enableTaskOrchestration: false,
	enableRemoteRetrieval: false,
	enableDocumentSync: false,
};

describe('CortexArchonService updateTaskStatus event payload', () => {
	it('emits task-updated with a non-Task shaped payload (expected to adjust implementation)', async () => {
		const service = createCortexArchonService(config);
		await service.initialize();

		let received: any;
		service.on('task-updated', (task) => {
			received = task;
		});

		// This will call updateTaskStatus which currently fabricates a Task-like object with taskId instead of id
		await service.updateTaskStatus('demo-task', 'completed', 'done');

		expect(received).toBeDefined();
		// This assertion documents the current incorrect shape so that a refactor will intentionally break it
		expect(received.taskId).toBe('demo-task');
		// The correct future behavior should use id, not taskId
	});
});
