import { describe, expect, it } from 'vitest';
import { runDockerMatrix } from '../utils/memories-docker-matrix.js';

const adapters = ['sqlite', 'prisma', 'local'];

describe('memories Docker smoke matrix', () => {
	it('runs health check for each adapter', async () => {
		const result = await runDockerMatrix(adapters);
		expect(result.failedAdapters).toHaveLength(0);
		expect(result.passedAdapters).toEqual(adapters);
	});
});
