import { describe, expect, it } from 'vitest';
import {
	RealtimeMemoryChangeEventSchema,
	RealtimeMemoryInboundMessageSchema,
	RealtimeMemoryOutboundMessageSchema,
	RealtimeMemoryQueuedMessageSchema,
} from '../src/memory-realtime.js';

const iso = () => new Date().toISOString();

describe('Realtime memory message contracts', () => {
	it('accepts valid inbound subscription payloads', () => {
		const payload = {
			type: 'subscribe',
			namespace: 'default-channel',
			eventTypes: ['memories.created'],
			replaySince: iso(),
		} as const;

		const result = RealtimeMemoryInboundMessageSchema.safeParse(payload);
		expect(result.success).toBe(true);
	});

	it('rejects inbound payloads with invalid namespace characters', () => {
		const result = RealtimeMemoryInboundMessageSchema.safeParse({
			type: 'subscribe',
			namespace: 'invalid space',
		});

		expect(result.success).toBe(false);
	});

	it('validates outbound change messages and queue wrappers', () => {
		const changeEvent = RealtimeMemoryChangeEventSchema.parse({
			type: 'create',
			memoryId: 'task-123',
			namespace: 'default-channel',
			timestamp: iso(),
		});

		const outboundMessage = {
			type: 'change',
			event: changeEvent,
			namespace: 'default-channel',
			timestamp: iso(),
		} as const;

		const outbound = RealtimeMemoryOutboundMessageSchema.parse(outboundMessage);
		const queued = RealtimeMemoryQueuedMessageSchema.parse({
			namespace: outbound.namespace,
			payload: outbound,
			timestamp: iso(),
		});

		expect(outbound.type).toBe('change');
		expect((queued.payload as unknown as { namespace?: string }).namespace).toBe(
			(outbound as unknown as { namespace?: string }).namespace,
		);
	});

	it('rejects outbound messages with missing timestamps', () => {
		const result = RealtimeMemoryOutboundMessageSchema.safeParse({
			type: 'change',
			event: {
				type: 'create',
				namespace: 'default-channel',
			},
			namespace: 'default-channel',
		});

		expect(result.success).toBe(false);
	});
});
