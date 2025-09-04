/**
 * @file_path packages/model-gateway/src/lib/estimate-token-count.ts
 * Estimate token count for text (rough approximation).
 */

import { encoding_for_model } from "js-tiktoken";

/**
 * Estimate token count for text using tiktoken. Falls back to a simple
 * heuristic (1 token per 4 characters) if the model encoding cannot be
 * loaded.
 */
export function estimateTokenCount(text: string, model = "gpt-3.5-turbo"): number {
        try {
                const enc = encoding_for_model(model);
                const tokens = enc.encode(text);
                enc.free();
                return tokens.length;
        } catch {
                return Math.ceil(text.length / 4);
        }
}
