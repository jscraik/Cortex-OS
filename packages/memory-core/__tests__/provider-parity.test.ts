import { createMemoryProviderFromEnv } from '../src/index.js';
import type { MemoryProvider, StoreMemoryInput } from '../src/provider/MemoryProvider.js';

describe('MemoryProvider Parity', () => {
	let provider: MemoryProvider;

	beforeAll(() => {
		provider = createMemoryProviderFromEnv();
	});

	it('should store and retrieve a memory', async () => {
		const input: StoreMemoryInput = {
			text: 'This is a test memory',
			tags: ['test'],
		};

		const { id } = await provider.store(input);
		const memory = await provider.get({ id });

		expect(memory).not.toBeNull();
		expect(memory.id).toBe(id);
		expect(memory.text).toBe(input.text);
	});

	it('should search for a memory', async () => {
		const input: StoreMemoryInput = {
			text: 'This is a searchable test memory',
			tags: ['search-test'],
		};

		await provider.store(input);

		const results = await provider.search({ query: 'searchable' });
		expect(results.hits.length).toBeGreaterThan(0);
		expect(results.hits[0].text).toContain('searchable');
	});

	it('should delete a memory', async () => {
		const input: StoreMemoryInput = {
			text: 'This is a memory to be deleted',
		};

		const { id } = await provider.store(input);
		const result = await provider.remove({ id });

		expect(result.deleted).toBe(true);

		const memory = await provider.get({ id });
		expect(memory).toBeNull();
	});
});
