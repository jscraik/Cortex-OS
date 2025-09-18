import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, expect, test } from 'vitest';
import { readJsonFile, writeJsonFile } from '../../src/platform/json-store';
import { ensureDataDir, getDataPath } from '../../src/platform/xdg';

const originalTmp = process.env.CORTEX_OS_TMP;
let tempRoot: string | undefined;

afterAll(async () => {
	if (originalTmp) {
		process.env.CORTEX_OS_TMP = originalTmp;
	} else {
		delete process.env.CORTEX_OS_TMP;
	}

	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
	}
});

beforeEach(async () => {
	tempRoot = await mkdtemp(join(tmpdir(), 'cortex-os-json-test-'));
	process.env.CORTEX_OS_TMP = tempRoot;
	await ensureDataDir();
});

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
		tempRoot = undefined;
	}
});

test('writeJsonFile stores data under data root and returns full path', async () => {
	const relativePath = ['tasks', 'task-123.json'];
	const payload = { id: 'task-123', status: 'pending' };

	const storedPath = await writeJsonFile(relativePath, payload);
	expect(storedPath).toBe(getDataPath(...relativePath));

	const raw = await readFile(storedPath, 'utf-8');
	expect(JSON.parse(raw)).toEqual(payload);
});

test('readJsonFile returns parsed content for existing files', async () => {
	const relativePath = ['profiles', 'profile-1.json'];
	const payload = { id: 'profile-1', name: 'Ada Lovelace' };
	await writeJsonFile(relativePath, payload);

	const stored = await readJsonFile<typeof payload>(relativePath);
	expect(stored).toEqual(payload);
});

test('readJsonFile returns undefined when file does not exist', async () => {
	const missing = await readJsonFile(['tasks', 'missing.json']);
	expect(missing).toBeUndefined();
});
