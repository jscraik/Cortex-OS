import { describe, expect, it } from 'vitest';
import { ResourceManager } from '../src/intelligence/resource-manager.js';

describe('ResourceManager', () => {
	it('allocates no more than maxConcurrentAgents', async () => {
		const manager = new ResourceManager({ maxConcurrentAgents: 3 });
		const plan = { steps: Array.from({ length: 10 }).map((_, i) => ({ id: `s${i}` })) };
		const allocation = await manager.allocateResources(plan);
		expect(allocation.agents.length).toBeLessThanOrEqual(3);
	});
});
