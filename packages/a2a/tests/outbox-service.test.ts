import { describe, expect, it } from 'vitest';
import { createInMemoryOutboxService } from '../src/outbox-service.js';

describe('OutboxService (in-memory stub)', () => {
	const svc = createInMemoryOutboxService();

	it('processPending returns zeroed metrics', async () => {
		const res = await svc.processPending();
		expect(res).toEqual({
			processed: 0,
			successful: 0,
			failed: 0,
			deadLettered: 0,
		});
	});

	it('processRetries returns zeroed metrics', async () => {
		const res = await svc.processRetries();
		expect(res).toEqual({
			processed: 0,
			successful: 0,
			failed: 0,
			deadLettered: 0,
		});
	});

	it('cleanup returns zeroed deletion count', async () => {
		const res = await svc.cleanup();
		expect(res).toEqual({ cleanupDeleted: 0 });
	});

	it('dlqStats returns size 0', async () => {
		const res = await svc.dlqStats();
		expect(res).toEqual({ size: 0 });
	});
});
