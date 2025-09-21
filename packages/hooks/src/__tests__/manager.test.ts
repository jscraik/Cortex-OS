import { beforeAll, describe, expect, it } from 'vitest';
import { CortexHooks } from '../../src/manager.js';
import type { HookResult } from '../../src/types.js';

describe('CortexHooks basic', () => {
	const hooks = new CortexHooks();
	beforeAll(async () => {
		await hooks.init();
	});

	it('runs js hook allow/deny', async () => {
		const results = await hooks.run('PreToolUse', {
			event: 'PreToolUse',
			tool: { name: 'Write', input: { file_path: '/tmp/test.txt' } },
			cwd: process.cwd(),
			user: 'test',
		});
		expect(Array.isArray(results)).toBe(true);
		// At least returns HookResult[]; if sample.yaml present, may include allow/deny
		for (const r of results as HookResult[])
			expect(['allow', 'deny', 'emit', 'defer', 'exec']).toContain(r.action);
	});
});
