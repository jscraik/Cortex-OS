/**
 * @file lib/validation-utils.ts
 * @description Shared validation utilities for PRP workflow
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import type { Evidence } from '@cortex-os/kernel';

/**
 * Create a standardized validation result
 */
export const createValidationResult = (
	passed: boolean,
	blockers: string[],
	majors: string[],
	evidenceIds: string[],
	timestamp?: string,
) => ({
	passed,
	blockers,
	majors,
	evidence: evidenceIds,
	timestamp: timestamp || new Date().toISOString(),
});

/**
 * Check if a requirement matches certain keywords
 */
export const hasRequirement = (
	requirements: string[],
	keywords: string[],
): boolean => {
	return requirements.some((req) =>
		keywords.some((keyword) =>
			req.toLowerCase().includes(keyword.toLowerCase()),
		),
	);
};

/**
 * Create standardized evidence
 */
export const createEvidence = (
	id: string,
	type: Evidence['type'],
	source: string,
	content: string,
	phase: 'strategy' | 'build' | 'evaluation',
	timestamp?: string,
): Evidence => ({
	id,
	type,
	source,
	content,
	timestamp: timestamp || new Date().toISOString(),
	phase,
});
