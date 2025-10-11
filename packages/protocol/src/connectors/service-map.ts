import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { z } from 'zod';

const ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export const connectorAuthSchema = z.object({
        type: z.enum(['apiKey', 'bearer', 'none']),
        headerName: z.string().min(1).optional(),
});

const quotaValueSchema = z.number().int().positive();

export const connectorQuotasSchema = z
        .object({
                perMinute: quotaValueSchema.optional(),
                perHour: quotaValueSchema.optional(),
                concurrent: quotaValueSchema.optional(),
        })
        .default({});

export const connectorEntrySchema = z
        .object({
                id: z.string().min(1),
                version: z.string().min(1),
                name: z.string().min(1),
                scopes: z.array(z.string().min(1)).min(1),
                status: z.enum(['enabled', 'disabled']),
                ttl: z.number().int().positive(),
                metadata: z
                        .object({ brand: z.literal('brAInwav') })
                        .passthrough()
                        .optional(),
                endpoint: z.string().url().optional(),
                auth: connectorAuthSchema.optional(),
                quotas: connectorQuotasSchema.optional(),
                timeouts: z.record(z.number().int().positive()).optional(),
        })
        .strict();

export const serviceMapResponseSchema = z.object({
        id: z.string().regex(ulidRegex, 'Invalid ULID'),
        brand: z.literal('brAInwav'),
        generatedAt: z.string().datetime(),
        ttlSeconds: z.number().int().positive(),
        connectors: z.array(connectorEntrySchema).min(1),
        signature: z.string().min(1),
});

export type ConnectorAuth = z.infer<typeof connectorAuthSchema>;
export type ConnectorEntry = z.infer<typeof connectorEntrySchema>;
export type ServiceMapResponse = z.infer<typeof serviceMapResponseSchema>;
export type ServiceMapPayload = Omit<ServiceMapResponse, 'signature'>;

const sortRecord = (value: Record<string, unknown>): Record<string, unknown> => {
        const entries = Object.entries(value)
                .map(([key, entryValue]) => [key, normalizeValue(entryValue)] as const)
                .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
        return Object.fromEntries(entries);
};

const sortArray = (value: unknown[]): unknown[] => {
        return value.map((item) => normalizeValue(item));
};

const normalizeValue = (value: unknown): unknown => {
        if (Array.isArray(value)) {
                return sortArray(value);
        }

        if (value && typeof value === 'object') {
                return sortRecord(value as Record<string, unknown>);
        }

        return value;
};

export const canonicalizeServiceMapPayload = (payload: ServiceMapPayload): string => {
        const normalized = normalizeValue(payload) as ServiceMapPayload;
        return JSON.stringify(normalized);
};

export const createServiceMapSignature = (payload: ServiceMapPayload, key: string): string => {
        return createHmac('sha256', key).update(canonicalizeServiceMapPayload(payload)).digest('base64url');
};

export const verifyServiceMapSignature = (
        payload: ServiceMapPayload,
        signature: string,
        key: string,
): boolean => {
        const expected = createServiceMapSignature(payload, key);
        const providedBuffer = Buffer.from(signature, 'base64url');
        const expectedBuffer = Buffer.from(expected, 'base64url');

        if (providedBuffer.length !== expectedBuffer.length) {
                return false;
        }

        return timingSafeEqual(providedBuffer, expectedBuffer);
};

