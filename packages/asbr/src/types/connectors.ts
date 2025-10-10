import { z } from 'zod';

export const ulidSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/u, {
	message: 'Must be a ULID (26 Crockford Base32 characters, uppercase)',
});

export const connectorAuthSchema = z.object({
	type: z.enum(['apiKey', 'bearer', 'none']),
	headerName: z.string().min(1).optional(),
	queryParam: z.string().min(1).optional(),
});

export const connectorQuotaSchema = z.object({
	perMinute: z.number().int().positive(),
	perHour: z.number().int().positive(),
	perDay: z.number().int().positive().optional(),
});

export const connectorMetadataSchema = z
	.object({
		brand: z.literal('brAInwav'),
	})
	.catchall(z.unknown())
	.default({ brand: 'brAInwav' as const });

export const connectorTagsSchema = z.array(z.string().min(1)).min(1).optional();

export const connectorManifestEntrySchema = z.object({
	id: z.string().min(1),
	displayName: z.string().min(1),
	version: z.string().min(1),
	endpoint: z.string().url(),
	auth: connectorAuthSchema,
	scopes: z.array(z.string().min(1)).min(1),
	quotas: connectorQuotaSchema,
	enabled: z.boolean().default(true),
	metadata: connectorMetadataSchema,
	tags: connectorTagsSchema,
	timeouts: z
		.object({
			requestMs: z.number().int().positive().optional(),
			connectMs: z.number().int().positive().optional(),
		})
		.optional(),
	availability: z
		.object({
			target: z.number().min(0).max(1).optional(),
			requiresHeartbeat: z.boolean().default(false).optional(),
		})
		.optional(),
});

export const connectorsManifestSchema = z.object({
	brand: z.literal('brAInwav'),
	version: z.string().min(1),
	ttlSeconds: z.number().int().positive(),
	connectors: z.array(connectorManifestEntrySchema).min(1),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export const connectorRuntimeAvailabilitySchema = z.object({
	status: z.enum(['online', 'offline', 'degraded', 'unknown']).default('unknown'),
	lastCheckedAt: z.string().datetime().optional(),
	lastSuccessAt: z.string().datetime().optional(),
	lastFailureAt: z.string().datetime().optional(),
	failureReason: z.string().optional(),
});

export const connectorServiceEntrySchema = connectorManifestEntrySchema.extend({
	status: z.enum(['online', 'offline', 'degraded', 'unknown']).default('unknown'),
	ttlSeconds: z.number().int().positive(),
	expiresAt: z.string().datetime(),
	availability: connectorRuntimeAvailabilitySchema.optional(),
	telemetry: z
		.object({
			latencyP95Ms: z.number().nonnegative().optional(),
			requestCount: z.number().nonnegative().optional(),
			errorCount: z.number().nonnegative().optional(),
		})
		.optional(),
});

export const connectorsServiceMapSchema = z.object({
	id: ulidSchema,
	brand: z.literal('brAInwav'),
	generatedAt: z.string().datetime(),
	ttlSeconds: z.number().int().positive(),
	connectors: z.array(connectorServiceEntrySchema),
	signature: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ConnectorManifestEntry = z.infer<typeof connectorManifestEntrySchema>;
export type ConnectorsManifest = z.infer<typeof connectorsManifestSchema>;
export type ConnectorServiceEntry = z.infer<typeof connectorServiceEntrySchema>;
export type ConnectorsServiceMap = z.infer<typeof connectorsServiceMapSchema>;
