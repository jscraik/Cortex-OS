import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { readJsonFile, writeJsonFile } from '../../src/persistence/json-store';

let root: string;

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), 'json-store-'));
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe('writeJsonFile', () => {
	test('writes JSON atomically and returns digest metadata', async () => {
		const target = join(root, 'nested', 'records', 'task.json');
		const payload = { id: 'task-123', status: 'queued', schema: 'cortex.task@1' };

		const result = await writeJsonFile(target, payload);

		expect(result.bytes).toBeGreaterThan(0);
		expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
		expect(result.path).toBe(target);

		const contents = await readFile(target, 'utf-8');
		expect(JSON.parse(contents)).toEqual(payload);

		const expectedDigest = createHash('sha256').update(contents).digest('hex');
		expect(result.digest).toBe(expectedDigest);

		// temp files cleaned up
		const parentEntries = await readdir(dirname(target));
		expect(parentEntries.filter((file) => file.endsWith('.tmp'))).toHaveLength(0);
	});
});

describe('readJsonFile', () => {
	test('returns parsed object when file exists', async () => {
		const target = join(root, 'profiles', 'default.json');
		await writeJsonFile(target, { id: 'profile', schema: 'cortex.profile@1' });

		const result = await readJsonFile<{ id: string; schema: string }>(target);

		expect(result).toEqual({ id: 'profile', schema: 'cortex.profile@1' });
	});

	test('returns undefined when file missing', async () => {
		const missing = join(root, 'missing.json');
		const result = await readJsonFile(missing);
		expect(result).toBeUndefined();
	});
});
