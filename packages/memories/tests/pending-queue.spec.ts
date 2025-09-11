import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import { createMemoryService } from '../src/service/memory-service.js';
import { LocalEmbedder } from './util/local-embedder.js';

describe('Consent workflow', () => {
	it('queues memories requiring consent', async () => {
		const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
		const now = new Date().toISOString();
		const pending = await svc.save({
			id: 'p1',
			kind: 'note',
			text: 'secret',
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
			policy: { requiresConsent: true },
		});
		expect(pending.status).toBe('pending');
		expect(await svc.get('p1')).toBeNull();
		const list = await svc.listPending();
		expect(list.map((m) => m.id)).toContain('p1');
	});

	it('approves pending memories', async () => {
		const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
		const now = new Date().toISOString();
		await svc.save({
			id: 'a1',
			kind: 'note',
			text: 'approve me',
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
			policy: { requiresConsent: true },
		});
		await svc.approve('a1');
		const mem = await svc.get('a1');
		expect(mem?.status).toBe('approved');
		const list = await svc.listPending();
		expect(list.find((m) => m.id === 'a1')).toBeUndefined();
	});

	it('discards pending memories', async () => {
		const svc = createMemoryService(new InMemoryStore(), new LocalEmbedder());
		const now = new Date().toISOString();
		await svc.save({
			id: 'd1',
			kind: 'note',
			text: 'discard me',
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
			policy: { requiresConsent: true },
		});
		await svc.discard('d1');
		const mem = await svc.get('d1');
		expect(mem).toBeNull();
		const list = await svc.listPending();
		expect(list.find((m) => m.id === 'd1')).toBeUndefined();
	});
});
