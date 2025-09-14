import { describe, expect, it, vi } from 'vitest';
import {
	type OutboxMessage,
	OutboxMessageStatus,
} from '../a2a-contracts/src/outbox-types';
import { InMemoryOutboxRepository } from './in-memory-outbox-repository';
import { replayPending } from './replay';

// Helper type representing save input without id/createdAt filled yet
type PartialOutboxMessage = Omit<OutboxMessage, 'id' | 'createdAt'>;

describe('Replay Helpers', () => {
	it('replays pending messages in order', async () => {
		const repo = new InMemoryOutboxRepository();
		const first: PartialOutboxMessage = {
			aggregateType: 'a2a-message',
			aggregateId: '1',
			eventType: 'x',
			payload: { a: 1 },
			metadata: { source: 's' },
			status: OutboxMessageStatus.PENDING,
			retryCount: 0,
			maxRetries: 3,
		};
		await repo.save(first);
		await new Promise((r) => setTimeout(r, 5));
		const second: PartialOutboxMessage = {
			aggregateType: 'a2a-message',
			aggregateId: '2',
			eventType: 'x',
			payload: { a: 2 },
			metadata: { source: 's' },
			status: OutboxMessageStatus.PENDING,
			retryCount: 0,
			maxRetries: 3,
		};
		await repo.save(second);
		const order: string[] = [];
		const publish = vi.fn().mockImplementation(async (msg: OutboxMessage) => {
			order.push(msg.aggregateId);
		});
		const count = await replayPending({ repository: repo, publish });
		expect(count).toBe(2);
		expect(order).toEqual(['1', '2']);
	});
});
