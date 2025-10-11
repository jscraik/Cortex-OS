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
