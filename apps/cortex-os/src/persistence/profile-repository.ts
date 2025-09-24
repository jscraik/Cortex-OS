import { readdir, rm } from 'node:fs/promises';

import { ensureDataDir, getDataPath } from '../platform/xdg.js';
import { OptimisticLockError } from './errors.js';
import { readJsonFileWithDigest, writeJsonFile as writeJsonFileToPath } from './json-store.js';

const PROFILE_DIR = ['profiles'];
const PROFILE_FILE_EXTENSION = '.json';

export interface ProfileRecord {
	id: string;
	label?: string;
	scopes?: string[];
	[key: string]: unknown;
}

export interface ProfileEntry {
	record: ProfileRecord;
	digest: string;
}

interface SaveOptions {
	expectedDigest?: string;
}

export class ProfileRepository {
	async save(profile: ProfileRecord, opts: SaveOptions = {}): Promise<ProfileEntry> {
		this.assertId(profile?.id, 'save');
		return this.writeRecord(profile.id, profile, opts.expectedDigest);
	}

	async get(id: string): Promise<ProfileEntry | undefined> {
		this.assertId(id, 'get');
		const located = await readJsonFileWithDigest<ProfileRecord>(this.pathFor(id));
		if (!located) return undefined;
		return { record: located.value, digest: located.digest };
	}

	async list(): Promise<ProfileEntry[]> {
		await ensureDataDir(...PROFILE_DIR);
		const directory = getDataPath(...PROFILE_DIR);
		const entries = await readdir(directory, { withFileTypes: true });
		const profiles: ProfileEntry[] = [];

		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith(PROFILE_FILE_EXTENSION)) continue;
			const id = entry.name.slice(0, -PROFILE_FILE_EXTENSION.length);
			const located = await this.get(id);
			if (located) profiles.push(located);
		}

		return profiles;
	}

	async update(
		id: string,
		patch: Partial<ProfileRecord>,
		opts: SaveOptions = {},
	): Promise<ProfileEntry | undefined> {
		this.assertId(id, 'update');
		if (patch.id && patch.id !== id) {
			throw new Error('ProfileRepository.update does not support changing id');
		}

		const existing = await this.get(id);
		if (!existing) return undefined;

		const expected = opts.expectedDigest ?? existing.digest;
		const next: ProfileRecord = {
			...existing.record,
			...patch,
			id: existing.record.id,
			scopes: patch.scopes ?? existing.record.scopes,
		};
		return this.writeRecord(id, next, expected);
	}

	async replace(id: string, profile: ProfileRecord, opts: SaveOptions = {}): Promise<ProfileEntry> {
		this.assertId(id, 'replace');
		if (profile.id !== id) {
			throw new Error('ProfileRepository.replace requires matching id');
		}

		return this.writeRecord(id, profile, opts.expectedDigest);
	}

	async delete(id: string): Promise<void> {
		this.assertId(id, 'delete');
		const path = this.pathFor(id);
		await rm(path, { force: true });
	}

	private async writeRecord(
		id: string,
		record: ProfileRecord,
		expectedDigest?: string,
	): Promise<ProfileEntry> {
		const current = await readJsonFileWithDigest<ProfileRecord>(this.pathFor(id));
		if (expectedDigest && (!current || expectedDigest !== current.digest)) {
			throw new OptimisticLockError('Profile digest mismatch', {
				expected: expectedDigest,
				actual: current?.digest,
			});
		}

		const { digest } = await writeJsonFileToPath(this.pathFor(id), record);
		return { record, digest };
	}

	private pathFor(id: string): string {
		return getDataPath(...PROFILE_DIR, fileNameFor(id));
	}

	private assertId(id: string | undefined, method: string): asserts id is string {
		if (!id) {
			throw new Error(`ProfileRepository.${method} requires an id`);
		}
	}
}

function fileNameFor(id: string): string {
	return `${id}${PROFILE_FILE_EXTENSION}`;
}
