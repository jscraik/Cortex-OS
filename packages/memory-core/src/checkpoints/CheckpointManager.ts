import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
        BranchId,
        CheckpointId,
        CheckpointMeta,
        CheckpointRecord,
} from '@cortex-os/contracts';
import { CheckpointRecordSchema } from '@cortex-os/contracts';
import { MemoryProviderError } from '../types.js';
import type {
        CheckpointBranchRequest,
        CheckpointBranchResult,
        CheckpointConfig,
        CheckpointContext,
        CheckpointListPage,
        CheckpointSnapshot,
} from '../types.js';
import { ensureCheckpointSchema } from './sqlite-schema.js';
import { resolveCheckpointPolicy, type CheckpointRuntimePolicy } from './policies.js';

interface SaveOptions {
        overwrite?: boolean;
}

const SELECT_COLUMNS = `
        id,
        parent_id as parentId,
        branch_id as branchId,
        created_at as createdAt,
        score,
        labels,
        size_bytes as sizeBytes,
        digest,
        state_json as stateJson,
        meta_json as metaJson
`;

type CheckpointRow = {
        id: string;
        parentId?: string | null;
        branchId?: string | null;
        createdAt: string;
        score?: number | null;
        labels?: string | null;
        sizeBytes?: number | null;
        digest: string;
        stateJson: string;
        metaJson: string;
};

export interface CheckpointManagerOptions {
        policy?: CheckpointConfig;
}

function toCheckpointRecord(row: CheckpointRow): CheckpointRecord {
        const meta: CheckpointMeta = JSON.parse(row.metaJson);
        return {
                meta,
                state: JSON.parse(row.stateJson),
        };
}

export class CheckpointManager {
        private readonly db: Database.Database;
        private readonly policy: CheckpointRuntimePolicy;

        constructor(db: Database.Database, options?: CheckpointManagerOptions) {
                this.db = db;
                ensureCheckpointSchema(this.db);
                this.policy = resolveCheckpointPolicy(options?.policy);
        }

        async save(record: CheckpointRecord, options: SaveOptions = {}): Promise<CheckpointRecord> {
                const parsed = CheckpointRecordSchema.parse(record);
                const stateJson = JSON.stringify(parsed.state);
                const meta = this.normalizeMeta(parsed.meta, stateJson.length);
                const digest = this.computeDigest(stateJson);

                const query = options.overwrite
                        ? `REPLACE INTO checkpoints (
                                        id,
                                        parent_id,
                                        branch_id,
                                        created_at,
                                        score,
                                        labels,
                                        size_bytes,
                                        digest,
                                        state_json,
                                        meta_json
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                        : `INSERT INTO checkpoints (
                                        id,
                                        parent_id,
                                        branch_id,
                                        created_at,
                                        score,
                                        labels,
                                        size_bytes,
                                        digest,
                                        state_json,
                                        meta_json
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const statement = this.db.prepare(query);

                const result = statement.run(
                                meta.id,
                                meta.parent ?? null,
                                meta.branch ?? null,
                                meta.createdAt,
                                meta.score ?? null,
                                meta.labels ? JSON.stringify(meta.labels) : null,
                                meta.sizeBytes,
                                digest,
                                stateJson,
                                JSON.stringify(meta),
                        );

                if (!options.overwrite && result.changes === 0) {
                        throw new MemoryProviderError(
                                'VALIDATION',
                                `Checkpoint with id ${meta.id} already exists`,
                        );
                }

                await this.policy.prune(this.db);

                return {
                        meta,
                        state: parsed.state,
                };
        }

        async load(id: CheckpointId): Promise<CheckpointRecord | null> {
                const row = this.db
                        .prepare(`SELECT ${SELECT_COLUMNS} FROM checkpoints WHERE id = ? LIMIT 1`)
                        .get(id) as CheckpointRow | undefined;

                if (!row) {
                        return null;
                }

                return toCheckpointRecord(row);
        }

        async list(limit = 20, cursor?: string): Promise<CheckpointListPage> {
                const params: unknown[] = [];
                let query = `SELECT ${SELECT_COLUMNS} FROM checkpoints`;

                if (cursor) {
                        query += ' WHERE created_at < ?';
                        params.push(cursor);
                }

                query += ' ORDER BY created_at DESC LIMIT ?';
                params.push(limit + 1);

                const rows = this.db.prepare(query).all(...params) as CheckpointRow[];
                const hasMore = rows.length > limit;
                const slice = hasMore ? rows.slice(0, limit) : rows;

                const records = slice.map(toCheckpointRecord);

                return {
                        items: records,
                        nextCursor: hasMore ? slice[slice.length - 1]?.createdAt : undefined,
                };
        }

        async remove(id: CheckpointId): Promise<boolean> {
                const result = this.db.prepare('DELETE FROM checkpoints WHERE id = ?').run(id);
                return result.changes > 0;
        }

        async rollback(to: CheckpointId): Promise<CheckpointRecord> {
                const checkpoint = await this.load(to);

                if (!checkpoint) {
                        throw new MemoryProviderError('NOT_FOUND', `Checkpoint ${to} not found`);
                }

                return checkpoint;
        }

        async branch(request: CheckpointBranchRequest): Promise<CheckpointBranchResult> {
                const source = await this.load(request.from);

                if (!source) {
                        throw new MemoryProviderError('NOT_FOUND', `Parent checkpoint ${request.from} missing`);
                }

                this.policy.enforceBranch(request.count);

                const branchId = this.createBranchId();
                const ids: CheckpointId[] = [];

                for (let index = 0; index < request.count; index += 1) {
                        const id = this.createCheckpointId();
                        const meta: CheckpointMeta = {
                                ...source.meta,
                                id,
                                parent: source.meta.id,
                                branch: branchId,
                                createdAt: new Date().toISOString(),
                                labels: request.labels ?? source.meta.labels,
                                sizeBytes: source.meta.sizeBytes,
                        };

                        await this.save({ meta, state: source.state });
                        ids.push(id);
                }

                return {
                        parent: source.meta.id,
                        branchId,
                        checkpoints: ids,
                };
        }

        async snapshot(id: CheckpointId): Promise<CheckpointSnapshot | null> {
                const row = this.db
                        .prepare(`SELECT ${SELECT_COLUMNS} FROM checkpoints WHERE id = ? LIMIT 1`)
                        .get(id) as CheckpointRow | undefined;

                if (!row) {
                        return null;
                }

                const record = toCheckpointRecord(row);
                return {
                        ...record,
                        digest: row.digest,
                };
        }

        async context(id: CheckpointId): Promise<CheckpointContext | null> {
                const snapshot = await this.snapshot(id);
                if (!snapshot) {
                        return null;
                }

                return {
                        meta: snapshot.meta,
                        state: snapshot.state,
                        digest: snapshot.digest,
                };
        }

        async prune(): Promise<number> {
                return this.policy.prune(this.db);
        }

        private computeDigest(payload: string): string {
                return `sha256:${createHash('sha256').update(payload).digest('hex')}`;
        }

        private normalizeMeta(meta: CheckpointMeta, size: number): CheckpointMeta {
                return {
                        ...meta,
                        sizeBytes: meta.sizeBytes ?? size,
                        createdAt: meta.createdAt ?? new Date().toISOString(),
                };
        }

        private createCheckpointId(): CheckpointId {
                return `ckpt_${randomUUID()}`;
        }

        private createBranchId(): BranchId {
                return `branch_${randomUUID()}`;
        }
}

export function createCheckpointManager(
        db: Database.Database,
        options?: CheckpointManagerOptions,
): CheckpointManager {
        return new CheckpointManager(db, options);
}
