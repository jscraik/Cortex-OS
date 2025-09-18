import { randomUUID } from 'node:crypto';
import { readdir, rm } from 'node:fs/promises';

import { ensureDataDir, getDataPath } from '../platform/xdg';
import { readJsonFileWithDigest, writeJsonFile } from './json-store';
import { OptimisticLockError } from './errors';

const EVIDENCE_NAMESPACE = ['evidence'];
const EVIDENCE_EXTENSION = '.json';

export interface EvidenceRecord {
	id: string;
	taskId: string;
	type: string;
	timestamp: string;
	payload: Record<string, unknown>;
	tags?: string[];
}

export interface EvidenceEntry {
	record: EvidenceRecord;
	digest: string;
}

export interface EvidenceFilter {
	taskId?: string;
	type?: string;
	tag?: string;
}

export interface SaveEvidenceInput extends Omit<EvidenceRecord, 'id'> {
	id?: string;
}

interface SaveOptions {
	expectedDigest?: string;
}

export class EvidenceRepository {
	async save(
		input: SaveEvidenceInput,
		opts: SaveOptions = {},
	): Promise<EvidenceEntry> {
		const id = input.id ?? randomUUID();
		const path = this.recordPath(id);
		await ensureDataDir(...EVIDENCE_NAMESPACE);

		const existing = await readJsonFileWithDigest<EvidenceRecord>(path);
		if (existing) {
			if (!opts.expectedDigest || opts.expectedDigest !== existing.digest) {
				throw new OptimisticLockError('Evidence digest mismatch', {
					expected: opts.expectedDigest,
					actual: existing.digest,
				});
			}
		}

		const tags = input.tags ?? existing?.value.tags ?? [];
		const record: EvidenceRecord = {
			id,
			taskId: input.taskId,
			type: input.type,
			timestamp: input.timestamp,
			payload: input.payload,
			tags: [...tags],
		};

		const { digest } = await writeJsonFile(path, record);
		return { record, digest };
	}

	async get(id: string): Promise<EvidenceEntry | undefined> {
		const located = await readJsonFileWithDigest<EvidenceRecord>(this.recordPath(id));
		if (!located) return undefined;
		return { record: located.value, digest: located.digest };
	}

	async list(filter: EvidenceFilter = {}): Promise<EvidenceEntry[]> {
		const dir = await ensureDataDir(...EVIDENCE_NAMESPACE);
		const entries = await readdir(dir, { withFileTypes: true });
		const results: EvidenceEntry[] = [];

		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith(EVIDENCE_EXTENSION)) continue;
			const id = entry.name.slice(0, -EVIDENCE_EXTENSION.length);
			const located = await readJsonFileWithDigest<EvidenceRecord>(
				this.recordPath(id),
			);
			if (!located) continue;

			if (filter.taskId && located.value.taskId !== filter.taskId) continue;
			if (filter.type && located.value.type !== filter.type) continue;
			if (
				filter.tag &&
				(!located.value.tags || !located.value.tags.includes(filter.tag))
			)
				continue;

			results.push({ record: located.value, digest: located.digest });
		}

		return results;
	}

	async delete(id: string): Promise<void> {
		await rm(this.recordPath(id), { force: true });
	}

	private recordPath(id: string): string {
		return getDataPath(...EVIDENCE_NAMESPACE, `${id}${EVIDENCE_EXTENSION}`);
	}
}
