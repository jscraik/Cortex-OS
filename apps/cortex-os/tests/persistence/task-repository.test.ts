import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ensureDataDir } from '../../src/platform/xdg';
import { TaskRepository } from '../../src/persistence/task-repository';

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
	tempRoot = await mkdtemp(join(tmpdir(), 'cortex-os-task-repo-test-'));
	process.env.CORTEX_OS_TMP = tempRoot;
	await ensureDataDir('tasks');
});

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
		tempRoot = undefined;
	}
});

describe('TaskRepository', () => {
	test('persists and retrieves tasks by id', async () => {
		const repo = new TaskRepository();
		const task = { id: 'task-1', status: 'pending', payload: { description: 'Test task' } };
	
		const saved = await repo.save(task);
		expect(saved.record).toEqual(task);
		expect(saved.digest).toMatch(/^[a-f0-9]{64}$/);
	
		const loaded = await repo.get(task.id);
		expect(loaded?.record).toEqual(task);
		expect(loaded?.digest).toBe(saved.digest);
	});

	test('list returns all persisted tasks', async () => {
		const repo = new TaskRepository();
		const tasks = [
			{ id: 'task-1', status: 'pending' },
			{ id: 'task-2', status: 'completed' },
		];
	
		for (const task of tasks) {
			await repo.save(task);
		}
	
		const loaded = await repo.list();
	
		expect(loaded).toHaveLength(2);
		expect(loaded.map((entry) => entry.record)).toEqual(expect.arrayContaining(tasks));
		for (const entry of loaded) {
			expect(entry.digest).toMatch(/^[a-f0-9]{64}$/);
		}
	});

	test('delete removes task from persistence', async () => {
		const repo = new TaskRepository();
		const task = { id: 'task-3', status: 'in-progress' };
		await repo.save(task);

		await repo.delete(task.id);

		const loaded = await repo.get(task.id);
		expect(loaded).toBeUndefined();
	});

	test('save is idempotent for identical payloads', async () => {
		const repo = new TaskRepository();
		const task = { id: 'task-4', status: 'pending', attempts: 1 };
	
		const first = await repo.save(task);
		const second = await repo.save(task);
	
		expect(second.digest).toBe(first.digest);
		const loaded = await repo.get(task.id);
		expect(loaded?.record).toEqual(task);
	});

	test('update merges partial task data', async () => {
		const repo = new TaskRepository();
		const initial = await repo.save({ id: 'task-5', status: 'pending', attempts: 1, notes: 'initial' });
	
		const updated = await repo.update('task-5', { status: 'completed', attempts: 2 }, { expectedDigest: initial.digest });
	
		expect(updated?.record).toEqual({ id: 'task-5', status: 'completed', attempts: 2, notes: 'initial' });
		expect(updated?.digest).not.toBe(initial.digest);
	
		const reloaded = await repo.get('task-5');
		expect(reloaded).toEqual(updated);
	});

	test('replace overwrites existing task content', async () => {
		const repo = new TaskRepository();
		const initial = await repo.save({ id: 'task-6', status: 'queued', notes: 'legacy' });
	
		const replaced = await repo.replace('task-6', { id: 'task-6', status: 'queued', retries: 0 }, { expectedDigest: initial.digest });
	
		const loaded = await repo.get('task-6');
		expect(loaded).toEqual(replaced);
	});

	test('data survives repository re-initialisation', async () => {
		const firstRepo = new TaskRepository();
		const task = { id: 'task-5', status: 'queued' };
		const saved = await firstRepo.save(task);
	
		const secondRepo = new TaskRepository();
		const loaded = await secondRepo.get(task.id);
	
		expect(loaded).toEqual(saved);
	});
});
