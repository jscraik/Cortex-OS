import { z } from 'zod';

export const queryInputSchema = z.object({
	query: z.string().min(1, 'query is required'),
	topK: z.number().int().positive().max(100).default(5),
});

export type QueryInput = z.infer<typeof queryInputSchema>;

export function query(input: unknown): QueryInput {
	const parsed = queryInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new Error(`Invalid query input: ${parsed.error.message}`);
	}
	return parsed.data;
}
