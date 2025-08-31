import { z } from 'zod';

/**
 * Health check endpoint.
 * Returns ISO-8601 timestamp per AGENTS spec.
 */
export function health() {
  return { status: 'ok', ts: new Date().toISOString() };
}

const fixSequenceSchema = z.object({
  weeks: z.array(z.number().int().positive()),
});

/**
 * Reorder roadmap weeks; placeholder implementation.
 */
export function fixSequence(input: unknown) {
  const { weeks } = fixSequenceSchema.parse(input);
  // TODO: persist reordered weeks
  return { weeks };
}

const syncSchema = z.object({
  models: z.array(z.string().min(1)),
});

/**
 * Sync Ollama models for current week; placeholder implementation.
 */
export async function syncOllama(input: unknown) {
  const { models } = syncSchema.parse(input);
  // TODO: call Ollama CLI / API
  return { synced: models, ts: new Date().toISOString() };
}
