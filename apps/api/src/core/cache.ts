export interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

export class ResponseCache<T> {
  private readonly defaultTtlMs: number;
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(ttlSeconds: number) {
    this.defaultTtlMs = ttlSeconds * 1000;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds ?? this.defaultTtlMs / 1000) * 1000;
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  clear(): void {
    this.store.clear();
  }
}
