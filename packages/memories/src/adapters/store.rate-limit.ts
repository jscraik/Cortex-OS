import type { Memory, MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface RateLimitConfig {
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket';
  limit?: number;
  windowSize?: number;
  limits?: Record<string, { limit: number; windowSize: number }>;
  quotas?: Record<string, { limit: number; windowSize: number }>;
  enableClientTracking?: boolean;
  persistUsage?: boolean;
  enableBackoff?: boolean;
  backoffMultiplier?: number;
  maxBackoffTime?: number;
  burstLimit?: number;
  refillRate?: number;
  leakRate?: number;
}

export interface UsageStats {
  currentWindow: {
    used: number;
    limit: number;
    resetTime: Date;
  };
  quotas: Record<string, {
    used: number;
    limit: number;
    resetTime: Date;
  }>;
  operations: Record<string, number>;
  violations: number;
  backoffTime: number;
}

export interface ClientUsage {
  clientId: string;
  used: number;
  lastUsed: Date;
  violations: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitContext {
  clientId?: string;
  apiKey?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class RateLimitedMemoryStore implements MemoryStore {
  private usageData = new Map<string, {
    windowStart: number;
    count: number;
    tokens?: number;
    lastRefill?: number;
    queue?: number[];
  }>();

  private clientUsage = new Map<string, ClientUsage>();
  private quotaUsage = new Map<string, number>();
  private operationCounts = new Map<string, number>();
  private violationCounts = new Map<string, number>();
  private backoffTimes = new Map<string, number>();
  private whitelist = new Set<string>();
  private blacklist = new Set<string>();

  private config: Required<RateLimitConfig>;
  private namespace: string;

  constructor(
    private readonly store: MemoryStore,
    config: RateLimitConfig,
    namespace = 'default'
  ) {
    this.namespace = namespace;

    this.config = {
      strategy: config.strategy,
      limit: config.limit || 100,
      windowSize: config.windowSize || 60000,
      limits: config.limits || {},
      quotas: config.quotas || {},
      enableClientTracking: config.enableClientTracking || false,
      persistUsage: config.persistUsage || false,
      enableBackoff: config.enableBackoff || false,
      backoffMultiplier: config.backoffMultiplier || 2,
      maxBackoffTime: config.maxBackoffTime || 300000,
      burstLimit: config.burstLimit || config.limit || 100,
      refillRate: config.refillRate || 1,
      leakRate: config.leakRate || 1
    };
  }

  async upsert(memory: Memory, namespace = 'default', context?: RateLimitContext): Promise<Memory> {
    await this.checkRateLimit('upsert', namespace, context);

    const result = await this.store.upsert(memory, namespace);
    await this.recordUsage('upsert', namespace, context);

    return result;
  }

  async get(id: string, namespace = 'default', context?: RateLimitContext): Promise<Memory | null> {
    await this.checkRateLimit('get', namespace, context);

    const result = await this.store.get(id, namespace);
    await this.recordUsage('get', namespace, context);

    return result;
  }

  async delete(id: string, namespace = 'default', context?: RateLimitContext): Promise<void> {
    await this.checkRateLimit('delete', namespace, context);

    await this.store.delete(id, namespace);
    await this.recordUsage('delete', namespace, context);
  }

  async searchByText(q: TextQuery, namespace = 'default', context?: RateLimitContext): Promise<Memory[]> {
    await this.checkRateLimit('search', namespace, context);

    const result = await this.store.searchByText(q, namespace);
    await this.recordUsage('search', namespace, context);

    return result;
  }

  async searchByVector(q: VectorQuery, namespace = 'default', context?: RateLimitContext): Promise<(Memory & { score: number })[]> {
    await this.checkRateLimit('search', namespace, context);

    const result = await this.store.searchByVector(q, namespace);
    await this.recordUsage('search', namespace, context);

    return result;
  }

  async purgeExpired(nowISO: string, namespace?: string, context?: RateLimitContext): Promise<number> {
    await this.checkRateLimit('purge', namespace || 'default', context);

    const result = await this.store.purgeExpired(nowISO, namespace);
    await this.recordUsage('purge', namespace || 'default', context);

    return result;
  }

  async list(namespace = 'default', limit?: number, offset?: number, context?: RateLimitContext): Promise<Memory[]> {
    await this.checkRateLimit('list', namespace, context);

    const result = await this.store.list(namespace, limit, offset);
    await this.recordUsage('list', namespace, context);

    return result;
  }

  private async checkRateLimit(operation: string, namespace: string, context?: RateLimitContext): Promise<void> {
    // Check blacklist
    if (context?.clientId && this.blacklist.has(context.clientId)) {
      throw new Error('Client blacklisted');
    }

    // Check whitelist
    if (context?.clientId && this.whitelist.has(context.clientId)) {
      return;
    }

    // Check backoff
    const backoffKey = this.getBackoffKey(namespace, context);
    if (this.config.enableBackoff) {
      const backoffTime = this.backoffTimes.get(backoffKey) || 0;
      if (backoffTime > 0 && Date.now() < backoffTime) {
        throw new Error(`Rate limit exceeded. Retry after ${Math.ceil((backoffTime - Date.now()) / 1000)} seconds`);
      }
    }

    // Check per-operation limits
    const operationConfig = this.config.limits[operation];
    const limit = operationConfig?.limit || this.config.limit;
    const windowSize = operationConfig?.windowSize || this.config.windowSize;

    const key = this.getLimitKey(operation, namespace, context);
    const now = Date.now();

    switch (this.config.strategy) {
      case 'fixed-window':
        await this.checkFixedWindow(key, limit, windowSize, now);
        break;
      case 'sliding-window':
        await this.checkSlidingWindow(key, limit, windowSize, now);
        break;
      case 'token-bucket':
        await this.checkTokenBucket(key, limit, now);
        break;
      case 'leaky-bucket':
        await this.checkLeakyBucket(key, limit, now);
        break;
    }

    // Check quotas
    await this.checkQuotas(operation, namespace, now);
  }

  private async checkFixedWindow(key: string, limit: number, windowSize: number, now: number): Promise<void> {
    let data = this.usageData.get(key);

    if (!data || now - data.windowStart > windowSize) {
      data = {
        windowStart: now,
        count: 0
      };
      this.usageData.set(key, data);
    }

    if (data.count >= limit) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async checkSlidingWindow(key: string, limit: number, windowSize: number, now: number): Promise<void> {
    let data = this.usageData.get(key);

    if (!data) {
      data = {
        windowStart: now,
        count: 0,
        queue: []
      };
      this.usageData.set(key, data);
    }

    // Remove old requests from sliding window
    const windowStart = now - windowSize;
    data.queue = data.queue!.filter(timestamp => timestamp > windowStart);

    if (data.queue!.length >= limit) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async checkTokenBucket(key: string, limit: number, now: number): Promise<void> {
    let data = this.usageData.get(key);

    if (!data) {
      data = {
        windowStart: now,
        count: 0,
        tokens: limit,
        lastRefill: now
      };
      this.usageData.set(key, data);
    }

    // Refill tokens
    const timeSinceRefill = now - (data.lastRefill || now);
    const tokensToAdd = Math.floor(timeSinceRefill / 1000) * this.config.refillRate;
    data.tokens = Math.min(limit, (data.tokens || 0) + tokensToAdd);
    data.lastRefill = now;

    if ((data.tokens || 0) <= 0) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async checkLeakyBucket(key: string, limit: number, now: number): Promise<void> {
    let data = this.usageData.get(key);

    if (!data) {
      data = {
        windowStart: now,
        count: 0,
        queue: []
      };
      this.usageData.set(key, data);
    }

    // Leak requests
    const timeSinceStart = now - data.windowStart;
    const leaked = Math.floor(timeSinceStart / 1000) * this.config.leakRate;
    data.queue = data.queue!.slice(leaked);

    if (data.queue!.length >= limit) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async checkQuotas(operation: string, namespace: string, now: number): Promise<void> {
    for (const [quotaName, quotaConfig] of Object.entries(this.config.quotas)) {
      const quotaKey = `quota:${quotaName}:${namespace}`;
      let used = this.quotaUsage.get(quotaKey) || 0;

      // Reset quota if window has expired
      const quotaWindowStart = this.usageData.get(quotaKey)?.windowStart || now;
      if (now - quotaWindowStart > quotaConfig.windowSize) {
        used = 0;
        this.usageData.set(quotaKey, { windowStart: now, count: 0 });
        this.quotaUsage.set(quotaKey, 0);
      }

      if (used >= quotaConfig.limit) {
        throw new Error(`${quotaName} quota exceeded`);
      }
    }
  }

  private async recordUsage(operation: string, namespace: string, context?: RateLimitContext): Promise<void> {
    const now = Date.now();
    const key = this.getLimitKey(operation, namespace, context);
    const data = this.usageData.get(key);

    if (data) {
      data.count++;

      // For sliding window, add timestamp to queue
      if (this.config.strategy === 'sliding-window' && data.queue) {
        data.queue.push(now);
      }

      // For token bucket, consume token
      if (this.config.strategy === 'token-bucket' && data.tokens !== undefined) {
        data.tokens--;
      }

      // For leaky bucket, add to queue
      if (this.config.strategy === 'leaky-bucket' && data.queue) {
        data.queue.push(now);
      }
    }

    // Update operation counts
    this.operationCounts.set(operation, (this.operationCounts.get(operation) || 0) + 1);

    // Update client usage
    if (this.config.enableClientTracking && context?.clientId) {
      const clientKey = `${context.clientId}:${namespace}`;
      const existing = this.clientUsage.get(clientKey);
      this.clientUsage.set(clientKey, {
        clientId: context.clientId,
        used: (existing?.used || 0) + 1,
        lastUsed: new Date(now),
        violations: existing?.violations || 0
      });
    }

    // Update quota usage
    for (const quotaName of Object.keys(this.config.quotas)) {
      const quotaKey = `quota:${quotaName}:${namespace}`;
      this.quotaUsage.set(quotaKey, (this.quotaUsage.get(quotaKey) || 0) + 1);
    }
  }

  private recordViolation(key: string, now: number): void {
    const current = this.violationCounts.get(key) || 0;
    this.violationCounts.set(key, current + 1);

    // Apply backoff if enabled
    if (this.config.enableBackoff) {
      const violations = current + 1;
      const backoffTime = Math.min(
        this.config.maxBackoffTime,
        Math.pow(2, violations) * 1000
      );
      this.backoffTimes.set(key, now + backoffTime);
    }
  }

  private getLimitKey(operation: string, namespace: string, context?: RateLimitContext): string {
    const parts = [operation, namespace];
    if (this.config.enableClientTracking && context?.clientId) {
      parts.push(context.clientId);
    }
    return parts.join(':');
  }

  private getBackoffKey(namespace: string, context?: RateLimitContext): string {
    const parts = [namespace];
    if (this.config.enableClientTracking && context?.clientId) {
      parts.push(context.clientId);
    }
    return parts.join(':');
  }

  // Public API methods
  async getUsageStats(namespace: string): Promise<UsageStats> {
    const now = Date.now();
    const stats: UsageStats = {
      currentWindow: {
        used: 0,
        limit: this.config.limit,
        resetTime: new Date(now + this.config.windowSize)
      },
      quotas: {},
      operations: {},
      violations: 0,
      backoffTime: 0
    };

    // Get current window usage
    for (const [key, data] of this.usageData) {
      if (key.includes(namespace) && !key.startsWith('quota:')) {
        stats.currentWindow.used += data.count;
      }
    }

    // Get quota usage
    for (const [quotaName, quotaConfig] of Object.entries(this.config.quotas)) {
      const quotaKey = `quota:${quotaName}:${namespace}`;
      const used = this.quotaUsage.get(quotaKey) || 0;
      stats.quotas[quotaName] = {
        used,
        limit: quotaConfig.limit,
        resetTime: new Date((this.usageData.get(quotaKey)?.windowStart || now) + quotaConfig.windowSize)
      };
    }

    // Get operation counts
    for (const [operation, count] of this.operationCounts) {
      stats.operations[operation] = count;
    }

    // Get violations
    for (const [key, violations] of this.violationCounts) {
      if (key.includes(namespace)) {
        stats.violations += violations;
      }
    }

    // Get backoff time
    for (const [key, backoffTime] of this.backoffTimes) {
      if (key.includes(namespace) && backoffTime > now) {
        stats.backoffTime = backoffTime - now;
      }
    }

    return stats;
  }

  async getClientUsage(clientId: string, namespace: string): Promise<ClientUsage> {
    const clientKey = `${clientId}:${namespace}`;
    return this.clientUsage.get(clientKey) || {
      clientId,
      used: 0,
      lastUsed: new Date(),
      violations: 0
    };
  }

  async getRateLimitInfo(operation: string, namespace: string, context?: RateLimitContext): Promise<RateLimitInfo> {
    const key = this.getLimitKey(operation, namespace, context);
    const data = this.usageData.get(key);
    const now = Date.now();

    const operationConfig = this.config.limits[operation];
    const limit = operationConfig?.limit || this.config.limit;
    const windowSize = operationConfig?.windowSize || this.config.windowSize;

    let remaining = limit;
    let resetTime = new Date(now + windowSize);

    if (data) {
      if (this.config.strategy === 'fixed-window' && now - data.windowStart <= windowSize) {
        remaining = Math.max(0, limit - data.count);
        resetTime = new Date(data.windowStart + windowSize);
      } else if (this.config.strategy === 'token-bucket' && data.tokens !== undefined) {
        remaining = data.tokens;
      } else if (this.config.strategy === 'leaky-bucket' && data.queue) {
        remaining = Math.max(0, limit - data.queue.length);
      }
    }

    // Check backoff
    const backoffKey = this.getBackoffKey(namespace, context);
    const backoffTime = this.backoffTimes.get(backoffKey) || 0;
    const retryAfter = backoffTime > now ? Math.ceil((backoffTime - now) / 1000) : undefined;

    return {
      limit,
      remaining,
      resetTime,
      retryAfter
    };
  }

  async updateLimit(operation: string, newLimit: number): Promise<void> {
    if (this.config.limits[operation]) {
      this.config.limits[operation].limit = newLimit;
    } else {
      this.config.limit = newLimit;
    }
  }

  async addToWhitelist(clientId: string): Promise<void> {
    this.whitelist.add(clientId);
  }

  async addToBlacklist(clientId: string): Promise<void> {
    this.blacklist.add(clientId);
  }

  async removeFromWhitelist(clientId: string): Promise<void> {
    this.whitelist.delete(clientId);
  }

  async removeFromBlacklist(clientId: string): Promise<void> {
    this.blacklist.delete(clientId);
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now();

    // Clean up usage data
    for (const [key, data] of this.usageData) {
      if (now - data.windowStart > this.config.windowSize * 2) {
        this.usageData.delete(key);
      }
    }

    // Clean up backoff times
    for (const [key, backoffTime] of this.backoffTimes) {
      if (backoffTime <= now) {
        this.backoffTimes.delete(key);
      }
    }

    // Clean up client usage
    for (const [key, usage] of this.clientUsage) {
      if (now - usage.lastUsed.getTime() > this.config.windowSize * 2) {
        this.clientUsage.delete(key);
      }
    }
  }

  async saveUsageData(): Promise<string> {
    const data = {
      usageData: Array.from(this.usageData.entries()),
      clientUsage: Array.from(this.clientUsage.entries()),
      quotaUsage: Array.from(this.quotaUsage.entries()),
      operationCounts: Array.from(this.operationCounts.entries()),
      violationCounts: Array.from(this.violationCounts.entries()),
      backoffTimes: Array.from(this.backoffTimes.entries()),
      whitelist: Array.from(this.whitelist),
      blacklist: Array.from(this.blacklist)
    };

    return JSON.stringify(data);
  }

  async loadUsageData(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);

      this.usageData = new Map(parsed.usageData || []);
      this.clientUsage = new Map(parsed.clientUsage || []);
      this.quotaUsage = new Map(parsed.quotaUsage || []);
      this.operationCounts = new Map(parsed.operationCounts || []);
      this.violationCounts = new Map(parsed.violationCounts || []);
      this.backoffTimes = new Map(parsed.backoffTimes || []);
      this.whitelist = new Set(parsed.whitelist || []);
      this.blacklist = new Set(parsed.blacklist || []);
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
  }
}