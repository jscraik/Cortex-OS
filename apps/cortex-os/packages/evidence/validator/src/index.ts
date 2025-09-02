/**
 * Evidence Validator for Cortex OS
 *
 * This module provides tools for validating security and compliance evidence.
 */

import { z } from "zod";

const EvidenceSchema = z.object({
	type: z.string().min(1),
	data: z.unknown(),
	metadata: z
		.object({
			timestamp: z.date(),
			source: z.string().min(1),
		})
		.catchall(z.unknown()),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export interface ValidationResult {
	valid: boolean;
	errors?: string[];
	warnings?: string[];
}

/**
 * Validates evidence data against schema and integrity requirements
 * @param evidence The evidence to validate
 * @returns Validation result with status and any errors
 */
export function validateEvidence(evidence: unknown): ValidationResult {
	const result = EvidenceSchema.safeParse(evidence);
	if (!result.success) {
		return {
			valid: false,
			errors: result.error.errors.map((e) => e.message),
		};
	}
	return { valid: true };
}
