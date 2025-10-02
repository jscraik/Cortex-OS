import type { OrchestrationFacade } from '@cortex-os/orchestration';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { TaskRepository } from '../../src/persistence/task-repository.js';
import { type RuntimeHandle, startRuntime } from '../../src/runtime.js';
import type { MemoryService } from '../../src/services.js';
import { prepareLoopbackAuth } from '../setup.global.js';

let authHeader: string;

const withAuthHeaders = (headers: Record<string, string> = {}) => {
	if (!authHeader) {
		throw new Error('Loopback auth header not prepared for second-brain runtime tests');
	}
	return { Authorization: authHeader, ...headers };
};

describe('brAInwav Second Brain End-to-End Validation', () => {
	let runtime: RuntimeHandle;

	beforeAll(async () => {
		const { header } = await prepareLoopbackAuth();
		authHeader = header;
	});

	beforeEach(async () => {
		// Set test environment variables for random ports
		process.env.CORTEX_HTTP_PORT = '0';
		process.env.CORTEX_MCP_MANAGER_PORT = '0';

		runtime = await startRuntime();

		// Wait for all services to be fully ready
		await waitForServicesReady(runtime, 10000);
	});

	afterEach(async () => {
		if (runtime) {
			await runtime.stop();
		}
		// Clean up environment variables
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
	});

	it('should provide complete brAInwav second brain functionality', async () => {
		// Test that all core second brain components are functional

		// 1. Verify runtime is healthy
		const healthResponse = await fetch(`${runtime.httpUrl}/health`, {
			headers: withAuthHeaders(),
		});
		expect(healthResponse.status).toBe(200);

		const health = await healthResponse.json();
		expect(health.status).toBe('ok');
		expect(health.timestamp).toBeDefined();

		// 2. Verify MCP tools are available
		const toolsResponse = await fetch(`${runtime.mcpUrl}/tools`);
		expect(toolsResponse.status).toBe(200);

		const tools = await toolsResponse.json();
		expect(Array.isArray(tools.tools)).toBe(true);
		expect(tools.tools.length).toBeGreaterThan(0);

		// 3. Verify event system is working
		await expect(
			runtime.events.emitEvent({
				type: 'second.brain.test',
				data: { message: 'Second brain validation test' },
			}),
		).resolves.not.toThrow();

		// 4. Verify SSE events are working
		const sseResponse = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: withAuthHeaders({ Accept: 'text/event-stream' }),
		});
		expect(sseResponse.status).toBe(200);
		expect(sseResponse.headers.get('content-type')).toContain('text/event-stream');

		const reader = sseResponse.body?.getReader();
		if (reader) {
			const chunk = await reader.read();
			expect(chunk.done).toBe(false);
			await reader.cancel();
		}
	});

	it('should handle brAInwav memory operations through service interfaces', async () => {
		// Test memory functionality (basic second brain capability)

		// Access memory service through container
		const { container } = await import('../../src/boot');
		const { TOKENS } = await import('../../src/tokens');

		const memories = container.get(TOKENS.Memories) as MemoryService;
		expect(memories).toBeDefined();

		// Test basic memory operations
		const testMemory = {
			id: 'second-brain-test-memory',
			content: 'This is a test memory for second brain validation',
			metadata: {
				source: 'e2e-test',
				type: 'validation',
				created: new Date().toISOString(),
			},
		};

		// Save memory
		const savedMemory = await memories.save(testMemory);
		expect(savedMemory.id).toBe('second-brain-test-memory');

		// Retrieve memory
		const retrievedMemory = await memories.get('second-brain-test-memory');
		expect(retrievedMemory).toBeDefined();
		if (retrievedMemory) {
			expect(retrievedMemory.content).toBe('This is a test memory for second brain validation');
		}
	});

	it('should provide brAInwav orchestration capabilities', async () => {
		// Test orchestration functionality (workflow management)

		const { container } = await import('../../src/boot');
		const { TOKENS } = await import('../../src/tokens');

		const orchestration = container.get(TOKENS.Orchestration) as OrchestrationFacade;
		expect(orchestration).toBeDefined();
		expect(orchestration.config).toBeDefined();

		// Verify orchestration tools are available through MCP
		const toolsResponse = await fetch(`${runtime.mcpUrl}/tools`);
		const tools = await toolsResponse.json();

		const orchestrationTools = tools.tools.filter((tool: { name: string }) =>
			tool.name.startsWith('orchestration.'),
		);

		expect(orchestrationTools.length).toBeGreaterThan(0);
		expect(
			orchestrationTools.some(
				(tool: { name: string }) => tool.name === 'orchestration.list_workflows',
			),
		).toBe(true);
	});

	it('should provide brAInwav persistent data storage', async () => {
		// Test repository functionality (data persistence)

		const { container } = await import('../../src/boot');
		const { TOKENS } = await import('../../src/tokens');

		// Test task repository
		const taskRepo = container.get(TOKENS.TaskRepository) as TaskRepository;
		const testTask = {
			id: 'e2e-test-task',
			title: 'End-to-End Test Task',
			status: 'pending',
			description: 'Task for validating second brain persistence',
			metadata: {
				created_by: 'e2e-test',
				timestamp: new Date().toISOString(),
			},
		};

		const savedTask = await taskRepo.save(testTask);
		expect(savedTask.record.id).toBe('e2e-test-task');
		expect(savedTask.digest).toBeDefined();

		const retrievedTask = await taskRepo.get('e2e-test-task');
		expect(retrievedTask).toBeDefined();
		if (retrievedTask) {
			expect(retrievedTask.record.title).toBe('End-to-End Test Task');
		}

		// Test profile repository
		const profileRepo = container.get(TOKENS.ProfileRepository);
		const testProfile = {
			id: 'e2e-test-profile',
			label: 'E2E Test Profile',
			scopes: ['read', 'write', 'test'],
			metadata: {
				purpose: 'end-to-end validation',
			},
		};

		const savedProfile = await profileRepo.save(testProfile);
		expect(savedProfile.record.label).toBe('E2E Test Profile');

		// Cleanup
		await taskRepo.delete('e2e-test-task');
		await profileRepo.delete('e2e-test-profile');
	});

	it('should integrate all brAInwav systems for second brain workflow', async () => {
		// Test complete workflow: memory → processing → storage → retrieval

		// 1. Store a memory
		const { container } = await import('../../src/boot');
		const { TOKENS } = await import('../../src/tokens');

		const memories = container.get(TOKENS.Memories) as MemoryService;
		const workflowMemory = {
			id: 'workflow-memory-001',
			content: 'Integrated workflow test for second brain functionality',
			tags: ['workflow', 'integration', 'second-brain'],
			metadata: {
				source: 'e2e-workflow-test',
				importance: 'high',
			},
		};

		await memories.save(workflowMemory);

		// 2. Create a related task
		const taskRepo = container.get(TOKENS.TaskRepository) as TaskRepository;
		const workflowTask = {
			id: 'workflow-task-001',
			title: 'Process Workflow Memory',
			status: 'pending',
			description: 'Task to process the workflow memory',
			metadata: {
				related_memory: 'workflow-memory-001',
				workflow_step: 'processing',
			},
		};

		await taskRepo.save(workflowTask);

		// 3. Emit workflow event
		await runtime.events.emitEvent({
			type: 'workflow.started',
			data: {
				memory_id: 'workflow-memory-001',
				task_id: 'workflow-task-001',
				workflow_type: 'second_brain_integration',
				timestamp: new Date().toISOString(),
			},
		});

		// 4. Verify all components are working together
		const retrievedMemory = await memories.get('workflow-memory-001');
		expect(retrievedMemory).toBeDefined();
		if (retrievedMemory) {
			expect(retrievedMemory.content).toContain('Integrated workflow test');
		}

		const retrievedTask = await taskRepo.get('workflow-task-001');
		expect(retrievedTask).toBeDefined();
		if (retrievedTask) {
			expect((retrievedTask.record.metadata as { related_memory?: string }).related_memory).toBe(
				'workflow-memory-001',
			);
		}

		// 5. Verify system status through MCP
		const toolsResponse = await fetch(`${runtime.mcpUrl}/tools`);
		const tools = await toolsResponse.json();
		const systemTools = tools.tools.filter((tool: { name: string }) =>
			tool.name.startsWith('system.'),
		);
		expect(systemTools.length).toBeGreaterThan(0);

		// Cleanup
		await taskRepo.delete('workflow-task-001');
	});

	it('should provide brAInwav system observability', async () => {
		// Test monitoring and observability features

		// 1. Verify health endpoint provides detailed status
		const healthResponse = await fetch(`${runtime.httpUrl}/health`, {
			headers: withAuthHeaders(),
		});
		const health = await healthResponse.json();

		expect(health.status).toBe('ok');
		expect(health.timestamp).toBeDefined();

		// 2. Verify SSE events for real-time monitoring
		const sseResponse = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: withAuthHeaders({ Accept: 'text/event-stream' }),
		});

		expect(sseResponse.status).toBe(200);
		const reader = sseResponse.body?.getReader();
		if (reader) {
			await reader.read().catch(() => undefined);
			await reader.cancel();
		}

		// 3. Verify MCP tools provide system information
		const toolsResponse = await fetch(`${runtime.mcpUrl}/tools`);
		const tools = await toolsResponse.json();

		const monitoringTools = tools.tools.filter(
			(tool: { name: string }) => tool.name.includes('status') || tool.name.includes('resources'),
		);

		expect(monitoringTools.length).toBeGreaterThan(0);

		// 4. Test event emission for monitoring
		await runtime.events.emitEvent({
			type: 'system.health.check',
			data: {
				status: 'healthy',
				component: 'second-brain-validation',
				timestamp: new Date().toISOString(),
				metrics: {
					memory_usage: 'normal',
					response_time: 'optimal',
					error_rate: 'zero',
				},
			},
		});

		// Should not throw
		expect(true).toBe(true);
	});
});

// Helper function to wait for services to be ready
async function waitForServicesReady(
	runtime: RuntimeHandle,
	timeoutMs: number = 10000,
): Promise<void> {
	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		try {
			// Test HTTP endpoint
			const healthResponse = await fetch(`${runtime.httpUrl}/health`, {
				headers: withAuthHeaders(),
			});
			if (healthResponse.status !== 200) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				continue;
			}

			// Test MCP endpoint
			const toolsResponse = await fetch(`${runtime.mcpUrl}/tools`);
			if (toolsResponse.status !== 200) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				continue;
			}

			// Test event system
			await runtime.events.emitEvent({
				type: 'service.readiness.check',
				data: { timestamp: new Date().toISOString() },
			});

			// All services are ready
			return;
		} catch {
			// Services not ready yet, wait and retry
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	throw new Error(`brAInwav services did not become ready within ${timeoutMs}ms`);
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
// Co-authored-by: brAInwav Development Team
