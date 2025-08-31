import { Redis } from 'ioredis';
import { z } from 'zod';

/**
 * Schema for serialized stream state
 */
const SerializedState = z.object({
  id: z.string(),
  status: z.enum(['initialized', 'streaming', 'completed', 'error', 'abandoned']),
  messageCount: z.number(),
  error: z.string().nullable(),
  lastActive: z.number(),
});

export type SerializedState = z.infer<typeof SerializedState>;

/**
 * Redis-backed stream store for distributed state management
 */
export interface StreamStore {
  /**
   * Get stream state by ID
   */
  get(id: string): Promise<SerializedState | undefined>;

  /**
   * Set stream state
   */
  set(id: string, state: SerializedState): Promise<void>;

  /**
   * Execute operations in a transaction
   */
  transaction<T>(fn: (tx: StreamStore) => Promise<T>): Promise<T>;

  /**
   * Acquire a distributed lock
   */
  acquireLock(name: string, options?: { timeout?: number }): Promise<Lock>;

  /**
   * Clean up abandoned streams
   */
  cleanup(config: { maxInactiveTime: number; minMessageCount?: number }): Promise<string[]>;
}

export interface Lock {
  release(): Promise<void>;
}

/**
 * Create a new stream store instance
 */
export function createStreamStore(config: { redis: Redis; prefix?: string }): StreamStore {
  const { redis, prefix = 'stream' } = config;

  return {
    async get(id) {
      const data = await redis.get(`${prefix}:${id}`);
      if (!data) return undefined;

      const parsed = SerializedState.safeParse(JSON.parse(data));
      return parsed.success ? parsed.data : undefined;
    },

    async set(id, state) {
      await redis.set(
        `${prefix}:${id}`,
        JSON.stringify(state),
        'EX',
        24 * 60 * 60, // 24 hour TTL
      );
    },

    async transaction<T>(fn: (tx: StreamStore) => Promise<T>): Promise<T> {
      const multi = redis.multi();
      const txStore = createTransactionStore(multi, prefix);
      const result = await fn(txStore);
      await multi.exec();
      return result;
    },

    async acquireLock(name: string, options?: { timeout?: number }): Promise<Lock> {
      const lockKey = `${prefix}:lock:${name}`;
      const lockId = Math.random().toString(36).slice(2);
      const timeout = options?.timeout ?? 30000;

      // Acquire lock with retry
      while (true) {
        const acquired = await redis.set(lockKey, lockId, 'PX', timeout, 'NX');
        if (acquired) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return {
        async release() {
          const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await redis.eval(script, 1, lockKey, lockId);
        },
      };
    },

    async cleanup({ maxInactiveTime, minMessageCount = 0 }) {
      const now = Date.now();
      const script = `
        local keys = redis.call("keys", ARGV[1])
        local abandoned = {}
        for i, key in ipairs(keys) do
          local data = redis.call("get", key)
          if data then
            local state = cjson.decode(data)
            if state.status == "streaming" and
               (tonumber(now) - tonumber(state.lastActive)) > tonumber(ARGV[2]) and
               tonumber(state.messageCount) < tonumber(ARGV[3]) then
              table.insert(abandoned, state.id)
              state.status = "abandoned"
              redis.call("set", key, cjson.encode(state))
            end
          end
        end
        return abandoned
      `;

      return await redis.eval(
        script,
        0,
        `${prefix}:*`,
        now.toString(),
        maxInactiveTime.toString(),
        minMessageCount.toString(),
      );
    },
  };
}

/**
 * Create a store instance that operates within a transaction
 */
function createTransactionStore(multi: Redis.Pipeline, prefix: string): StreamStore {
  return {
    async get(id) {
      const data = await multi.get(`${prefix}:${id}`);
      if (!data) return undefined;

      const parsed = SerializedState.safeParse(JSON.parse(data));
      return parsed.success ? parsed.data : undefined;
    },

    async set(id, state) {
      await multi.set(`${prefix}:${id}`, JSON.stringify(state));
    },

    async transaction() {
      throw new Error('Nested transactions not supported');
    },

    async acquireLock() {
      throw new Error('Cannot acquire locks in transaction');
    },

    async cleanup() {
      throw new Error('Cannot cleanup in transaction');
    },
  };
}
