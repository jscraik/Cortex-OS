import { randomUUID } from 'node:crypto';
import {
        BranchIdSchema,
        type CheckpointBranchRequest,
        CheckpointBranchRequestSchema,
        type CheckpointContext,
        CheckpointContextSchema,
        type CheckpointListPage,
        CheckpointListPageSchema,
        type CheckpointMeta,
        type CheckpointRecord,
        CheckpointRecordSchema,
        type CheckpointSnapshot,
} from '../contracts/checkpoint.js';

export interface CheckpointManager {
        save(record: CheckpointRecord): Promise<CheckpointRecord>;
        context(id: string): Promise<CheckpointContext | undefined>;
        list(limit: number, cursor?: string): Promise<CheckpointListPage>;
        snapshot(id: string): Promise<CheckpointSnapshot | undefined>;
        branch(request: CheckpointBranchRequest): Promise<{ branchId: string; checkpoints: string[] }>;
        prune(): Promise<number>;
}

interface StoredCheckpoint extends CheckpointRecord {
        branchId?: string;
}

class InMemoryCheckpointManager implements CheckpointManager {
        private readonly store = new Map<string, StoredCheckpoint>();
        private readonly branchIndex = new Map<string, string[]>();
        private readonly retention = 500;

        async save(record: CheckpointRecord): Promise<CheckpointRecord> {
                const normalized = CheckpointRecordSchema.parse(record) as CheckpointRecord;
                const entry: StoredCheckpoint = {
                        ...normalized,
                        meta: {
                                ...normalized.meta,
                                id: normalized.meta.id || `ckpt_${randomUUID()}`,
                        },
                };

                this.store.set(entry.meta.id, entry);
                this.registerBranch(entry.meta);
                await this.pruneIfNeeded();
                return entry;
        }

        async context(id: string): Promise<CheckpointContext | undefined> {
                const entry = this.store.get(id);
                if (!entry) return undefined;
                const related = this.branchIndex.get(entry.meta.branch ?? '')?.filter((item) => item !== id) ?? [];
                const context = CheckpointContextSchema.parse({
                        meta: entry.meta,
                        state: entry.state,
                        related: related.map((relatedId) => this.store.get(relatedId)?.meta).filter(Boolean) as CheckpointMeta[],
                }) as CheckpointContext;
                return context;
        }

        async list(limit: number, cursor?: string): Promise<CheckpointListPage> {
                const records = Array.from(this.store.values()).sort((a, b) =>
                        b.meta.createdAt.localeCompare(a.meta.createdAt),
                );
                let startIndex = 0;
                if (cursor) {
                        const index = records.findIndex((item) => item.meta.id === cursor);
                        if (index >= 0) {
                                startIndex = index + 1;
                        }
                }
                const page = records.slice(startIndex, startIndex + limit);
                const nextCursor = page.length + startIndex < records.length ? page[page.length - 1]?.meta.id : undefined;
                return CheckpointListPageSchema.parse({
                        items: page,
                        total: records.length,
                        nextCursor,
                }) as CheckpointListPage;
        }

        async snapshot(id: string): Promise<CheckpointSnapshot | undefined> {
                const entry = this.store.get(id);
                if (!entry) return undefined;
                return { ...entry, branchId: entry.meta.branch } as CheckpointSnapshot;
        }

        async branch(request: CheckpointBranchRequest): Promise<{ branchId: string; checkpoints: string[] }> {
                const { from, count, labels } = CheckpointBranchRequestSchema.parse(request) as CheckpointBranchRequest;
                const source = this.store.get(from);
                if (!source) {
                        throw new Error(`Checkpoint ${from} not found`);
                }
                const branchId = BranchIdSchema.parse(source.meta.branch ?? `branch_${randomUUID()}`) as string;
                const checkpoints: string[] = [];
                for (let i = 0; i < count; i += 1) {
                        const clonedMeta: CheckpointMeta = {
                                ...source.meta,
                                id: `ckpt_${randomUUID()}`,
                                parent: source.meta.id,
                                branch: branchId,
                                createdAt: new Date().toISOString(),
                                labels: labels ?? source.meta.labels,
                        };
                        const record: StoredCheckpoint = {
                                meta: clonedMeta,
                                state: JSON.parse(JSON.stringify(source.state)) as CheckpointRecord['state'],
                                branchId,
                        };
                        this.store.set(record.meta.id, record);
                        this.registerBranch(record.meta);
                        checkpoints.push(record.meta.id);
                }
                return { branchId, checkpoints };
        }

        async prune(): Promise<number> {
                return this.pruneIfNeeded();
        }

        private registerBranch(meta: CheckpointMeta): void {
                if (!meta.branch) return;
                const existing = this.branchIndex.get(meta.branch) ?? [];
                if (!existing.includes(meta.id)) {
                        existing.push(meta.id);
                        this.branchIndex.set(meta.branch, existing);
                }
        }

        private async pruneIfNeeded(): Promise<number> {
                if (this.store.size <= this.retention) {
                        return 0;
                }
                const records = Array.from(this.store.values()).sort((a, b) =>
                        a.meta.createdAt.localeCompare(b.meta.createdAt),
                );
                const removeCount = this.store.size - this.retention;
                for (let i = 0; i < removeCount; i += 1) {
                        const record = records[i];
                        this.store.delete(record.meta.id);
                        if (record.meta.branch) {
                                const branchEntries = this.branchIndex.get(record.meta.branch);
                                if (branchEntries) {
                                        this.branchIndex.set(
                                                record.meta.branch,
                                                branchEntries.filter((id) => id !== record.meta.id),
                                        );
                                }
                        }
                }
                return removeCount;
        }
}

const sharedManager = new InMemoryCheckpointManager();

export interface MemoryProvider {
        checkpoints?: CheckpointManager;
}

export function createMemoryProviderFromEnv(): MemoryProvider {
        return { checkpoints: sharedManager };
}

export function getCheckpointManager(): CheckpointManager {
        return sharedManager;
}
