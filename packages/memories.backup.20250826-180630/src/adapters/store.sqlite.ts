import type { MemoryStore, TextQuery, VectorQuery } from "../ports/MemoryStore.js";
import type { Memory } from "../domain/types.js";

export class SQLiteStore implements MemoryStore {
  constructor(_path: string) {}

  async upsert(_m: Memory): Promise<Memory> { throw new Error("SQLiteStore not implemented"); }
  async get(_id: string): Promise<Memory | null> { throw new Error("SQLiteStore not implemented"); }
  async delete(_id: string): Promise<void> { throw new Error("SQLiteStore not implemented"); }
  async searchByText(_q: TextQuery): Promise<Memory[]> { throw new Error("SQLiteStore not implemented"); }
  async searchByVector(_q: VectorQuery): Promise<Memory[]> { throw new Error("SQLiteStore not implemented"); }
  async purgeExpired(_nowISO: string): Promise<number> { throw new Error("SQLiteStore not implemented"); }
}

