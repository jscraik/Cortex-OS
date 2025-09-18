import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ensureDataDir } from '../../src/platform/xdg';
import { ProfileRepository } from '../../src/persistence/profile-repository';

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
	tempRoot = await mkdtemp(join(tmpdir(), 'cortex-os-profile-repo-test-'));
	process.env.CORTEX_OS_TMP = tempRoot;
	await ensureDataDir('profiles');
});

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
		tempRoot = undefined;
	}
});

describe('ProfileRepository', () => {
	test('persists and retrieves profiles by id', async () => {
		const repo = new ProfileRepository();
		const profile = { id: 'profile-1', label: 'Primary', scopes: ['tasks:read'] };

		const saved = await repo.save(profile);
		expect(saved.record).toEqual(profile);
		expect(saved.digest).toMatch(/^[a-f0-9]{64}$/);

		const loaded = await repo.get(profile.id);
		expect(loaded).toEqual(saved);
	});

	test('list returns all persisted profiles', async () => {
		const repo = new ProfileRepository();
		const profiles = [
			{ id: 'profile-1', label: 'Primary' },
			{ id: 'profile-2', label: 'Secondary' },
		];

		for (const profile of profiles) {
			await repo.save(profile);
		}

		const loaded = await repo.list();

		expect(loaded).toHaveLength(2);
		expect(loaded.map((entry) => entry.record)).toEqual(expect.arrayContaining(profiles));
		for (const entry of loaded) {
			expect(entry.digest).toMatch(/^[a-f0-9]{64}$/);
		}
	});

	test('update merges partial profile data', async () => {
		const repo = new ProfileRepository();
		const initial = await repo.save({ id: 'profile-3', label: 'Legacy', scopes: ['read'] });

		const updated = await repo.update(
			'profile-3',
			{ scopes: ['read', 'write'] },
			{ expectedDigest: initial.digest },
		);

		expect(updated?.record).toEqual({
			id: 'profile-3',
			label: 'Legacy',
			scopes: ['read', 'write'],
		});
		expect(updated?.digest).not.toBe(initial.digest);

		const reloaded = await repo.get('profile-3');
		expect(reloaded).toEqual(updated);
	});

	test('replace overwrites existing profile content', async () => {
		const repo = new ProfileRepository();
		const initial = await repo.save({ id: 'profile-4', label: 'Old', scopes: ['read'] });

		const replaced = await repo.replace(
			'profile-4',
			{ id: 'profile-4', label: 'New' },
			{ expectedDigest: initial.digest },
		);

		const loaded = await repo.get('profile-4');
		expect(loaded).toEqual(replaced);
	});

	test('delete removes profile from persistence', async () => {
		const repo = new ProfileRepository();
		await repo.save({ id: 'profile-5', label: 'Ephemeral' });

		await repo.delete('profile-5');

		const loaded = await repo.get('profile-5');
		expect(loaded).toBeUndefined();
	});

	test('data survives repository re-initialisation', async () => {
		const firstRepo = new ProfileRepository();
		const profile = { id: 'profile-6', label: 'Persisted' };
		const saved = await firstRepo.save(profile);

		const secondRepo = new ProfileRepository();
		const loaded = await secondRepo.get(profile.id);

		expect(loaded).toEqual(saved);
	});
});
