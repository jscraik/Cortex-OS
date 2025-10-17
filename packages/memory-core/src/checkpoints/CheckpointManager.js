import { createHash, randomUUID } from 'node:crypto';
import { CheckpointRecordSchema } from '@cortex-os/contracts';
import { MemoryProviderError } from '../types.js';
import { resolveCheckpointPolicy } from './policies.js';
import { ensureCheckpointSchema } from './sqlite-schema.js';
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
function toCheckpointRecord(row) {
    const meta = JSON.parse(row.metaJson);
    return {
        meta,
        state: JSON.parse(row.stateJson),
    };
}
export class CheckpointManager {
    db;
    policy;
    constructor(db, options) {
        this.db = db;
        ensureCheckpointSchema(this.db);
        this.policy = resolveCheckpointPolicy(options?.policy);
    }
    async save(record, options = {}) {
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
        const result = statement.run(meta.id, meta.parent ?? null, meta.branch ?? null, meta.createdAt, meta.score ?? null, meta.labels ? JSON.stringify(meta.labels) : null, meta.sizeBytes, digest, stateJson, JSON.stringify(meta));
        if (!options.overwrite && result.changes === 0) {
            throw new MemoryProviderError('VALIDATION', `Checkpoint with id ${meta.id} already exists`);
        }
        await this.policy.prune(this.db);
        return {
            meta,
            state: parsed.state,
        };
    }
    async load(id) {
        const row = this.db
            .prepare(`SELECT ${SELECT_COLUMNS} FROM checkpoints WHERE id = ? LIMIT 1`)
            .get(id);
        if (!row) {
            return null;
        }
        return toCheckpointRecord(row);
    }
    async list(limit = 20, cursor) {
        const params = [];
        let query = `SELECT ${SELECT_COLUMNS} FROM checkpoints`;
        if (cursor) {
            query += ' WHERE created_at < ?';
            params.push(cursor);
        }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit + 1);
        const rows = this.db.prepare(query).all(...params);
        const hasMore = rows.length > limit;
        const slice = hasMore ? rows.slice(0, limit) : rows;
        const records = slice.map(toCheckpointRecord);
        return {
            items: records,
            nextCursor: hasMore && rows[limit] ? rows[limit].createdAt : undefined,
        };
    }
    async remove(id) {
        const result = this.db.prepare('DELETE FROM checkpoints WHERE id = ?').run(id);
        return result.changes > 0;
    }
    async rollback(to) {
        const checkpoint = await this.load(to);
        if (!checkpoint) {
            throw new MemoryProviderError('NOT_FOUND', `Checkpoint ${to} not found`);
        }
        return checkpoint;
    }
    async branch(request) {
        const source = await this.load(request.from);
        if (!source) {
            throw new MemoryProviderError('NOT_FOUND', `Parent checkpoint ${request.from} missing`);
        }
        this.policy.enforceBranch(request.count);
        const branchId = this.createBranchId();
        const ids = [];
        for (let index = 0; index < request.count; index += 1) {
            const id = this.createCheckpointId();
            const meta = {
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
    async snapshot(id) {
        const row = this.db
            .prepare(`SELECT ${SELECT_COLUMNS} FROM checkpoints WHERE id = ? LIMIT 1`)
            .get(id);
        if (!row) {
            return null;
        }
        const record = toCheckpointRecord(row);
        return {
            ...record,
            digest: row.digest,
        };
    }
    async context(id) {
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
    async prune() {
        return this.policy.prune(this.db);
    }
    computeDigest(payload) {
        return `sha256:${createHash('sha256').update(payload).digest('hex')}`;
    }
    normalizeMeta(meta, size) {
        return {
            ...meta,
            sizeBytes: meta.sizeBytes ?? size,
            createdAt: meta.createdAt ?? new Date().toISOString(),
        };
    }
    createCheckpointId() {
        return `ckpt_${randomUUID()}`;
    }
    createBranchId() {
        return `branch_${randomUUID()}`;
    }
}
export function createCheckpointManager(db, options) {
    return new CheckpointManager(db, options);
}
