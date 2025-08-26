import type { Locker } from "../ports/Locker.js";

export type InMemoryLock = Locker;

export const createInMemoryLock = (): InMemoryLock => {
  const state = {
    locks: new Map<string, number>()
  };

  return {
    withLock: async <T>(key: string, ttlMs: number, f: () => Promise<T>) => {
      const until = state.locks.get(key) ?? 0;
      if (Date.now() < until) throw new Error("LOCK_HELD");
      state.locks.set(key, Date.now() + ttlMs);
      try {
        return await f();
      } finally {
        state.locks.delete(key);
      }
    }
  };
};