import { z } from 'zod';

export const BypassTokenSchema = z.object({
  token: z.string().min(1),
  description: z.string().optional(),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  usedCount: z.number().int().min(0).default(0),
  lastUsed: z.string().datetime().optional(),
});
export type BypassToken = z.infer<typeof BypassTokenSchema>;

export const BypassContextSchema = z.object({
  userId: z.string().optional(),
  userRole: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  bypassToken: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
});
export type BypassContext = z.infer<typeof BypassContextSchema>;

export const BypassResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string(),
  bypassType: z.enum(['disabled', 'ip_restricted', 'rate_limited', 'admin', 'token']),
  metadata: z.record(z.unknown()).optional(),
});
export type BypassResult = z.infer<typeof BypassResultSchema>;

export const SkipPermissionsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  requireAdmin: z.boolean().default(true),
  bypassTokens: z.array(z.string()).default([]),
  auditLog: z.boolean().default(true),
  maxBypassDuration: z.number().int().default(300000),
  allowedIPs: z.array(z.string()).default([]),
  bypassRateLimit: z.object({
    max: z.number().int().default(5),
    windowMs: z.number().int().default(60000),
  }).default({ max: 5, windowMs: 60000 }),
});
export type SkipPermissionsConfig = z.infer<typeof SkipPermissionsConfigSchema>;
