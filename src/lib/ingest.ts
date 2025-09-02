import { z } from "zod";

export const ingestInputSchema = z.object({
	source: z.string().min(1, "source is required"),
	text: z.string().min(1, "text is required"),
});

export type IngestInput = z.infer<typeof ingestInputSchema>;

export function ingest(input: unknown): IngestInput {
	const parsed = ingestInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new Error(`Invalid ingest input: ${parsed.error.message}`);
	}
	return parsed.data;
}
