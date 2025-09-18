import { readdir, rm } from 'node:fs/promises';

import { ensureDataDir, getDataPath } from '../platform/xdg';
import { OptimisticLockError } from './errors';
import { readJsonFileWithDigest, writeJsonFile as writeJsonFileToPath } from './json-store';

const TASK_DIR = ['tasks'];
const TASK_FILE_EXTENSION = '.json';

export interface TaskRecord {
	id: string;
	status?: string;
	[key: string]: unknown;
}

export interface TaskEntry {
	record: TaskRecord;
	digest: string;
}

interface SaveOptions {
	expectedDigest?: string;
}

export class TaskRepository {
	async save(task: TaskRecord, opts: SaveOptions = {}): Promise<TaskEntry> {
		this.assertId(task?.id, 'save');
		return this.writeRecord(task.id, task, opts.expectedDigest);
	}

	async get(id: string): Promise<TaskEntry | undefined> {
		this.assertId(id, 'get');
		const located = await readJsonFileWithDigest<TaskRecord>(this.pathFor(id));
		if (!located) return undefined;
		return { record: located.value, digest: located.digest };
	}

	async list(): Promise<TaskEntry[]> {
		await ensureDataDir(...TASK_DIR);
		const directory = getDataPath(...TASK_DIR);
		const entries = await readdir(directory, { withFileTypes: true });
		const tasks: TaskEntry[] = [];

		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith(TASK_FILE_EXTENSION)) continue;
			const id = entry.name.slice(0, -TASK_FILE_EXTENSION.length);
			const located = await this.get(id);
			if (located) tasks.push(located);
		}

		return tasks;
	}

	async update(
		id: string,
		patch: Partial<TaskRecord>,
		opts: SaveOptions = {},
	): Promise<TaskEntry | undefined> {
		this.assertId(id, 'update');
		if (patch.id && patch.id !== id) {
			throw new Error('TaskRepository.update does not support changing id');
		}

		const existing = await this.get(id);
		if (!existing) return undefined;

		const expected = opts.expectedDigest ?? existing.digest;
		const next: TaskRecord = { ...existing.record, ...patch, id: existing.record.id };
		return this.writeRecord(id, next, expected);
	}

	async replace(id: string, task: TaskRecord, opts: SaveOptions = {}): Promise<TaskEntry> {
		this.assertId(id, 'replace');
		if (task.id !== id) {
			throw new Error('TaskRepository.replace requires matching id');
		}

		return this.writeRecord(id, task, opts.expectedDigest);
	}

	async delete(id: string): Promise<void> {
		this.assertId(id, 'delete');
		const path = this.pathFor(id);
		await rm(path, { force: true });
	}

	private async writeRecord(
		id: string,
		record: TaskRecord,
		expectedDigest?: string,
	): Promise<TaskEntry> {
		const current = await readJsonFileWithDigest<TaskRecord>(this.pathFor(id));
		if (expectedDigest && (!current || expectedDigest !== current.digest)) {
			throw new OptimisticLockError('Task digest mismatch', {
				expected: expectedDigest,
				actual: current?.digest,
			});
		}

		const { digest } = await writeJsonFileToPath(this.pathFor(id), record);
		return { record, digest };
	}

	private pathFor(id: string): string {
		return getDataPath(...TASK_DIR, fileNameFor(id));
	}

	private assertId(id: string | undefined, method: string): asserts id is string {
		if (!id) {
			throw new Error(`TaskRepository.${method} requires an id`);
		}
	}
}

function fileNameFor(id: string): string {
	return `${id}${TASK_FILE_EXTENSION}`;
}
