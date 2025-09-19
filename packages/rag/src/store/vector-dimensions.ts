/**
 * Vector dimension helpers for stores
 */

import type { AllowedDimension } from '../embed/multi-dimensional.js';
import { ALLOWED_EMBEDDING_DIMS } from '../lib/security.js';

export function columnNameForDimension(dim: number): string {
	if (!ALLOWED_EMBEDDING_DIMS.has(dim)) throw new Error(`Unsupported dimension: ${dim}`);
	return `embedding_${dim}`;
}

export function parseDimensionFromColumn(name: string): AllowedDimension | null {
	const m = name.match(/^embedding_(\d{3,4})$/);
	if (!m) return null;
	const n = Number(m[1]);
	return ALLOWED_EMBEDDING_DIMS.has(n) ? (n as AllowedDimension) : null;
}

export function mapModelToDimension(model: string): AllowedDimension {
	const lower = model.toLowerCase();
	if (lower.includes('384')) return 384;
	if (lower.includes('768')) return 768;
	if (lower.includes('1024')) return 1024;
	if (lower.includes('1536')) return 1536;
	if (lower.includes('3072')) return 3072;
	// default to widely used 1536 if unknown
	return 1536;
}
