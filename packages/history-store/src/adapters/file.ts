import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Envelope } from '@cortex-os/protocol';
import { EnvelopeSchema } from '@cortex-os/protocol';
import type { FileConfig, HistoryRange, HistoryRecord, HistoryStore } from '../types.js';

const ensureDir = async (path: string): Promise<void> => {
	await mkdir(dirname(path), { recursive: true });
};

const buildEventPath = (root: string, sessionId: string): string =>
	join(root, `${sessionId}.jsonl`);
const buildCheckpointPath = (root: string, sessionId: string): string =>
	join(root, `${sessionId}.checkpoint.json`);

const parseLine = (line: string): HistoryRecord | null => {
	if (!line.trim()) {
		return null;
	}
	const parsed = JSON.parse(line) as HistoryRecord;
	return parsed;
};

class FileHistoryStore implements HistoryStore {
	public constructor(private readonly config: FileConfig) {}

	public async append(envelope: Envelope): Promise<void> {
		const parsed = EnvelopeSchema.parse(envelope);
		const record: HistoryRecord = {
			id: parsed.id,
			sessionId: parsed.sessionId ?? 'unknown',
			envelope: parsed,
			createdAt: parsed.occurredAt,
		};
		const path = buildEventPath(this.config.root, record.sessionId);
		await ensureDir(path);
		await appendFile(path, `${JSON.stringify(record)}\n`, 'utf8');
	}

	public async *stream(sessionId: string, range?: HistoryRange): AsyncIterable<HistoryRecord> {
		const path = buildEventPath(this.config.root, sessionId);
		let contents: string;
		try {
			contents = await readFile(path, 'utf8');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return;
			}
			throw error;
		}
		const lines = contents.split('\n');
		let emitted = 0;
		for (const line of lines) {
			if (range?.limit && emitted >= range.limit) {
				break;
			}
			const record = parseLine(line);
			if (!record) {
				continue;
			}
			if (range?.from && record.createdAt < range.from) {
				continue;
			}
			if (range?.to && record.createdAt > range.to) {
				continue;
			}
			yield { ...record, envelope: record.envelope };
			emitted += 1;
		}
	}

	public async checkpoint(sessionId: string, payload: unknown): Promise<void> {
		const path = buildCheckpointPath(this.config.root, sessionId);
		await ensureDir(path);
		const checkpoint = { sessionId, payload, createdAt: new Date().toISOString() };
		await writeFile(path, JSON.stringify(checkpoint, null, 2), 'utf8');
	}

	public async getCheckpoint(sessionId: string) {
		const path = buildCheckpointPath(this.config.root, sessionId);
		try {
			const raw = await readFile(path, 'utf8');
			return JSON.parse(raw);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return null;
			}
			throw error;
		}
	}

	public async close(): Promise<void> {}
}

export const createFileHistoryStore = (config: FileConfig): HistoryStore =>
	new FileHistoryStore(config);
