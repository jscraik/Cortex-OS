import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, expect, test } from 'vitest';

import {
	ensureDataDir,
	getDataHome,
	getDataPath,
} from '../../src/platform/xdg';

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
	tempRoot = await mkdtemp(join(tmpdir(), 'cortex-os-data-test-'));
	process.env.CORTEX_OS_TMP = tempRoot;
});

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
		tempRoot = undefined;
	}
});

test('getDataHome resolves relative to CORTEX_OS_TMP', () => {
	expect(getDataHome()).toBe(join(tempRoot, 'data'));
});

test('getDataPath joins provided segments under data root', () => {
	const path = getDataPath('tasks', 'queued.json');
	expect(path).toBe(join(tempRoot, 'data', 'tasks', 'queued.json'));
});

test('ensureDataDir creates nested directories and returns the path', async () => {
	const ensured = await ensureDataDir('tasks', 'queued');
	expect(ensured).toBe(join(tempRoot, 'data', 'tasks', 'queued'));

	const stats = await stat(ensured);
	expect(stats.isDirectory()).toBe(true);
});
