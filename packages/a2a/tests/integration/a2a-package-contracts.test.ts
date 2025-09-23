import { createEnvelope, type Envelope } from '@cortex-os/a2a-contracts';
import { createBus } from '@cortex-os/a2a-core';
import type { A2AEventEnvelope } from '@cortex-os/a2a-events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('A2A Package Contract Integration', () => {
	let mockTransport: any;

	beforeEach(() => {
		mockTransport = {
			publish: vi.fn(),
			subscribe: vi.fn(),
		};
	});

	it('a2a-core should accept a2a-contracts envelopes', () => {
		const envelope = createEnvelope({
			type: 'agent.task.created',
			source: 'urn:cortex:task-manager',
			data: { taskId: '123' },
		});

		// This should not throw compilation errors
		const bus = createBus(mockTransport);
		expect(() => bus.publish(envelope as A2AEventEnvelope)).not.toThrow();
	});

	it('a2a-events envelopes should be compatible with a2a-contracts', () => {
		const standardEnvelope = createEnvelope({
			type: 'github.push',
			source: 'urn:github:user/repo',
			data: {
				event_type: 'push',
				repository: { full_name: 'user/repo' },
				delivery_id: '12345',
			},
		});

		// This should validate successfully
		expect(() => {
			const a2aEventEnvelope = standardEnvelope as A2AEventEnvelope;
			expect(a2aEventEnvelope.type).toBe('github.push');
			expect(a2aEventEnvelope.source).toBe('urn:github:user/repo');
		}).not.toThrow();
	});

	it('should handle envelope with custom headers', () => {
		const envelope = createEnvelope({
			type: 'agent.auth.request',
			source: 'urn:cortex:auth:service',
			data: { userId: 'user123' },
			headers: {
				authorization: 'Bearer token123',
				'x-request-id': 'req-123',
			},
		});

		const bus = createBus(mockTransport);
		bus.publish(envelope as A2AEventEnvelope);

		expect(mockTransport.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'agent.auth.request',
				headers: expect.objectContaining({
					authorization: 'Bearer token123',
					'x-request-id': 'req-123',
				}),
			}),
		);
	});

	it('should maintain trace context through envelope', () => {
		const envelope = createEnvelope({
			type: 'trace.test',
			source: 'urn:cortex:trace',
			data: { message: 'test' },
			traceparent: '00-12345678901234567890123456789012-1234567890123456-01',
			tracestate: 'key1=value1,key2=value2',
		});

		const bus = createBus(mockTransport);
		bus.publish(envelope as A2AEventEnvelope);

		expect(mockTransport.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'trace.test',
				traceparent: '00-12345678901234567890123456789012-1234567890123456-01',
				tracestate: 'key1=value1,key2=value2',
			}),
		);
	});
});
