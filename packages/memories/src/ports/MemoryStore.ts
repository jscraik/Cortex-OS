import type { Memory } from '../domain/types.js';

export interface VectorQuery {
  vector: number[];
  topK: number;
  filterTags?: string[];
  // Optional original query text to enable second-stage reranking
  queryText?: string;
}

export interface TextQuery {
  text: string;
  topK: number;
  filterTags?: string[];
}

export interface MemoryStore {
  upsert(m: Memory): Promise<Memory>;
  get(id: string): Promise<Memory | null>;
  delete(id: string): Promise<void>;
  searchByText(q: TextQuery): Promise<Memory[]>;
  searchByVector(q: VectorQuery): Promise<Memory[]>;
  purgeExpired(nowISO: string): Promise<number>;
}
