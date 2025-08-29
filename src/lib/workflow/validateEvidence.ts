import { z } from 'zod';

const evidenceSchema = z.object({
  evidence: z.array(
    z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s.length > 0, 'Empty string'),
  ),
});

export function validateEvidence(input: { evidence: string[] }): string[] {
  const { evidence } = evidenceSchema.parse(input);
  return Array.from(new Set(evidence));
}
