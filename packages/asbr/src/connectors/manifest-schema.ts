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
                per_minute: z.number().int().min(0).optional(),
                per_hour: z.number().int().min(0).optional(),
                per_day: z.number().int().min(0).optional(),
                concurrent: z.number().int().min(0).optional(),
        })
        .strict();

export const ConnectorEntrySchema = z
        .object({
                id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
                name: z.string().min(1),
                version: z.string().min(1),
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
        })
        .strict();

export const ConnectorsManifestSchema = z
        .object({
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
        })
        .strict();

export const ConnectorServiceMapSchema = z
        .object({
                id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
                brand: z.literal('brAInwav'),
                generatedAt: z.string().datetime(),
                ttlSeconds: z.number().int().min(1),
                connectors: z.array(ConnectorServiceMapEntrySchema).min(1),
                signature: z.string().min(1),
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
