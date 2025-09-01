import { IdempotencyStore } from '../idempotency.js';

export const createMemoryIdempotencyStore = (): IdempotencyStore => {
  const store = new Map<string, number>();

  const seen = async (id: string): Promise<boolean> => {
    const expiry = store.get(id);
    return typeof expiry === 'number' && expiry > Date.now();
  };

  const remember = async (id: string, ttlSec: number): Promise<void> => {
    store.set(id, Date.now() + ttlSec * 1000);
  };

  return { seen, remember };
};
