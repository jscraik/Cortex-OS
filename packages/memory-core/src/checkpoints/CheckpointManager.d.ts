import type { CheckpointId, CheckpointRecord } from '@cortex-os/contracts';
import type Database from 'better-sqlite3';
import type { CheckpointBranchRequest, CheckpointBranchResult, CheckpointConfig, CheckpointContext, CheckpointListPage, CheckpointSnapshot } from '../types.js';
interface SaveOptions {
    overwrite?: boolean;
}
export interface CheckpointManagerOptions {
    policy?: CheckpointConfig;
}
export declare class CheckpointManager {
    private readonly db;
    private readonly policy;
    constructor(db: Database.Database, options?: CheckpointManagerOptions);
    save(record: CheckpointRecord, options?: SaveOptions): Promise<CheckpointRecord>;
    load(id: CheckpointId): Promise<CheckpointRecord | null>;
    list(limit?: number, cursor?: string): Promise<CheckpointListPage>;
    remove(id: CheckpointId): Promise<boolean>;
    rollback(to: CheckpointId): Promise<CheckpointRecord>;
    branch(request: CheckpointBranchRequest): Promise<CheckpointBranchResult>;
    snapshot(id: CheckpointId): Promise<CheckpointSnapshot | null>;
    context(id: CheckpointId): Promise<CheckpointContext | null>;
    prune(): Promise<number>;
    private computeDigest;
    private normalizeMeta;
    private createCheckpointId;
    private createBranchId;
}
export declare function createCheckpointManager(db: Database.Database, options?: CheckpointManagerOptions): CheckpointManager;
export {};
