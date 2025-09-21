import { z } from 'zod';

// Minimal Envelope schema and types for tests
export const Envelope = z
	.object({
		id: z.string(),
		type: z.string(),
		source: z.string(),
		specversion: z.literal('1.0'),
		data: z.unknown().optional(),
		time: z.string().optional(),
	})
	.transform((env) => ({
		...env,
		time: env.time || new Date().toISOString(),
	}));

export type Envelope = z.infer<typeof Envelope>;

export type TopicACL = Record<string, { publish?: boolean; subscribe?: boolean }>;

export function createEnvelope(params: {
	id?: string;
	type: string;
	source: string;
	data?: unknown;
	time?: string;
}): Envelope {
	return Envelope.parse({
		id: params.id || `stub-${Math.random().toString(36).slice(2)}`,
		type: params.type,
		source: params.source,
		specversion: '1.0',
		data: params.data,
		time: params.time,
	});
}
