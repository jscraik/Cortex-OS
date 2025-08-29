import { z } from 'zod';

const analyzeSchema = z.object({
  context: z.string(),
});

export function analyzeContext(input: { context: string }): { tokens: string[]; count: number } {
  const { context } = analyzeSchema.parse(input);
  const tokens = context
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  const unique = Array.from(new Set(tokens));
  return { tokens: unique, count: unique.length };
}
