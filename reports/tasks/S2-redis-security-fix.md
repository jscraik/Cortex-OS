# Task S2: Redis Security Fix
**Priority**: CRITICAL  
**Estimated Time**: 1 day  
**Risk Level**: High - Lua Script Injection

## Problem Statement
The Redis stream store at `/packages/a2a-group/a2a/a2a-protocol/src/lib/streams/store.ts` uses `redis.eval()` with potentially user-controlled input at lines 104 and 130, creating Lua script injection vulnerabilities.

## Test-First Implementation

### Step 1: RED - Write Failing Security Tests
```typescript
// packages/a2a-group/a2a/a2a-protocol/src/lib/streams/__tests__/store.security.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamStore } from '../store';
import Redis from 'ioredis';

describe('StreamStore Security', () => {
  let mockRedis: any;
  let store: StreamStore;

  beforeEach(() => {
    mockRedis = {
      eval: vi.fn(),
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
      exists: vi.fn()
    };
    store = new StreamStore(mockRedis, 'test');
  });

  it('should reject malicious lock IDs with Lua injection', async () => {
    const maliciousLockId = 'test"; redis.call("FLUSHALL"); --';
    const streamId = 'safe-stream';
    
    await expect(store.acquireLock(streamId, maliciousLockId))
      .rejects.toThrow('Invalid lock ID format');
    
    // Ensure eval was never called with malicious input
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });

  it('should reject malicious stream IDs', async () => {
    const lockId = 'safe-lock';
    const maliciousStreamId = 'stream\"; redis.call(\"EVAL\", \"return redis.call(\\\"FLUSHALL\\\")\", 0); --';
    
    await expect(store.acquireLock(maliciousStreamId, lockId))
      .rejects.toThrow('Invalid stream ID format');
    
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });

  it('should prevent command injection in cleanup operations', async () => {
    const maliciousPattern = 'pattern"; redis.call("FLUSHALL"); --';
    
    await expect(store.cleanup({ 
      maxInactiveTime: 5000, 
      minMessageCount: 0,
      pattern: maliciousPattern 
    })).rejects.toThrow('Invalid cleanup pattern');
    
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });

  it('should use parameterized queries instead of eval', async () => {
    const streamId = 'valid-stream-123';
    const lockId = 'valid-lock-456';
    
    mockRedis.set.mockResolvedValue('OK');
    
    await store.acquireLock(streamId, lockId);
    
    // Should use Redis SET command with parameters, not eval
    expect(mockRedis.set).toHaveBeenCalledWith(
      `test:lock:${streamId}`,
      lockId,
      'PX',
      expect.any(Number),
      'NX'
    );
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });

  it('should validate input lengths to prevent DoS', async () => {
    const longStreamId = 'a'.repeat(1000);
    const lockId = 'valid-lock';
    
    await expect(store.acquireLock(longStreamId, lockId))
      .rejects.toThrow('Stream ID too long: maximum 128 characters');
  });

  it('should only allow alphanumeric characters and hyphens', async () => {
    const invalidChars = ['<script>', '${injection}', '../../../etc/passwd'];
    
    for (const invalidId of invalidChars) {
      await expect(store.acquireLock(invalidId, 'valid-lock'))
        .rejects.toThrow('Invalid stream ID format');
    }
  });
});
```

