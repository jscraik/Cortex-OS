import { describe, expect, it } from 'vitest';
import { EncryptedStore } from '../src/adapters/store.encrypted.js';
import { InMemoryStore } from '../src/adapters/store.memory.js';
import type { Memory } from '../src/domain/types.js';
import { InMemoryAesGcm } from '../src/ports/Encryption.js';

describe('EncryptedStore', () => {
	it('roundtrips text and provenance with at-rest encryption', async () => {
		const inner = new InMemoryStore();
		const crypto = new InMemoryAesGcm('test-secret');
		const store = new EncryptedStore(inner, crypto);

		const now = new Date().toISOString();
		const m: Memory = {
			id: 'e1',
			kind: 'note',
			text: 'sensitive text',
			tags: ['secure'],
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user', actor: 'alice' },
		};

		await store.upsert(m);

		// Verify underlying store has encrypted payload
		const raw = await inner.get('e1');
		expect(typeof raw?.text).toBe('string');
		expect(raw?.text?.startsWith('enc:')).toBe(true);
		expect(typeof raw?.provenance).toBe('string');

		const got = await store.get('e1');
		expect(got?.text).toBe('sensitive text');
		expect(got?.provenance?.actor).toBe('alice');
	});

	it('propagates decryption errors', async () => {
		const inner = new InMemoryStore();
		const crypto = new InMemoryAesGcm('test-secret');
		const store = new EncryptedStore(inner, crypto);

		const now = new Date().toISOString();
		// Manually craft a malformed encrypted record
		await inner.upsert({
			id: 'bad',
			kind: 'note',
			text: 'enc:invalid-base64',
			tags: [],
			createdAt: now,
			updatedAt: now,
			provenance: 'enc:also-bad' as unknown as Memory['provenance'],
		} as Memory);

		await expect(store.get('bad')).rejects.toBeTruthy();
	});
});
