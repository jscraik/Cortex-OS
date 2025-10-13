import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

import { ensureDataDir, getDataPath } from '../platform/xdg.js';
import { OptimisticLockError } from './errors.js';
import { readJsonFile, writeJsonFile } from './json-store.js';

const ARTIFACT_NAMESPACE = ['artifacts'];
const INDEX_NAMESPACE = [...ARTIFACT_NAMESPACE, 'index'];
const METADATA_FILENAME = 'metadata.json';
const PAYLOAD_FILENAME = 'payload.bin';

export interface ArtifactMetadata {
	id: string;
	filename: string;
	contentType: string;
	size: number;
	digest: string;
	partition: string;
	taskId?: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface ArtifactRecord {
	metadata: ArtifactMetadata;
	binary: Buffer;
}

export interface SaveArtifactInput {
	id?: string;
	filename: string;
	contentType: string;
	binary: Buffer;
	taskId?: string;
	tags?: string[];
	expectedDigest?: string;
}

export interface ArtifactFilter {
	taskId?: string;
	tag?: string;
	filename?: string;
}

interface ArtifactLocation {
	metadata: ArtifactMetadata;
	partition: string;
	payloadPath: string;
}

interface ArtifactRepositoryOptions {
	now?: () => Date;
}

const BINARY_TMP_SUFFIX = '.tmp';
const DEFAULT_LIST_CONCURRENCY = 8;
const MAX_LIST_CONCURRENCY = 32;
const LIST_CONCURRENCY = (() => {
        const raw = process.env.CORTEX_OS_ARTIFACT_LIST_CONCURRENCY;
        if (!raw) return DEFAULT_LIST_CONCURRENCY;

        const parsed = Number.parseInt(raw, 10);
        if (Number.isNaN(parsed) || parsed < 1) {
                return DEFAULT_LIST_CONCURRENCY;
        }

        return Math.min(parsed, MAX_LIST_CONCURRENCY);
})();

export class ArtifactRepository {
	private readonly now: () => Date;

	constructor(options: ArtifactRepositoryOptions = {}) {
		this.now = options.now ?? (() => new Date());
	}

	async save(input: SaveArtifactInput): Promise<ArtifactMetadata> {
		const id = input.id ?? randomUUID();
		const existing = await this.loadArtifact(id);

		if (existing) {
			if (!input.expectedDigest || input.expectedDigest !== existing.metadata.digest) {
				throw new OptimisticLockError('Artifact digest mismatch', {
					expected: input.expectedDigest,
					actual: existing.metadata.digest,
				});
			}
		}

		const now = this.now();
		const partition = existing?.partition ?? this.formatPartition(now);
		await ensureDataDir(...ARTIFACT_NAMESPACE, partition, id);
		await ensureDataDir(...INDEX_NAMESPACE);

		const payloadPath = this.payloadPath(partition, id);
		await this.writeBinary(payloadPath, input.binary);

		const digest = createHash('sha256').update(input.binary).digest('hex');
		const size = input.binary.length;
		const createdAt = existing?.metadata.createdAt ?? now.toISOString();
		const tags = input.tags ?? existing?.metadata.tags ?? [];
		const metadata: ArtifactMetadata = {
			id,
			filename: input.filename,
			contentType: input.contentType,
			size,
			digest,
			partition,
			taskId: input.taskId ?? existing?.metadata.taskId,
			tags: [...tags],
			createdAt,
			updatedAt: now.toISOString(),
		};

		const metadataPath = this.metadataPath(partition, id);
		await writeJsonFile(metadataPath, metadata);
		await writeJsonFile(this.indexPath(id), { partition });

		return metadata;
	}

	async get(id: string): Promise<ArtifactRecord | undefined> {
		const located = await this.loadArtifact(id);
		if (!located) return undefined;
		const binary = await readFile(located.payloadPath);
		return { metadata: located.metadata, binary };
	}

        async list(filter: ArtifactFilter = {}): Promise<ArtifactMetadata[]> {
                const indexDir = await ensureDataDir(...INDEX_NAMESPACE);
                const entries = await readdir(indexDir, { withFileTypes: true });
                const artifactIds = entries
                        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
                        .map((entry) => entry.name.slice(0, -'.json'.length));

                if (artifactIds.length === 0) {
                        return [];
                }

                // Only use concurrency if artifactIds.length > 10 to avoid unnecessary overhead
                const concurrency = artifactIds.length > 10
                        ? Math.max(1, Math.min(LIST_CONCURRENCY, artifactIds.length))
                        : 1;
                const metadataSlots: Array<ArtifactMetadata | undefined> = new Array(artifactIds.length);
                let cursor = 0;

                const workers = Array.from({ length: concurrency }, async () => {
                        while (true) {
                                const index = cursor++;
                                if (index >= artifactIds.length) {
                                        break;
                                }

                                const id = artifactIds[index];
                                const located = await this.loadArtifact(id);
                                if (!located) {
                                        continue;
                                }

                                const { metadata } = located;
                                if (filter.taskId && metadata.taskId !== filter.taskId) continue;
                                if (filter.tag && (!metadata.tags || !metadata.tags.includes(filter.tag))) continue;
                                if (filter.filename && metadata.filename !== filter.filename) continue;

                                metadataSlots[index] = metadata;
                        }
                });

                await Promise.all(workers);

                return metadataSlots.filter((metadata): metadata is ArtifactMetadata => metadata !== undefined);
        }

	async delete(id: string): Promise<void> {
		const located = await this.loadArtifact(id);
		if (!located) return;

		await rm(located.payloadPath, { force: true });
		await rm(this.metadataPath(located.partition, id), { force: true });
		await rm(this.indexPath(id), { force: true });
	}

	private async loadArtifact(id: string): Promise<ArtifactLocation | undefined> {
		const index = await readJsonFile<{ partition: string }>(this.indexPath(id));
		if (!index?.partition) return undefined;

		const metadataPath = this.metadataPath(index.partition, id);
		const metadata = await readJsonFile<ArtifactMetadata>(metadataPath);
		if (!metadata) return undefined;

		return {
			metadata,
			partition: index.partition,
			payloadPath: this.payloadPath(index.partition, id),
		};
	}

	private metadataPath(partition: string, id: string): string {
		return getDataPath(...ARTIFACT_NAMESPACE, partition, id, METADATA_FILENAME);
	}

	private payloadPath(partition: string, id: string): string {
		return getDataPath(...ARTIFACT_NAMESPACE, partition, id, PAYLOAD_FILENAME);
	}

	private indexPath(id: string): string {
		return getDataPath(...INDEX_NAMESPACE, `${id}.json`);
	}

	private async writeBinary(targetPath: string, payload: Buffer): Promise<void> {
		const tmpPath = `${targetPath}.${randomUUID()}${BINARY_TMP_SUFFIX}`;
		await writeFile(tmpPath, payload);
		try {
			await rename(tmpPath, targetPath);
		} catch (error) {
			if ((error as NodeJS.ErrnoException)?.code === 'EXDEV') {
				await writeFile(targetPath, payload);
			} else {
				throw error;
			}
		} finally {
			await rm(tmpPath, { force: true });
		}
	}

	private formatPartition(date: Date): string {
		return date.toISOString().slice(0, 10);
	}
}
