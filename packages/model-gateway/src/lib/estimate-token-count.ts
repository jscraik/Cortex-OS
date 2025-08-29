/**
 * @file_path packages/model-gateway/src/lib/estimate-token-count.ts
 * Estimate token count for text (rough approximation).
 */

import { z } from 'zod';

const TextSchema = z.string();

/**
 * Estimate token count for text (rough approximation).
 * Roughly assumes one token per four characters.
 */
export function estimateTokenCount(text: string): number {
  TextSchema.parse(text);
  return Math.ceil(text.length / 4);
}
