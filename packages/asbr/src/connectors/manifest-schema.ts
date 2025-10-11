import { z } from 'zod';

export const ConnectorStatusSchema = z.enum(['enabled', 'disabled']);

export const ConnectorAuthSchema = z
        .object({
                type: z.enum(['apiKey', 'bearer', 'none']),
                headerName: z.string().min(1).optional(),
        })
        .strict();

export const ConnectorManifestEntrySchema = z
        .object({
                id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
                name: z.string().min(1),
                version: z.string().min(1),
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
                quotas: z.record(z.number().int().nonnegative()).default({}),
                timeouts: z.record(z.number().int().nonnegative()).default({}),
                status: ConnectorStatusSchema.default('enabled'),
                ttlSeconds: z.number().int().positive(),
                metadata: z.record(z.unknown()).optional(),
                endpoint: z.string().url().optional(),
                auth: ConnectorAuthSchema.optional(),
        })
        .strict();

export const ConnectorsManifestSchema = z
        .object({
                id: z.string().min(1),
                brand: z.literal('brAInwav').optional(),
                ttlSeconds: z.number().int().positive(),
                connectors: z.array(ConnectorManifestEntrySchema).min(1),
                metadata: z.record(z.unknown()).optional(),
        })
        .strict();

export const ConnectorServiceEntrySchema = z
        .object({
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
                connectors: z.array(ConnectorServiceEntrySchema),
                signature: z.string().min(1),
        })
        .strict();

export type ConnectorStatus = z.infer<typeof ConnectorStatusSchema>;
export type ConnectorAuth = z.infer<typeof ConnectorAuthSchema>;
export type ConnectorManifestEntry = z.infer<typeof ConnectorManifestEntrySchema>;
export type ConnectorsManifest = z.infer<typeof ConnectorsManifestSchema>;
export type ConnectorServiceEntry = z.infer<typeof ConnectorServiceEntrySchema>;
export type ConnectorServiceMap = z.infer<typeof ConnectorServiceMapSchema>;
