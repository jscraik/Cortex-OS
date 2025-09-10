import { describe, expect, test } from 'vitest';
import { provideMemories } from '../src/services';

describe('memories service', () => {
	test('saves and retrieves a memory', async () => {
		const service = provideMemories();
		const now = new Date().toISOString();
		const saved = await service.save({
			id: '1',
			kind: 'note',
			text: 'hello',
			createdAt: now,
			updatedAt: now,
			provenance: { source: 'user' },
		});
		const fetched = await service.get('1');
		expect(fetched).toEqual(saved);
	});
});
