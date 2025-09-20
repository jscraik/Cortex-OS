import type { Memory } from '../domain/types.js';
import type { TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface StoreContext {
  namespace?: string;
  timestamp: number;
}

export interface QueryContext {
  namespace?: string;
  timestamp: number;
}

export interface PurgeCriteria {
  namespace?: string;
  timestamp: string;
}

export interface MemoryPlugin {
  name: string;
  version: string;
  // Storage hooks
  onBeforeStore?(memory: Memory, context: StoreContext): Promise<Memory>;
  onAfterStore?(memory: Memory, context: StoreContext): Promise<void>;
  // Query hooks
  onBeforeRetrieve?(query: TextQuery | VectorQuery, context: QueryContext): Promise<void>;
  onAfterRetrieve?(results: Memory[], context: QueryContext): Promise<Memory[]>;
  // Purge hooks
  onBeforePurge?(criteria: PurgeCriteria): Promise<boolean>;
  onAfterPurge?(count: number, criteria: PurgeCriteria): Promise<void>;
}