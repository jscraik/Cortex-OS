/**
 * @file_path packages/model-gateway/src/lib/estimate-token-count.ts
 * Estimate token count for text (rough approximation).
 */

/**
 * Estimate token count for text (rough approximation).
 * Roughly assumes one token per four characters.
 */
export function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / 4);
}
