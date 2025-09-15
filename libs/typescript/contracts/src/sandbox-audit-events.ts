import { z } from 'zod';

// Violation code enum aligned with sandbox implementation
export const ViolationCodeEnum = z.enum([
    'DYNAMIC_CODE',
    'FS_DENIED',
    'FS_TRAVERSAL',
    'NET_DENIED',
    'MEMORY_SOFT_LIMIT',
    'TIMEOUT',
    'SERIALIZE_ERROR',
    'VIOLATION_THRESHOLD'
]);

export const SandboxAuditEventSchema = z.object({
    type: z.string().regex(/^sandbox\./, 'sandbox event types must start with sandbox.'),
    severity: z.enum(['low', 'medium', 'high']),
    message: z.string(),
    meta: z.record(z.unknown()).optional(),
    code: ViolationCodeEnum.optional()
});

export type SandboxAuditEvent = z.infer<typeof SandboxAuditEventSchema>;

export const createSandboxAuditEvent = (e: SandboxAuditEvent) => ({
    type: e.type,
    data: SandboxAuditEventSchema.parse(e)
});
