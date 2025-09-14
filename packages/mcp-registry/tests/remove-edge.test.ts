import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readAll, remove, upsert } from '../src/fs-store.js';

let dir: string;
beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'mcp-reg-remove-'));
	process.env.CORTEX_HOME = dir;
});
afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
	delete process.env.CORTEX_HOME;
});

describe('registry remove edge cases', () => {
	it('returns false when name absent and true when present', async () => {
		const first = await remove('missing');
		expect(first).toBe(false);
		await upsert({ name: 'svc', transport: 'stdio', command: 'echo' });
		const second = await remove('svc');
		expect(second).toBe(true);
		const all = await readAll();
		expect(all.find((s) => s.name === 'svc')).toBeUndefined();
	});
});
