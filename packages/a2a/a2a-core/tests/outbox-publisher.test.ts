import { describe, expect, it, vi } from 'vitest';
import { type OutboxMessage, OutboxMessageStatus } from '../../a2a-contracts/src/outbox-types.js';
import { ReliableOutboxPublisher } from '../src/outbox.js';

describe('ReliableOutboxPublisher', () => {
	it('publishes envelope with data only', async () => {
		const publish = vi.fn().mockResolvedValue(undefined);
		const transport = { publish };
		const publisher = new ReliableOutboxPublisher(transport);

		const message: OutboxMessage = {
			id: '00000000-0000-0000-0000-000000000000',
			aggregateType: 'test',
			aggregateId: '1',
			eventType: 'TestEvent',
			payload: { foo: 'bar' },
			createdAt: new Date(),
			status: OutboxMessageStatus.PENDING,
			retryCount: 0,
			maxRetries: 3,
		};

		await publisher.publish(message);

		expect(publish).toHaveBeenCalledTimes(1);
		const envelope = publish.mock.calls[0][0];
		expect(envelope.data).toEqual(message.payload);
		expect('payload' in envelope).toBe(false);
	});
});
