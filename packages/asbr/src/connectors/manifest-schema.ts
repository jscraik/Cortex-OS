import { z } from 'zod';

export const ConnectorStatusSchema = z.enum(['enabled', 'disabled', 'preview']);

export const ConnectorAuthHeaderSchema = z
        .object({
                name: z.string().min(1),
                value: z.string().min(1),
        })
        .strict();

export const ConnectorAuthenticationSchema = z
        .object({
                headers: z.array(ConnectorAuthHeaderSchema).min(1),
        })
        .strict();

export const ConnectorQuotaSchema = z
        .object({
                per_minute: z.number().int().min(0),
                per_hour: z.number().int().min(0),
                per_day: z.number().int().min(0),
        })
        .strict();

export const ConnectorEntrySchema = z
        .object({
                id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
                version: z.string().min(1),
                status: ConnectorStatusSchema,
                description: z.string().min(1).optional(),
                authentication: ConnectorAuthenticationSchema,
                scopes: z
                        .array(z.string().min(1))
                        .superRefine((scopes, ctx) => {
                                const unique = new Set(scopes);
                                if (unique.size !== scopes.length) {
                                        ctx.addIssue({
                                                code: z.ZodIssueCode.custom,
                                                message: 'Scopes must be unique',
                                        });
                                }
                        }),
                quotas: ConnectorQuotaSchema,
                ttl_seconds: z.number().int().min(1),
                metadata: z.record(z.string(), z.unknown()).optional(),
        })
        .strict();

export const ConnectorsManifestSchema = z
        .object({
                $schema: z.string().min(1).optional(),
                schema_version: z.string().regex(/^\d+\.\d+\.\d+$/),
                generated_at: z.string().datetime({ offset: true }).optional(),
                connectors: z.array(ConnectorEntrySchema).min(1),
        })
        .strict();

export const ConnectorServiceMapEntrySchema = z
        .object({
                id: z.string(),
                version: z.string(),
                status: ConnectorStatusSchema,
                scopes: z.array(z.string()),
                quotas: ConnectorQuotaSchema,
                ttl_seconds: z.number().int().min(1),
        })
        .strict();

export const ConnectorServiceMapSchema = z
        .object({
                connectors: z.array(ConnectorServiceMapEntrySchema),
                schema_version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
                generated_at: z.string().datetime({ offset: true }).optional(),
        })
        .strict();

export type ConnectorStatus = z.infer<typeof ConnectorStatusSchema>;
export type ConnectorAuthHeader = z.infer<typeof ConnectorAuthHeaderSchema>;
export type ConnectorAuthentication = z.infer<typeof ConnectorAuthenticationSchema>;
export type ConnectorQuota = z.infer<typeof ConnectorQuotaSchema>;
export type ConnectorEntry = z.infer<typeof ConnectorEntrySchema>;
export type ConnectorsManifest = z.infer<typeof ConnectorsManifestSchema>;
export type ConnectorServiceMapEntry = z.infer<typeof ConnectorServiceMapEntrySchema>;
export type ConnectorServiceMap = z.infer<typeof ConnectorServiceMapSchema>;
