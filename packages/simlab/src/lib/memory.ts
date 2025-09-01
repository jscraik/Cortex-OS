export type MemoryStore = {
  set(key: string, value: unknown): void;
  get(key: string): unknown | undefined;
};

export function createInMemoryStore(opts: { maxItems: number; maxBytes: number }): MemoryStore {
  const store = new Map<string, unknown>();
  return {
    set(key, value) {
      if (store.size >= opts.maxItems) return;
      store.set(key, value);
    },
    get: key => store.get(key)
  };
}
