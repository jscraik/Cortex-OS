export type MemoryId = string;

export interface Memory {
  id: MemoryId;
  kind: 'note' | 'event' | 'artifact' | 'embedding';
  text?: string;
  vector?: number[];
  tags: string[];
  ttl?: string;
  createdAt: string;
  updatedAt: string;
  provenance: {
    source: 'user' | 'agent' | 'system';
    actor?: string;
    evidence?: { uri: string; range?: [number, number] }[];
    hash?: string;
  };
  acl: { agent: string; tenant: string; purposes: string[] };
  policy?: { pii?: boolean; scope?: 'session' | 'user' | 'org' };
  embeddingModel?: string;
}

export interface CacheManager {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
}
