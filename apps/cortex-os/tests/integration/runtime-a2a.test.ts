import { createEnvelope } from '@cortex-os/a2a-contracts';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock runtime
const mockRuntime = {
	a2a: {
		publish: vi.fn(),
		bind: vi.fn(),
	},
	start: vi.fn(),
	stop: vi.fn(),
};

// Mock startRuntime function
vi.mock('../../src/runtime', () => ({
	startRuntime: () => mockRuntime,
}));

import { startRuntime } from '../../src/runtime.js';

describe('Cortex-OS Runtime A2A Integration', () => {
	it('should start runtime with functional A2A messaging', async () => {
		const runtime = await startRuntime();

		// Test A2A bus is accessible
		expect(runtime.a2a).toBeDefined();
		expect(runtime.a2a.publish).toBeDefined();
		expect(runtime.a2a.bind).toBeDefined();

		// Test message publishing works
		const envelope = createEnvelope({
			type: 'runtime.health.check',
			source: 'urn:cortex:runtime:test',
			data: { timestamp: Date.now() },
		});

		// Should not throw errors
		await expect(runtime.a2a.publish(envelope as A2AEventEnvelope)).resolves.not.toThrow();

		expect(runtime.a2a.publish).toHaveBeenCalledWith(envelope);

		await runtime.stop();
		expect(runtime.stop).toHaveBeenCalled();
	});

	it('should handle agent communication through A2A', async () => {
		const runtime = await startRuntime();

		// Mock successful bind
		runtime.a2a.bind.mockResolvedValue(undefined);

		// Bind agent handlers
		await runtime.a2a.bind([
			{
				type: 'agent.task.created',
				handle: vi.fn(),
			},
			{
				type: 'agent.task.completed',
				handle: vi.fn(),
			},
		]);

		expect(runtime.a2a.bind).toHaveBeenCalledWith([
			expect.objectContaining({ type: 'agent.task.created' }),
			expect.objectContaining({ type: 'agent.task.completed' }),
		]);

		await runtime.stop();
	});

	it('should propagate errors from A2A messaging', async () => {
		const runtime = await startRuntime();

		// Mock publish failure
		const publishError = new Error('A2A publish failed');
		runtime.a2a.publish.mockRejectedValue(publishError);

		const envelope = createEnvelope({
			type: 'runtime.error.test',
			source: 'urn:cortex:runtime:test',
			data: { shouldFail: true },
		});

		// Should propagate the error
		await expect(runtime.a2a.publish(envelope as A2AEventEnvelope)).rejects.toThrow(publishError);

		await runtime.stop();
	});

	it('should maintain envelope integrity through runtime', async () => {
		const runtime = await startRuntime();

		const originalEnvelope = createEnvelope({
			type: 'runtime.integrity.test',
			source: 'urn:cortex:runtime:test',
			data: { sensitive: 'data' },
			headers: {
				'x-request-id': 'test-123',
				authorization: 'Bearer test-token',
			},
			correlationId: 'corr-123',
			causationId: 'cause-123',
		});

		// Capture the envelope passed to publish
		runtime.a2a.publish.mockImplementation((envelope: A2AEventEnvelope) => {
			// Verify all fields are preserved
			expect(envelope.type).toBe(originalEnvelope.type);
			expect(envelope.source).toBe(originalEnvelope.source);
			expect(envelope.data).toEqual(originalEnvelope.data);
			expect(envelope.headers).toEqual(originalEnvelope.headers);
			expect(envelope.correlationId).toBe(originalEnvelope.correlationId);
			expect(envelope.causationId).toBe(originalEnvelope.causationId);
			expect(envelope.id).toBe(originalEnvelope.id);
			return Promise.resolve();
		});

		await runtime.a2a.publish(originalEnvelope as A2AEventEnvelope);

		expect(runtime.a2a.publish).toHaveBeenCalled();
		await runtime.stop();
	});
});