### Step 2: GREEN - Implement Security Fixes
```typescript
// packages/a2a-group/a2a/a2a-protocol/src/lib/streams/store.ts
import { z } from 'zod';
import type Redis from 'ioredis';

// Input validation schemas
const StreamIdSchema = z.string()
  .min(1, 'Stream ID cannot be empty')
  .max(128, 'Stream ID too long: maximum 128 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid stream ID format: only alphanumeric, underscore, and hyphen allowed');

const LockIdSchema = z.string()
  .min(1, 'Lock ID cannot be empty')
  .max(64, 'Lock ID too long: maximum 64 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid lock ID format: only alphanumeric, underscore, and hyphen allowed');

const PatternSchema = z.string()
  .max(256, 'Pattern too long')
  .regex(/^[a-zA-Z0-9_*:-]+$/, 'Invalid pattern format');

interface SecureStreamState {
  id: string;
  status: 'idle' | 'streaming' | 'complete' | 'abandoned';
  lastActive: number;
  messageCount: number;
  metadata?: Record<string, string>; // Only string values for security
}

interface SecureLock {
  streamId: string;
  lockId: string;
  acquired: boolean;
  expiresAt: number;
}

interface CleanupOptions {
  maxInactiveTime: number;
  minMessageCount?: number;
  pattern?: string;
}

export class SecureStreamStore {
  private readonly redis: Redis;
  private readonly prefix: string;
  private readonly lockTimeout: number;

  constructor(redis: Redis, prefix = 'streams', lockTimeoutMs = 30000) {
    this.redis = redis;
    this.prefix = prefix;
    this.lockTimeout = lockTimeoutMs;
  }

  /**
   * Acquire lock using native Redis commands instead of eval()
   */
  async acquireLock(streamId: string, lockId: string): Promise<SecureLock | null> {
    // CRITICAL: Validate inputs first
    StreamIdSchema.parse(streamId);
    LockIdSchema.parse(lockId);

    const lockKey = `${this.prefix}:lock:${streamId}`;
    const expiresAt = Date.now() + this.lockTimeout;

    // Use native Redis SET command with NX (not exists) and PX (expire)
    const result = await this.redis.set(
      lockKey,
      JSON.stringify({ lockId, expiresAt }),
      'PX',
      this.lockTimeout,
      'NX'
    );

    if (result === 'OK') {
      return {
        streamId,
        lockId,
        acquired: true,
        expiresAt
      };
    }

    return null; // Lock not acquired
  }

  /**
   * Release lock using native Redis DEL command
   */
  async releaseLock(streamId: string, lockId: string): Promise<boolean> {
    StreamIdSchema.parse(streamId);
    LockIdSchema.parse(lockId);

    const lockKey = `${this.prefix}:lock:${streamId}`;
    
    // Get current lock data to verify ownership
    const currentLock = await this.redis.get(lockKey);
    if (!currentLock) {
      return false; // Lock doesn't exist
    }

    try {
      const lockData = JSON.parse(currentLock);
      if (lockData.lockId === lockId) {
        const deleted = await this.redis.del(lockKey);
        return deleted > 0;
      }
    } catch (error) {
      // Invalid lock data format, delete it
      await this.redis.del(lockKey);
      return false;
    }

    return false; // Not the lock owner
  }

  /**
   * Get stream state using native Redis GET
   */
  async getStream(streamId: string): Promise<SecureStreamState | null> {
    StreamIdSchema.parse(streamId);

    const streamKey = `${this.prefix}:stream:${streamId}`;
    const data = await this.redis.get(streamKey);

    if (!data) {
      return null;
    }

    try {
      const state = JSON.parse(data);
      
      // Validate state structure
      if (!state.id || !state.status || typeof state.lastActive !== 'number') {
        return null;
      }

      return {
        id: state.id,
        status: state.status,
        lastActive: state.lastActive,
        messageCount: state.messageCount || 0,
        metadata: this.sanitizeMetadata(state.metadata)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update stream state using native Redis SET
   */
  async updateStream(streamId: string, state: Partial<SecureStreamState>): Promise<void> {
    StreamIdSchema.parse(streamId);

    const streamKey = `${this.prefix}:stream:${streamId}`;
    const current = await this.getStream(streamId);

    const updatedState: SecureStreamState = {
      id: streamId,
      status: state.status || current?.status || 'idle',
      lastActive: state.lastActive || Date.now(),
      messageCount: state.messageCount || current?.messageCount || 0,
      metadata: this.sanitizeMetadata(state.metadata || current?.metadata)
    };

    await this.redis.set(streamKey, JSON.stringify(updatedState));
  }

  /**
   * Cleanup abandoned streams using native Redis commands
   */
  async cleanup(options: CleanupOptions): Promise<string[]> {
    const { maxInactiveTime, minMessageCount = 0, pattern } = options;
    
    if (pattern) {
      PatternSchema.parse(pattern);
    }

    const now = Date.now();
    const searchPattern = pattern ? `${this.prefix}:stream:${pattern}` : `${this.prefix}:stream:*`;
    
    // Use SCAN instead of KEYS for better performance and security
    const abandonedStreams: string[] = [];
    const stream = this.redis.scanStream({
      match: searchPattern,
      count: 100
    });

    for await (const keys of stream) {
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (!data) continue;

        try {
          const state = JSON.parse(data);
          const timeSinceActive = now - (state.lastActive || 0);
          
          if (state.status === 'streaming' && 
              timeSinceActive > maxInactiveTime &&
              (state.messageCount || 0) < minMessageCount) {
            
            // Mark as abandoned
            state.status = 'abandoned';
            await this.redis.set(key, JSON.stringify(state));
            
            const streamId = key.replace(`${this.prefix}:stream:`, '');
            abandonedStreams.push(streamId);
          }
        } catch (error) {
          // Invalid JSON, skip this key
          continue;
        }
      }
    }

    return abandonedStreams;
  }

  /**
   * Sanitize metadata to prevent injection
   */
  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, string> | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof key === 'string' && key.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(key)) {
        const stringValue = String(value).slice(0, 1000); // Limit length
        sanitized[key] = stringValue;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  /**
   * Health check using native Redis PING
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();
    
    try {
      await this.redis.ping();
      return {
        healthy: true,
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start
      };
    }
  }
}

// Factory function for backward compatibility
export function createStreamStore(redis: Redis, prefix?: string): SecureStreamStore {
  return new SecureStreamStore(redis, prefix);
}
```

