import type { Locker } from "../ports/Locker.js";

export class InMemoryLock implements Locker {
  private locks = new Map<string, number>();
  async withLock<T>(key: string, ttlMs: number, f: () => Promise<T>) {
    const until = this.locks.get(key) ?? 0;
    if (Date.now() < until) throw new Error("LOCK_HELD");
    this.locks.set(key, Date.now() + ttlMs);
    try {
      return await f();
    } finally {
      this.locks.delete(key);
    }
  }
}

