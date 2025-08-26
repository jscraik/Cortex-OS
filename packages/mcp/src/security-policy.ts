import { z } from 'zod';

export const SecurityPolicySchema = z.object({
  allowedDomains: z.array(z.string()),
  blockedDomains: z.array(z.string()),
  requireApiKey: z.boolean(),
  requireUserApproval: z.boolean(),
  maxConnections: z.number(),
  sandbox: z.boolean(),
  allowedCapabilities: z.array(z.string()),
});

export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;

export const defaultSecurityPolicy: SecurityPolicy = SecurityPolicySchema.parse({
  allowedDomains: ['localhost', '127.0.0.1', 'api.ref.tools'],
  blockedDomains: ['127.0.0.2', '0.0.0.0', '169.254.169.254'],
  requireApiKey: true,
  requireUserApproval: true,
  maxConnections: 10,
  sandbox: true,
  allowedCapabilities: ['read', 'search', 'info'],
});

export function logSecurityEvent(event: string, data: unknown) {
  const payload = { event, data, ts: new Date().toISOString() };
  console.log(JSON.stringify(payload));
}
