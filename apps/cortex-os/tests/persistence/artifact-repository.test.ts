import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ArtifactRepository } from '../../src/persistence/artifact-repository.js';
import { OptimisticLockError } from '../../src/persistence/errors.js';
import { ensureDataDir, getDataPath } from '../../src/platform/xdg.js';

const FIXED_NOW = new Date('2025-09-18T12:34:56.000Z');

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
	tempRoot = await mkdtemp(join(tmpdir(), 'cortex-os-artifact-repo-test-'));
	process.env.CORTEX_OS_TMP = tempRoot;
	await ensureDataDir('artifacts');
});

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
		tempRoot = undefined;
	}
});

describe('ArtifactRepository', () => {
	test('saves and retrieves artifacts with binary digest metadata', async () => {
		const repo = new ArtifactRepository({ now: () => FIXED_NOW });
		const payload = Buffer.from('artifact-payload');

		const artifact = await repo.save({
			filename: 'artifact.txt',
			contentType: 'text/plain',
			taskId: 'task-123',
			tags: ['log'],
			binary: payload,
		});

		expect(artifact.filename).toBe('artifact.txt');
		expect(artifact.contentType).toBe('text/plain');
		expect(artifact.size).toBe(payload.length);
		expect(artifact.partition).toBe('2025-09-18');

		const expectedDigest = createHash('sha256').update(payload).digest('hex');
		expect(artifact.digest).toBe(expectedDigest);

		const storedPayload = await readFile(
			getDataPath('artifacts', artifact.partition, artifact.id, 'payload.bin'),
		);
		expect(Buffer.compare(storedPayload, payload)).toBe(0);

		const retrieved = await repo.get(artifact.id);
		expect(retrieved?.metadata.digest).toBe(expectedDigest);
		expect(retrieved?.metadata.filename).toBe('artifact.txt');
		expect(Buffer.compare(retrieved?.binary ?? Buffer.alloc(0), payload)).toBe(0);
	});

	test('lists artifacts with task filter', async () => {
		const repo = new ArtifactRepository({ now: () => FIXED_NOW });
		const first = await repo.save({
			filename: 'first.txt',
			contentType: 'text/plain',
			taskId: 'task-a',
			tags: ['export'],
			binary: Buffer.from('first'),
		});
		await repo.save({
			filename: 'second.txt',
			contentType: 'text/plain',
			taskId: 'task-b',
			tags: ['report'],
			binary: Buffer.from('second'),
		});

		const filtered = await repo.list({ taskId: 'task-a' });
		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.id).toBe(first.id);
	});

	test('enforces optimistic locking on conflicting updates', async () => {
		const repo = new ArtifactRepository({ now: () => FIXED_NOW });
		const initial = await repo.save({
			filename: 'artifact.txt',
			contentType: 'text/plain',
			binary: Buffer.from('v1'),
		});

		const next = await repo.save({
			id: initial.id,
			filename: 'artifact.txt',
			contentType: 'text/plain',
			binary: Buffer.from('v2'),
			expectedDigest: initial.digest,
		});

		expect(next.digest).not.toBe(initial.digest);

		await expect(
			repo.save({
				id: initial.id,
				filename: 'artifact.txt',
				contentType: 'text/plain',
				binary: Buffer.from('v3'),
				expectedDigest: 'deadbeef',
			}),
		).rejects.toBeInstanceOf(OptimisticLockError);
	});

	test('persisted artifacts survive repository restart', async () => {
		const repo = new ArtifactRepository({ now: () => FIXED_NOW });
		const artifact = await repo.save({
			filename: 'artifact.txt',
			contentType: 'text/plain',
			binary: Buffer.from('persisted'),
			taskId: 'task-777',
		});

		const restoredRepo = new ArtifactRepository();
		const restored = await restoredRepo.get(artifact.id);

		expect(restored?.metadata.id).toBe(artifact.id);
		expect(restored?.metadata.taskId).toBe('task-777');
		expect(Buffer.compare(restored?.binary ?? Buffer.alloc(0), Buffer.from('persisted'))).toBe(0);
	});
});
