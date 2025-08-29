import { z } from 'zod';

const sourcesSchema = z.object({
  sources: z.array(z.string()),
});

export function collectRawEvidence(input: { sources: string[] }): string[] {
  const { sources } = sourcesSchema.parse(input);
  return sources.map((s) => s.trim()).filter(Boolean);
}
