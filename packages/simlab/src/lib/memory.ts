export type MemoryStore = {
  set(key: string, value: unknown): void;
  get(key: string): unknown | undefined;
};

export function createInMemoryStore(opts: { maxItems: number; maxBytes: number }): MemoryStore {
  const store = new Map<string, unknown>();
  return {
    set(key, value) {
      if (store.has(key)) {
        store.delete(key); // Remove to re-insert and update order
      } else if (store.size >= opts.maxItems) {
        // Evict least recently used (first inserted) item
        const oldestKey = store.keys().next().value;
        store.delete(oldestKey);
      }
      store.set(key, value);
    },
    get(key) {
      if (!store.has(key)) return undefined;
      const value = store.get(key);
      // Update usage order: remove and re-insert
      store.delete(key);
      store.set(key, value);
      return value;
    }
  };
}
