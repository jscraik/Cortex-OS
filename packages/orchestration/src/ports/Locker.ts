export interface Locker {
  withLock<T>(key: string, ttlMs: number, f: () => Promise<T>): Promise<T>;
}
