import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ensureDataDir } from '../../src/platform/xdg';
import { EvidenceRepository, type EvidenceRecord } from '../../src/persistence/evidence-repository';
import { OptimisticLockError } from '../../src/persistence/errors';

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
	tempRoot = await mkdtemp(join(tmpdir(), 'cortex-os-evidence-repo-test-'));
	process.env.CORTEX_OS_TMP = tempRoot;
	await ensureDataDir('evidence');
});

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
		tempRoot = undefined;
	}
});

describe('EvidenceRepository', () => {
	test('persists evidence across repository restart', async () => {
		const repo = new EvidenceRepository();
		const record: EvidenceRecord = {
			id: 'evidence-1',
			taskId: 'task-123',
			type: 'audit',
			timestamp: new Date('2025-09-18T12:00:00Z').toISOString(),
			payload: { detail: 'created' },
			tags: [],
		};

		await repo.save(record);

		const restarted = new EvidenceRepository();
		const restored = await restarted.get('evidence-1');

		expect(restored?.record).toEqual(record);
		expect(restored?.digest).toMatch(/^[a-f0-9]{64}$/);
	});

	test('lists and filters evidence by task id', async () => {
		const repo = new EvidenceRepository();
		await repo.save({
			id: 'evidence-a',
			taskId: 'task-a',
			type: 'audit',
			timestamp: new Date().toISOString(),
			payload: { detail: 'a' },
		});
		await repo.save({
			id: 'evidence-b',
			taskId: 'task-b',
			type: 'inspection',
			timestamp: new Date().toISOString(),
			payload: { detail: 'b' },
		});

		const filtered = await repo.list({ taskId: 'task-a' });
		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.record.id).toBe('evidence-a');
	});

	test('uses optimistic locking for updates', async () => {
		const repo = new EvidenceRepository();
		const initial = await repo.save({
			id: 'evidence-lock',
			taskId: 'task-lock',
			type: 'audit',
			timestamp: new Date().toISOString(),
			payload: { step: 1 },
		});

		const updated = await repo.save(
			{
				id: 'evidence-lock',
				taskId: 'task-lock',
				type: 'audit',
				timestamp: initial.record.timestamp,
				payload: { step: 2 },
			},
			{ expectedDigest: initial.digest },
		);

		expect(updated.digest).not.toBe(initial.digest);
		expect(updated.record.payload).toEqual({ step: 2 });

		await expect(
			repo.save(
				{
					id: 'evidence-lock',
					taskId: 'task-lock',
					type: 'audit',
					timestamp: initial.record.timestamp,
					payload: { step: 3 },
				},
				{ expectedDigest: 'deadbeef' },
			),
		).rejects.toBeInstanceOf(OptimisticLockError);
	});
});
