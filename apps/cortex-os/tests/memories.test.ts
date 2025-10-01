import { describe, expect, test, type vi } from 'vitest';
import { provideMemories } from '../src/services.js';

describe('memories service', () => {
	test('saves and retrieves a memory', async () => {
		const service = provideMemories();
		const createdAt = new Date().toISOString();
		const saved = await service.save({
			id: 'memory-1',
			content: 'hello cortex memory',
			importance: 7,
			tags: ['demo'],
			metadata: { createdAt, createdBy: 'test' },
		});

		expect(saved.id).toBe('memory-1');
		expect(saved.content).toBe('hello cortex memory');
		expect(saved.importance).toBe(7);
		expect(saved.tags).toEqual(['demo']);
		expect(saved.metadata?.remoteId).toMatch(/^remote-/);
		const fetched = await service.get('memory-1');
		expect(fetched).toEqual(saved);

		const fetchStub = (globalThis as any).__memoryFetchStub as ReturnType<typeof vi.fn>;
		expect(fetchStub).toHaveBeenCalledWith(
			`${process.env.LOCAL_MEMORY_BASE_URL}/memory/store`,
			expect.objectContaining({ method: 'POST' }),
		);
	});
});