### Step 3: REFACTOR - Add Connection Pool Management
```typescript
// Add Redis connection pool management for better performance
export class PooledSecureStreamStore extends SecureStreamStore {
  private readonly pool: Redis[];
  private roundRobinIndex = 0;

  constructor(redisInstances: Redis[], prefix?: string, lockTimeoutMs?: number) {
    super(redisInstances[0], prefix, lockTimeoutMs);
    this.pool = redisInstances;
  }

  private getRedisInstance(): Redis {
    const instance = this.pool[this.roundRobinIndex];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % this.pool.length;
    return instance;
  }

  async acquireLock(streamId: string, lockId: string): Promise<SecureLock | null> {
    const redis = this.getRedisInstance();
    // Use selected instance for this operation
    return super.acquireLock.call({ ...this, redis }, streamId, lockId);
  }
}
```

## Acceptance Criteria
- [ ] All Lua script injection tests pass
- [ ] Redis eval() calls completely removed
- [ ] Input validation prevents all malicious patterns
- [ ] Performance impact < 5% (native commands are faster)
- [ ] Backward compatibility maintained for legitimate operations
- [ ] Security scan shows zero Redis-related vulnerabilities

## Rollback Strategy
1. **Feature Flag**: Set `USE_LEGACY_REDIS_STORE=true` in environment
2. **Gradual Migration**: Route percentage of traffic to new implementation
3. **Monitoring**: Alert on Redis error rate increase > 1%
4. **Fallback Logic**: Automatic fallback on Redis connection issues

## Validation Commands
```bash
# Run Redis security tests
npm test -- store.security.test.ts

# Run integration tests
npm test -- redis-integration.test.ts

# Performance benchmark
npm run test:performance -- redis-store

# Security scan
npm run security:scan:comprehensive
```

## Files Modified
- `/packages/a2a-group/a2a/a2a-protocol/src/lib/streams/store.ts` - Main implementation
- `/packages/a2a-group/a2a/a2a-protocol/src/lib/streams/__tests__/store.security.test.ts` - Security tests
- `/packages/a2a-group/a2a/a2a-protocol/src/lib/streams/__tests__/store.test.ts` - Updated existing tests
