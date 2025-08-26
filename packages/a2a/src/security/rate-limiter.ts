/**
 * @file Agent Rate Limiter - OWASP LLM04 DoS Protection
 * @description Advanced rate limiting with sliding windows, burst protection, and resource tracking
 * following OWASP LLM Top 10 security guidelines
 */

import { EventEmitter } from 'events';

export interface RateLimit {
  agentId: string;
  capability: string;
  requests: number;
  windowStart: number;
  burstTokens: number;
  lastRefill: number;
  totalRequests: number;
  blockedRequests: number;
}

export interface RateLimitConfig {
  windowSizeMs: number;
  maxRequestsPerWindow: number;
  burstSize: number;
  refillRate: number; // tokens per second
  enableBurstProtection: boolean;
  enableResourceTracking: boolean;
  blockDurationMs: number;
  cleanupIntervalMs: number;
}

export interface ResourceUsage {
  cpuTime: number;
  memoryUsage: number;
  networkBandwidth: number;
  diskIO: number;
  timestamp: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  retryAfter?: number;
  reason?: string;
  resourceUsage?: ResourceUsage;
}

/**
 * Advanced rate limiter with sliding windows and resource tracking for DoS protection
 */
export class AgentRateLimiter extends EventEmitter {
  private readonly limits = new Map<string, RateLimit>();
  private readonly blockedAgents = new Map<string, number>(); // agentId -> unblock timestamp
  private readonly resourceUsage = new Map<string, ResourceUsage[]>();
  private readonly config: RateLimitConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<RateLimitConfig> = {}) {
    super();
    
    this.config = {
      windowSizeMs: 60000, // 1 minute
      maxRequestsPerWindow: 100,
      burstSize: 20,
      refillRate: 2, // 2 tokens per second
      enableBurstProtection: true,
      enableResourceTracking: true,
      blockDurationMs: 300000, // 5 minutes
      cleanupIntervalMs: 60000, // 1 minute
      ...config
    };

    this.startCleanupScheduler();
  }

  /**
   * Check if a request is allowed under rate limiting rules
   */
  async checkLimit(agentId: string, capability: string = 'default'): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `${agentId}:${capability}`;

    // Check if agent is currently blocked
    if (this.isAgentBlocked(agentId, now)) {
      const unblockTime = this.blockedAgents.get(agentId) || 0;
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: unblockTime,
        retryAfter: unblockTime - now,
        reason: 'Agent temporarily blocked due to rate limit violations'
      };
    }

    // Get or create rate limit entry
    let limit = this.limits.get(key);
    if (!limit) {
      limit = {
        agentId,
        capability,
        requests: 0,
        windowStart: now,
        burstTokens: this.config.burstSize,
        lastRefill: now,
        totalRequests: 0,
        blockedRequests: 0
      };
      this.limits.set(key, limit);
    }

    // Refill burst tokens if enabled
    if (this.config.enableBurstProtection) {
      this.refillBurstTokens(limit, now);
    }

    // Check sliding window
    const windowResult = this.checkSlidingWindow(limit, now);
    if (!windowResult.allowed) {
      limit.blockedRequests++;
      this.emit('rate_limit_exceeded', { agentId, capability, reason: 'sliding_window' });
      
      // Block agent if too many violations
      if (limit.blockedRequests > 10) {
        this.blockAgent(agentId, now);
      }
      
      return windowResult;
    }

    // Check burst protection if enabled
    if (this.config.enableBurstProtection) {
      const burstResult = this.checkBurstLimit(limit);
      if (!burstResult.allowed) {
        limit.blockedRequests++;
        this.emit('rate_limit_exceeded', { agentId, capability, reason: 'burst_protection' });
        return burstResult;
      }
    }

    // Check resource usage if enabled
    if (this.config.enableResourceTracking) {
      const resourceResult = await this.checkResourceLimit(agentId, now);
      if (!resourceResult.allowed) {
        limit.blockedRequests++;
        this.emit('resource_limit_exceeded', { agentId, capability, resourceUsage: resourceResult.resourceUsage });
        return resourceResult;
      }
    }

    // Request is allowed - update counters
    limit.requests++;
    limit.totalRequests++;
    if (this.config.enableBurstProtection) {
      limit.burstTokens--;
    }

    const remainingRequests = Math.max(0, this.config.maxRequestsPerWindow - limit.requests);
    const resetTime = limit.windowStart + this.config.windowSizeMs;

    return {
      allowed: true,
      remainingRequests,
      resetTime,
      resourceUsage: this.config.enableResourceTracking 
        ? this.getCurrentResourceUsage(agentId) 
        : undefined
    };
  }

  /**
   * Check sliding window rate limit
   */
  private checkSlidingWindow(limit: RateLimit, now: number): RateLimitResult {
    // Reset window if expired
    if (now - limit.windowStart >= this.config.windowSizeMs) {
      limit.requests = 0;
      limit.windowStart = now;
    }

    const remainingRequests = Math.max(0, this.config.maxRequestsPerWindow - limit.requests);
    const resetTime = limit.windowStart + this.config.windowSizeMs;

    if (limit.requests >= this.config.maxRequestsPerWindow) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime,
        retryAfter: resetTime - now,
        reason: 'Rate limit exceeded for sliding window'
      };
    }

    return {
      allowed: true,
      remainingRequests,
      resetTime
    };
  }

  /**
   * Check burst protection using token bucket algorithm
   */
  private checkBurstLimit(limit: RateLimit): RateLimitResult {
    if (limit.burstTokens <= 0) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: Date.now() + (1000 / this.config.refillRate), // Next token availability
        retryAfter: 1000 / this.config.refillRate,
        reason: 'Burst limit exceeded - too many rapid requests'
      };
    }

    return {
      allowed: true,
      remainingRequests: limit.burstTokens,
      resetTime: 0
    };
  }

  /**
   * Refill burst tokens based on configured refill rate
   */
  private refillBurstTokens(limit: RateLimit, now: number): void {
    const timeSinceLastRefill = now - limit.lastRefill;
    const tokensToAdd = Math.floor((timeSinceLastRefill / 1000) * this.config.refillRate);

    if (tokensToAdd > 0) {
      limit.burstTokens = Math.min(this.config.burstSize, limit.burstTokens + tokensToAdd);
      limit.lastRefill = now;
    }
  }

  /**
   * Check resource usage limits (CPU, memory, network)
   */
  private async checkResourceLimit(agentId: string, now: number): Promise<RateLimitResult> {
    const currentUsage = this.getCurrentResourceUsage(agentId);
    const usageHistory = this.resourceUsage.get(agentId) || [];

    // Store current usage
    usageHistory.push(currentUsage);
    
    // Keep only last 10 minutes of data
    const tenMinutesAgo = now - 600000;
    const recentUsage = usageHistory.filter(usage => usage.timestamp > tenMinutesAgo);
    this.resourceUsage.set(agentId, recentUsage);

    // Calculate average resource usage
    const avgCpuTime = recentUsage.reduce((sum, usage) => sum + usage.cpuTime, 0) / recentUsage.length;
    const avgMemory = recentUsage.reduce((sum, usage) => sum + usage.memoryUsage, 0) / recentUsage.length;
    const avgNetwork = recentUsage.reduce((sum, usage) => sum + usage.networkBandwidth, 0) / recentUsage.length;

    // Define resource limits (these should be configurable)
    const limits = {
      maxCpuTime: 1000, // ms per request
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      maxNetworkBandwidth: 10 * 1024 * 1024 // 10MB/s
    };

    // Check if any resource limit is exceeded
    if (avgCpuTime > limits.maxCpuTime) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: now + 60000,
        retryAfter: 60000,
        reason: 'CPU usage limit exceeded',
        resourceUsage: currentUsage
      };
    }

    if (avgMemory > limits.maxMemoryUsage) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: now + 60000,
        retryAfter: 60000,
        reason: 'Memory usage limit exceeded',
        resourceUsage: currentUsage
      };
    }

    if (avgNetwork > limits.maxNetworkBandwidth) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: now + 60000,
        retryAfter: 60000,
        reason: 'Network bandwidth limit exceeded',
        resourceUsage: currentUsage
      };
    }

    return {
      allowed: true,
      remainingRequests: 1000, // Arbitrary high number for resource checks
      resetTime: 0,
      resourceUsage: currentUsage
    };
  }

  /**
   * Get current resource usage for an agent
   */
  private getCurrentResourceUsage(_agentId: string): ResourceUsage {
    const now = Date.now();
    
    // In a real implementation, this would interface with system monitoring
    // For now, return mock data that simulates reasonable values
    return {
      cpuTime: Math.random() * 100, // 0-100ms
      memoryUsage: Math.random() * 50 * 1024 * 1024, // 0-50MB
      networkBandwidth: Math.random() * 1024 * 1024, // 0-1MB/s
      diskIO: Math.random() * 1024 * 1024, // 0-1MB/s
      timestamp: now
    };
  }

  /**
   * Check if an agent is currently blocked
   */
  private isAgentBlocked(agentId: string, now: number): boolean {
    const unblockTime = this.blockedAgents.get(agentId);
    if (!unblockTime) return false;
    
    if (now >= unblockTime) {
      this.blockedAgents.delete(agentId);
      this.emit('agent_unblocked', { agentId });
      return false;
    }
    
    return true;
  }

  /**
   * Block an agent for a specified duration
   */
  private blockAgent(agentId: string, now: number): void {
    const unblockTime = now + this.config.blockDurationMs;
    this.blockedAgents.set(agentId, unblockTime);
    this.emit('agent_blocked', { agentId, unblockTime, duration: this.config.blockDurationMs });
  }

  /**
   * Manually unblock an agent (admin function)
   */
  async unblockAgent(agentId: string): Promise<void> {
    this.blockedAgents.delete(agentId);
    this.emit('agent_unblocked', { agentId, manual: true });
  }

  /**
   * Get rate limit status for an agent
   */
  getLimitStatus(agentId: string, capability: string = 'default'): {
    requests: number;
    maxRequests: number;
    windowStart: number;
    windowEnd: number;
    burstTokens: number;
    totalRequests: number;
    blockedRequests: number;
    isBlocked: boolean;
  } | null {
    const key = `${agentId}:${capability}`;
    const limit = this.limits.get(key);
    const now = Date.now();
    
    if (!limit) return null;

    return {
      requests: limit.requests,
      maxRequests: this.config.maxRequestsPerWindow,
      windowStart: limit.windowStart,
      windowEnd: limit.windowStart + this.config.windowSizeMs,
      burstTokens: limit.burstTokens,
      totalRequests: limit.totalRequests,
      blockedRequests: limit.blockedRequests,
      isBlocked: this.isAgentBlocked(agentId, now)
    };
  }

  /**
   * Get global rate limiting statistics
   */
  getGlobalStats(): {
    totalAgents: number;
    blockedAgents: number;
    totalRequests: number;
    totalBlockedRequests: number;
    averageRequestsPerAgent: number;
  } {
    const agents = new Set<string>();
    let totalRequests = 0;
    let totalBlockedRequests = 0;

    for (const [key, limit] of this.limits.entries()) {
      const agentId = key.split(':')[0];
      agents.add(agentId);
      totalRequests += limit.totalRequests;
      totalBlockedRequests += limit.blockedRequests;
    }

    return {
      totalAgents: agents.size,
      blockedAgents: this.blockedAgents.size,
      totalRequests,
      totalBlockedRequests,
      averageRequestsPerAgent: agents.size > 0 ? totalRequests / agents.size : 0
    };
  }

  /**
   * Reset rate limits for an agent (admin function)
   */
  async resetAgent(agentId: string): Promise<void> {
    // Remove all limits for this agent
    for (const [key] of this.limits.entries()) {
      if (key.startsWith(agentId + ':')) {
        this.limits.delete(key);
      }
    }

    // Unblock if blocked
    this.blockedAgents.delete(agentId);
    
    // Clear resource usage history
    this.resourceUsage.delete(agentId);

    this.emit('agent_reset', { agentId });
  }

  /**
   * Start cleanup scheduler for expired entries
   */
  private startCleanupScheduler(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      
      // Clean up expired rate limits
      for (const [key, limit] of this.limits.entries()) {
        if (now - limit.windowStart > this.config.windowSizeMs * 2) {
          this.limits.delete(key);
        }
      }

      // Clean up expired blocks
      for (const [agentId, unblockTime] of this.blockedAgents.entries()) {
        if (now >= unblockTime) {
          this.blockedAgents.delete(agentId);
        }
      }

      // Clean up old resource usage data
      const oneHourAgo = now - 3600000;
      for (const [agentId, usageHistory] of this.resourceUsage.entries()) {
        const recentUsage = usageHistory.filter(usage => usage.timestamp > oneHourAgo);
        if (recentUsage.length === 0) {
          this.resourceUsage.delete(agentId);
        } else {
          this.resourceUsage.set(agentId, recentUsage);
        }
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Shutdown the rate limiter and clean up resources
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.limits.clear();
    this.blockedAgents.clear();
    this.resourceUsage.clear();

    this.emit('shutdown');
  }
}

/**
 * Default rate limiter with moderate settings
 */
export const defaultRateLimiter = new AgentRateLimiter({
  windowSizeMs: 60000, // 1 minute
  maxRequestsPerWindow: 100,
  burstSize: 20,
  refillRate: 2,
  enableBurstProtection: true,
  enableResourceTracking: true
});

/**
 * Strict rate limiter for high-security environments
 */
export const strictRateLimiter = new AgentRateLimiter({
  windowSizeMs: 60000, // 1 minute
  maxRequestsPerWindow: 30,
  burstSize: 5,
  refillRate: 1,
  enableBurstProtection: true,
  enableResourceTracking: true,
  blockDurationMs: 900000 // 15 minutes
});