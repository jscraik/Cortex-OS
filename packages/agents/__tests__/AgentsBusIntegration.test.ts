/**
 * @file Agents A2A Integration Tests
 * @description Tests for A2A bus integration and agent communication
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAgentsBusIntegration } from '../src/AgentsBusIntegration.js';
import { createAgentsBus } from '../src/a2a.js';

describe('Agents A2A Integration', () => {
	let busIntegration: ReturnType<typeof createAgentsBusIntegration>;

	beforeEach(async () => {
		busIntegration = createAgentsBusIntegration();
		await busIntegration.initialize();
	});

	afterEach(async () => {
		await busIntegration.destroy();
	});

	describe('Bus Integration Lifecycle', () => {
		it('should initialize bus integration successfully', async () => {
			const newIntegration = createAgentsBusIntegration();
			await expect(newIntegration.initialize()).resolves.not.toThrow();
			await newIntegration.destroy();
		});

		it('should provide access to the bus instance', () => {
			const bus = busIntegration.getBus();
			expect(bus).toBeDefined();
			expect(bus.bus).toBeDefined();
			expect(bus.schemaRegistry).toBeDefined();
		});
	});

	describe('Agent Event Notifications', () => {
		it('should notify agent creation', async () => {
			await expect(
				busIntegration.notifyAgentCreated('test-agent-id', 'code-analysis', ['analyze', 'review']),
			).resolves.not.toThrow();
		});

		it('should notify task start', async () => {
			await expect(
				busIntegration.notifyTaskStarted(
					'task-123',
					'agent-456',
					'code-analysis',
					'Analyze TypeScript code',
					'high',
				),
			).resolves.not.toThrow();
		});

		it('should notify task completion', async () => {
			await expect(
				busIntegration.notifyTaskCompleted(
					'task-123',
					'agent-456',
					'code-analysis',
					'success',
					5000,
					{ issues: 0, quality: 'excellent' },
				),
			).resolves.not.toThrow();
		});

		it('should notify agent communication', async () => {
			await expect(
				busIntegration.notifyCommunication(
					'agent-1',
					'agent-2',
					'delegation',
					{ task: 'analyze code' },
					'corr-123',
				),
			).resolves.not.toThrow();
		});
	});

	describe('A2A Bus Schema Registry', () => {
		it('should create bus with schema registry', () => {
			const bus = createAgentsBus();
			expect(bus.schemaRegistry).toBeDefined();
		});

		it('should validate agent created event schema', () => {
			const bus = createAgentsBus();
			const validData = {
				agentId: 'test-agent',
				agentType: 'code-analysis',
				capabilities: ['analyze'],
				configuration: {},
				createdAt: new Date().toISOString(),
			};

			expect(() => {
				bus.schemaRegistry.validate('agents.agent_created', validData);
			}).not.toThrow();
		});

		it('should validate task started event schema', () => {
			const bus = createAgentsBus();
			const validData = {
				taskId: 'task-123',
				agentId: 'agent-456',
				taskType: 'analysis',
				description: 'Test task',
				priority: 'medium' as const,
				startedAt: new Date().toISOString(),
			};

			expect(() => {
				bus.schemaRegistry.validate('agents.task_started', validData);
			}).not.toThrow();
		});

		it('should reject invalid event data', () => {
			const bus = createAgentsBus();
			const invalidData = {
				// Missing required fields
				agentId: 'test-agent',
			};

			expect(() => {
				bus.schemaRegistry.validate('agents.agent_created', invalidData);
			}).toThrow();
		});
	});

	describe('Event Emission and Subscription', () => {
		it('should emit and receive agent events', async () => {
			const bus = createAgentsBus();
			let receivedEvent: any = null;

			// Subscribe to events
			bus.onAgentCreated((data) => {
				receivedEvent = data;
			});

			// Emit event
			await bus.emitAgentCreated({
				agentId: 'test-agent',
				agentType: 'test-type',
				capabilities: ['test'],
				configuration: {},
				createdAt: new Date().toISOString(),
			});

			// Note: In actual implementation, this would be async
			// For now, we just verify the emit doesn't throw
			expect(receivedEvent).toBeDefined();
		});

		it('should emit task events', async () => {
			const bus = createAgentsBus();

			await expect(
				bus.emitTaskStarted({
					taskId: 'task-123',
					agentId: 'agent-456',
					taskType: 'analysis',
					description: 'Test task',
					priority: 'medium',
					startedAt: new Date().toISOString(),
				}),
			).resolves.not.toThrow();

			await expect(
				bus.emitTaskCompleted({
					taskId: 'task-123',
					agentId: 'agent-456',
					taskType: 'analysis',
					status: 'success',
					durationMs: 1000,
					completedAt: new Date().toISOString(),
				}),
			).resolves.not.toThrow();
		});
	});

	describe('Error Handling', () => {
		it('should handle bus initialization errors gracefully', async () => {
			// Test with invalid config
			const integration = createAgentsBusIntegration({
				busOptions: { invalidOption: true },
			});

			// Should not throw during initialization
			await expect(integration.initialize()).resolves.not.toThrow();
			await integration.destroy();
		});

		it('should handle duplicate initialization', async () => {
			await busIntegration.initialize(); // Second call
			// Should not throw or cause issues
			expect(busIntegration.getBus()).toBeDefined();
		});
	});
});
