/**
 * Multi-dimensional embedding utilities (Archon-inspired)
 * - Supports dimensions: 384, 768, 1024, 1536, 3072
 * - Provider/model-agnostic helpers for detecting and selecting dimensions
 */

import { ALLOWED_EMBEDDING_DIMS } from '../lib/security.js';

export type AllowedDimension = 384 | 768 | 1024 | 1536 | 3072;

export const ALLOWED_DIMS: AllowedDimension[] = [384, 768, 1024, 1536, 3072];

/** Returns the allowed embedding dimensions */
export function getAllowedDimensions(): AllowedDimension[] {
	return [...ALLOWED_EMBEDDING_DIMS] as AllowedDimension[];
}

/**
 * Detects the embedding dimension from a vector and validates it.
 */
export function detectEmbeddingDimension(vec: ArrayLike<number>): AllowedDimension {
	const dim = vec.length;
	if (!ALLOWED_EMBEDDING_DIMS.has(dim)) {
		throw new Error(`Invalid embedding dimension: ${dim}`);
	}
	return dim as AllowedDimension;
}

/**
 * Heuristic selection of embedding dimension for a given model identifier.
 * Allows override via env var `RAG_DEFAULT_EMBED_DIM`.
 */
export function selectEmbeddingDimensionForModel(model: string): AllowedDimension {
	const env = process.env.RAG_DEFAULT_EMBED_DIM?.trim();
	const envNum = env ? Number(env) : undefined;
	if (envNum && ALLOWED_EMBEDDING_DIMS.has(envNum)) return envNum as AllowedDimension;

	const lower = model.toLowerCase();
	for (const d of ALLOWED_DIMS) {
		if (lower.includes(String(d))) return d;
	}

	// Common defaults: many modern text embedding models output 768 or 1536
	return 1536;
}

/** Normalize an embedding vector to unit length (Float32Array) */
export function normalizeEmbedding(vec: number[] | Float32Array): Float32Array {
	let norm = 0;
	for (let i = 0; i < vec.length; i++)
		norm += (vec as number[] | Float32Array)[i] * (vec as number[] | Float32Array)[i];
	norm = Math.sqrt(norm) || 1;
	const out = new Float32Array(vec.length);
	for (let i = 0; i < vec.length; i++) out[i] = (vec as number[] | Float32Array)[i] / norm;
	return out;
}
