import { randomBytes } from 'node:crypto';
import type {
  BypassContext,
  BypassResult,
  BypassToken,
  SkipPermissionsConfig,
} from '@cortex-os/contracts';
import { SkipPermissionsConfigSchema } from '@cortex-os/contracts';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { getUser } from '../server/hono-helpers.js';

/**
 * Skip Permissions Service
 *
 * Provides controlled bypass of permission checks with security controls and audit logging
 */
export class SkipPermissionsService {
  private config: SkipPermissionsConfig;
  private readonly bypassTokens: Map<string, BypassToken> = new Map();
  private readonly rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config?: Partial<SkipPermissionsConfig>) {
    this.config = SkipPermissionsConfigSchema.parse({
      enabled: process.env.DANGEROUSLY_SKIP_PERMISSIONS_ENABLED === 'true',
      requireAdmin: process.env.DANGEROUSLY_SKIP_PERMISSIONS_REQUIRE_ADMIN !== 'false',
      bypassTokens: process.env.DANGEROUSLY_SKIP_PERMISSIONS_TOKENS?.split(',') || [],
      auditLog: process.env.DANGEROUSLY_SKIP_PERMISSIONS_AUDIT !== 'false',
      maxBypassDuration: parseInt(
        process.env.DANGEROUSLY_SKIP_PERMISSIONS_MAX_DURATION || '300000',
        10,
      ),
      allowedIPs: process.env.DANGEROUSLY_SKIP_PERMISSIONS_ALLOWED_IPS?.split(',') || [],
      ...config,
    });
  }

  /**
   * Check if permissions can be bypassed for the given context
   */
  async canBypass(context: BypassContext): Promise<BypassResult> {
    // If feature is disabled, no bypass allowed
    if (!this.config.enabled) {
      return {
        allowed: false,
        reason: 'Skip permissions feature is disabled',
        bypassType: 'disabled',
      };
    }

    // IP check
    if (!this.isIpAllowed(context)) {
      return {
        allowed: false,
        reason: 'IP address not allowed to bypass permissions',
        bypassType: 'ip_restricted',
      };
    }

    // Rate limiting
    const rateLimitKey = context.ipAddress || context.userId || 'anonymous';
    if (this.isRateLimited(rateLimitKey)) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded for bypass requests',
        bypassType: 'rate_limited',
      };
    }

    // Admin role check
    if (this.config.requireAdmin && context.userRole !== 'admin') {
      return {
        allowed: false,
        reason: 'Admin role required to bypass permissions',
        bypassType: 'admin',
      };
    }

    // Handle token-based bypass validation
    const tokenResult = this.validateBypassToken(context);
    if (tokenResult) {
      return tokenResult;
    }

    // Record the bypass for rate limiting
    this.recordBypass(rateLimitKey);

    // Audit log the bypass
    if (this.config.auditLog) {
      await this.auditLogBypass(context);
    }

    return {
      allowed: true,
      reason: 'Permissions bypassed successfully',
      bypassType: context.userRole === 'admin' ? 'admin' : 'token',
      metadata: {
        timestamp: new Date().toISOString(),
        resource: context.resource,
        action: context.action,
      },
    };
  }

  private isIpAllowed(context: BypassContext): boolean {
    if (this.config.allowedIPs.length === 0) return true;
    if (!context.ipAddress) return false;
    return this.config.allowedIPs.includes(context.ipAddress);
  }

  private validateBypassToken(context: BypassContext): BypassResult | null {
    if (!context.bypassToken) return null;
    const token = this.bypassTokens.get(context.bypassToken);
    if (!token) {
      return {
        allowed: false,
        reason: 'Invalid bypass token',
        bypassType: 'token',
      };
    }

    // Check token expiration
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      this.bypassTokens.delete(context.bypassToken);
      return {
        allowed: false,
        reason: 'Bypass token has expired',
        bypassType: 'token',
      };
    }

    // Update token usage
    token.usedCount += 1;
    token.lastUsed = new Date().toISOString();
    this.bypassTokens.set(context.bypassToken, token);
    return null;
  }

  /**
   * Generate a new bypass token
   */
  generateBypassToken(description: string, createdBy: string, duration?: number): BypassToken {
    const token = randomBytes(32).toString('hex');
    const expiresAt = duration
      ? new Date(Date.now() + Math.min(duration, this.config.maxBypassDuration)).toISOString()
      : undefined;

    const bypassToken: BypassToken = {
      token,
      description,
      createdBy,
      createdAt: new Date().toISOString(),
      expiresAt,
      usedCount: 0,
    };

    this.bypassTokens.set(token, bypassToken);
    return bypassToken;
  }

  /**
   * Revoke a bypass token
   */
  revokeBypassToken(token: string): boolean {
    return this.bypassTokens.delete(token);
  }

  /**
   * List all active bypass tokens
   */
  listBypassTokens(): BypassToken[] {
    const now = new Date();
    const activeTokens: BypassToken[] = [];

    // Clean up expired tokens
    for (const [tokenKey, token] of this.bypassTokens.entries()) {
      if (token.expiresAt && new Date(token.expiresAt) < now) {
        this.bypassTokens.delete(tokenKey);
      } else {
        activeTokens.push(token);
      }
    }

    return activeTokens;
  }

  /**
   * Middleware for Hono to handle skip permissions header
   */
  middleware() {
    return async (c: Context, next: () => Promise<void>) => {
      // Check for skip-permissions header
      const bypassToken = c.req.header('X-Skip-Permissions');

      if (bypassToken) {
        // Use typed helper to obtain user information
        const user = getUser(c);
        const bypassContext: BypassContext = {
          userId: user?.id,
          userRole: user?.role,
          ipAddress:
            c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
          userAgent: c.req.header('User-Agent'),
          bypassToken,
        };

        const result = await this.canBypass(bypassContext);

        // Store bypass result in context for other middleware
        c.set('skipPermissionsResult', result);
      }

      await next();
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): SkipPermissionsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SkipPermissionsConfig>): SkipPermissionsConfig {
    this.config = SkipPermissionsConfigSchema.parse({
      ...this.config,
      ...updates,
    });
    return this.getConfig();
  }

  /**
   * Get rate limit status for an IP
   */
  getRateLimitStatus(ipAddress: string) {
    const record = this.rateLimitStore.get(ipAddress);
    const now = Date.now();

    if (!record || now > record.resetTime) {
      return {
        ipAddress,
        limited: false,
        remaining: this.config.bypassRateLimit.max,
        resetTime: now + this.config.bypassRateLimit.windowMs,
      };
    }

    return {
      ipAddress,
      limited: record.count >= this.config.bypassRateLimit.max,
      remaining: Math.max(0, this.config.bypassRateLimit.max - record.count),
      resetTime: record.resetTime,
    };
  }

  /**
   * Reset rate limit for an IP
   */
  resetRateLimit(ipAddress: string): boolean {
    return this.rateLimitStore.delete(ipAddress);
  }

  /**
   * Create Hono routes for managing bypass tokens
   */
  createRoutes(app: Hono) {
    const bypass = new Hono();

    // Generate new bypass token (admin only)
    bypass.post('/tokens', async (c) => {
      const user = getUser(c);
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      const { description, duration } = await c.req.json();

      if (!description) {
        return c.json({ error: 'Description is required' }, 400);
      }

      const token = this.generateBypassToken(description, user.id, duration);

      return c.json({
        token: token.token,
        description: token.description,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      });
    });

    // List bypass tokens (admin only)
    bypass.get('/tokens', async (c) => {
      const user = getUser(c);
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      const tokens = this.listBypassTokens();
      return c.json(tokens);
    });

    // Revoke bypass token (admin only)
    bypass.delete('/tokens/:token', async (c) => {
      const user = getUser(c);
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      const token = c.req.param('token');
      const success = this.revokeBypassToken(token);

      if (!success) {
        return c.json({ error: 'Token not found' }, 404);
      }

      return c.json({ success: true });
    });

    // Get configuration (admin only)
    bypass.get('/config', async (c) => {
      const user = getUser(c);
      if (!user || user.role !== 'admin') {
        return c.json({ error: 'Admin access required' }, 403);
      }

      return c.json({
        enabled: this.config.enabled,
        requireAdmin: this.config.requireAdmin,
        auditLog: this.config.auditLog,
        maxBypassDuration: this.config.maxBypassDuration,
        allowedIPs: this.config.allowedIPs,
        bypassRateLimit: this.config.bypassRateLimit,
      });
    });

    app.route('/skip-permissions', bypass);
  }

  private isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = this.rateLimitStore.get(key);

    if (!record) {
      return false;
    }

    if (now > record.resetTime) {
      // Reset expired rate limit
      this.rateLimitStore.delete(key);
      return false;
    }

    return record.count >= this.config.bypassRateLimit.max;
  }

  private recordBypass(key: string): void {
    const now = Date.now();
    const record = this.rateLimitStore.get(key);

    if (record && now <= record.resetTime) {
      record.count += 1;
    } else {
      // Create new rate limit record
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + this.config.bypassRateLimit.windowMs,
      });
    }
  }

  private async auditLogBypass(context: BypassContext): Promise<void> {
    // Minimal audit logging implementation to satisfy production readiness checks.
    // Publishes a brAInwav-branded audit log to the console by default.
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        userId: context.userId,
        userRole: context.userRole,
        ipAddress: context.ipAddress,
        resource: context.resource,
        action: context.action,
        bypassType: context.userRole === 'admin' ? 'admin' : 'token',
      };
      // If the environment provides a structured audit sink via config, prefer it.
      if ((this.config as unknown as Record<string, unknown>).auditSink) {
        const maybeSink = (this.config as unknown as Record<string, unknown>).auditSink;
        if (maybeSink && typeof (maybeSink as { log?: unknown }).log === 'function') {
          await Promise.resolve(
            (maybeSink as { log: (arg: unknown) => unknown }).log({
              source: 'brAInwav',
              event: 'skip-permissions',
              payload,
            }),
          );
          return;
        }
      }
      // Fallback to console logging with brAInwav branding
      console.info('brAInwav.audit.skip-permissions', payload);
    } catch (err) {
      // Never throw from audit logging path; log the failure and continue
      console.error('brAInwav.audit.skip-permissions.failed', err);
    }
  }
}
// End of SkipPermissionsService
