import { z } from 'zod';

export const ConnectorStatusSchema = z.enum(['enabled', 'disabled']);

export const ConnectorAuthSchema = z
        .object({
                type: z.enum(['apiKey', 'bearer', 'none']),
                headerName: z.string().min(1).optional(),
        })
        .strict();

const uniqueScopes = z
        .array(z.string().min(1))
        .superRefine((scopes, ctx) => {
                const unique = new Set(scopes);
                if (unique.size !== scopes.length) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: 'Scopes must be unique',
                        });
                }
        });

export const ConnectorEntrySchema = z
export const ConnectorAuthenticationSchema = z
        .object({
                headers: z.array(ConnectorAuthHeaderSchema).min(1),
        })
        .strict();

export const ConnectorQuotaSchema = z
        .object({
                per_minute: z.number().int().min(0).optional(),
                per_hour: z.number().int().min(0).optional(),
                per_day: z.number().int().min(0).optional(),
                concurrent: z.number().int().min(0).optional(),
        })
        .strict();

export const ConnectorEntrySchema = z
export const ConnectorManifestEntrySchema = z
        .object({
                id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
                name: z.string().min(1),
                displayName: z.string().min(1),
                version: z.string().min(1),
                description: z.string().min(1).optional(),
                scopes: uniqueScopes,
                quotas: z.record(z.number().int().nonnegative()).optional(),
                timeouts: z.record(z.number().int().nonnegative()).optional(),
                status: ConnectorStatusSchema.optional(),
                enabled: z.boolean().optional(),
                status: ConnectorStatusSchema,
                description: z.string().min(1).optional(),
                endpoint: z.string().url(),
                authentication: ConnectorAuthenticationSchema,
                scopes: z
                        .array(z.string().min(1))
                        .min(1)
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
                headers: z.record(z.string().min(1), z.string()).optional(),
                tags: z.array(z.string().min(1)).optional(),
                quotas: z.record(z.number().int().nonnegative()).default({}),
                timeouts: z.record(z.number().int().nonnegative()).default({}),
                status: ConnectorStatusSchema.default('enabled'),
                ttlSeconds: z.number().int().positive(),
                endpoint: z.string().url(),
                auth: ConnectorAuthSchema,
                metadata: z.record(z.string(), z.unknown()).optional(),
                tags: z.array(z.string().min(1)).optional(),
        })
        .strict();

export const ConnectorsManifestSchema = z
        .object({
                $schema: z.string().min(1).optional(),
                id: z.string().min(1),
                manifestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
                generatedAt: z.string().datetime({ offset: true }).optional(),
                ttlSeconds: z.number().int().positive().optional(),
                connectors: z.array(ConnectorEntrySchema).min(1),
                metadata: z.record(z.string(), z.unknown()).optional(),
                id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
                $schema: z.string().min(1).optional(),
                schema_version: z.string().regex(/^\d+\.\d+\.\d+$/),
                generated_at: z.string().datetime({ offset: true }).optional(),
                connectors: z.array(ConnectorEntrySchema).min(1),
        })
        .strict();

const ConnectorAuthSchema = z
        .object({
                type: z.enum(['apiKey', 'bearer', 'none']),
                headerName: z.string().min(1).optional(),
        })
        .strict();

const ConnectorQuotaBudgetSchema = z
        .object({
                perMinute: z.number().int().min(0).optional(),
                perHour: z.number().int().min(0).optional(),
                perDay: z.number().int().min(0).optional(),
                concurrent: z.number().int().min(0).optional(),
        })
        .strict();

export const ConnectorServiceMapEntrySchema = z
        .object({
                id: z.string(),
                version: z.string(),
                displayName: z.string(),
                endpoint: z.string().url(),
                auth: ConnectorAuthSchema,
                scopes: z.array(z.string()).min(1),
                ttlSeconds: z.number().int().min(1),
                enabled: z.boolean(),
                metadata: z
                        .object({ brand: z.literal('brAInwav') })
                        .passthrough()
                        .default({ brand: 'brAInwav' }),
                quotas: ConnectorQuotaBudgetSchema.optional(),
                headers: z.record(z.string().min(1), z.string()).optional(),
                description: z.string().optional(),
                tags: z.array(z.string().min(1)).optional(),
                id: z.string().min(1),
                brand: z.literal('brAInwav').optional(),
                ttlSeconds: z.number().int().positive(),
                connectors: z.array(ConnectorManifestEntrySchema).min(1),
                metadata: z.record(z.unknown()).optional(),
        })
        .strict();

export const ConnectorServiceEntrySchema = z
        .object({
                id: z.string(),
                version: z.string(),
                displayName: z.string().min(1),
                endpoint: z.string().url(),
                auth: ConnectorAuthSchema,
                scopes: uniqueScopes,
                ttlSeconds: z.number().int().positive(),
                enabled: z.boolean().optional(),
                metadata: z.record(z.string(), z.unknown()).optional(),
                quotas: z.record(z.number().int().nonnegative()).optional(),
                timeouts: z.record(z.number().int().nonnegative()).optional(),
                description: z.string().min(1).optional(),
                tags: z.array(z.string().min(1)).optional(),
                id: z.string().min(1),
                name: z.string().min(1),
                version: z.string().min(1),
                scopes: z.array(z.string().min(1)).min(1),
                status: ConnectorStatusSchema,
                ttl: z.number().int().positive(),
                quotas: z.record(z.number().int().nonnegative()).optional(),
                timeouts: z.record(z.number().int().nonnegative()).optional(),
                metadata: z.record(z.unknown()).optional(),
                endpoint: z.string().url().optional(),
                auth: ConnectorAuthSchema.optional(),
        })
        .strict();

export const ConnectorServiceMapSchema = z
        .object({
                id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
                brand: z.literal('brAInwav'),
                generatedAt: z.string().datetime(),
                ttlSeconds: z.number().int().min(1),
                connectors: z.array(ConnectorServiceMapEntrySchema).min(1),
                id: z.string().min(1),
                brand: z.literal('brAInwav'),
                generatedAt: z.string().datetime(),
                ttlSeconds: z.number().int().positive(),
                connectors: z.array(ConnectorServiceMapEntrySchema),
                connectors: z.array(ConnectorServiceEntrySchema),
                signature: z.string().min(1),
        })
        .strict();

export const ConnectorServiceMapPayloadSchema = ConnectorServiceMapSchema.omit({ signature: true });

export type ConnectorAuth = z.infer<typeof ConnectorAuthSchema>;
export type ConnectorEntry = z.infer<typeof ConnectorEntrySchema>;
export type ConnectorStatus = z.infer<typeof ConnectorStatusSchema>;
export type ConnectorAuth = z.infer<typeof ConnectorAuthSchema>;
export type ConnectorManifestEntry = z.infer<typeof ConnectorManifestEntrySchema>;
export type ConnectorsManifest = z.infer<typeof ConnectorsManifestSchema>;
export type ConnectorServiceEntry = z.infer<typeof ConnectorServiceEntrySchema>;
export type ConnectorServiceMap = z.infer<typeof ConnectorServiceMapSchema>;
export type ConnectorServiceMapPayload = z.infer<typeof ConnectorServiceMapPayloadSchema>;
