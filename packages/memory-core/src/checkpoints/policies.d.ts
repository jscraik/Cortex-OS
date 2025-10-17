import type Database from 'better-sqlite3';
import type { CheckpointConfig } from '../types.js';
export interface CheckpointRuntimePolicy {
    readonly config: Required<CheckpointConfig>;
    enforceBranch(requested: number): void;
    prune(db: Database.Database): Promise<number>;
}
export declare function resolveCheckpointPolicy(config?: CheckpointConfig): CheckpointRuntimePolicy;
