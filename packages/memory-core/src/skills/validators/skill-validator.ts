/**
 * brAInwav Skill Schema Validator
 * Validates skills against Zod schemas with detailed error reporting
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/validators/skill-validator
 */

import type { ZodError } from 'zod';
import {
	skillFrontmatterSchema,
	skillMetadataSchema,
	skillSchema,
} from '@cortex-os/contracts/skill-events';
import type { Skill, SkillMetadata } from '../types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Validation error details
 */
export interface ValidationError {
	/** Error message */
	message: string;
	/** Field path where error occurred */
	path: string[];
	/** Error code for programmatic handling */
	code: string;
}

/**
 * Validation result with typed data
 */
export interface ValidationResult<T = unknown> {
	/** Whether validation passed */
	valid: boolean;
	/** Validated data (only present if valid) */
	data?: T;
	/** Array of validation errors */
	errors: ValidationError[];
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Convert Zod error to standardized validation errors
 */
function formatZodErrors(error: ZodError): ValidationError[] {
	return error.errors.map((err) => ({
		message: err.message,
		path: err.path.map(String),
		code: err.code,
	}));
}

// ============================================================================
// Metadata Validation
// ============================================================================

/**
 * Validate skill metadata against schema
 *
 * @param metadata - Metadata object to validate
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateSkillMetadata(metadata);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateSkillMetadata(
	metadata: unknown,
): ValidationResult<SkillMetadata> {
	const parseResult = skillMetadataSchema.safeParse(metadata);

	if (parseResult.success) {
		return {
			valid: true,
			data: parseResult.data,
			errors: [],
		};
	}

	return {
		valid: false,
		errors: formatZodErrors(parseResult.error),
	};
}

// ============================================================================
// Full Skill Validation
// ============================================================================

/**
 * Validate complete skill against schema
 *
 * Performs comprehensive validation of all skill fields including:
 * - ID format and uniqueness requirements
 * - Name and description length constraints
 * - Content size limits
 * - Metadata validation
 * - Optional field validation (examples, warnings, etc.)
 *
 * @param skill - Skill object to validate
 * @returns Validation result with detailed errors
 *
 * @example
 * ```typescript
 * const result = validateSkill(skill);
 * if (result.valid) {
 *   // Safe to use result.data
 *   registerSkill(result.data);
 * } else {
 *   // Handle errors
 *   result.errors.forEach(err => {
 *     console.error(`${err.path.join('.')}: ${err.message}`);
 *   });
 * }
 * ```
 */
export function validateSkill(skill: unknown): ValidationResult<Skill> {
	const parseResult = skillSchema.safeParse(skill);

	if (parseResult.success) {
		return {
			valid: true,
			data: parseResult.data as Skill,
			errors: [],
		};
	}

	return {
		valid: false,
		errors: formatZodErrors(parseResult.error),
	};
}

// ============================================================================
// Frontmatter Validation
// ============================================================================

/**
 * Validate skill frontmatter from YAML
 *
 * Used during skill file parsing to validate YAML frontmatter
 * before combining with content.
 *
 * @param frontmatter - Parsed frontmatter object
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const frontmatter = parseYaml(yamlContent);
 * const result = validateSkillFrontmatter(frontmatter);
 * if (!result.valid) {
 *   throw new SkillValidationError(result.errors);
 * }
 * ```
 */
export function validateSkillFrontmatter(
	frontmatter: unknown,
): ValidationResult {
	const parseResult = skillFrontmatterSchema.safeParse(frontmatter);

	if (parseResult.success) {
		return {
			valid: true,
			data: parseResult.data,
			errors: [],
		};
	}

	return {
		valid: false,
		errors: formatZodErrors(parseResult.error),
	};
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate multiple skills efficiently
 *
 * @param skills - Array of skills to validate
 * @returns Array of validation results
 *
 * @example
 * ```typescript
 * const results = validateSkillsBatch(skills);
 * const invalid = results.filter(r => !r.valid);
 * if (invalid.length > 0) {
 *   console.error(`${invalid.length} invalid skills found`);
 * }
 * ```
 */
export function validateSkillsBatch(
	skills: unknown[],
): ValidationResult<Skill>[] {
	return skills.map((skill) => validateSkill(skill));
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if validation result indicates success
 */
export function isValidationSuccess<T>(
	result: ValidationResult<T>,
): result is ValidationResult<T> & { valid: true; data: T } {
	return result.valid && result.data !== undefined;
}

/**
 * Extract validated data or throw error
 *
 * @throws {Error} If validation failed
 */
export function assertValidSkill(skill: unknown): Skill {
	const result = validateSkill(skill);
	if (!isValidationSuccess(result)) {
		const errorMessages = result.errors
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('\n');
		throw new Error(
			`brAInwav Skill validation failed:\n${errorMessages}`,
		);
	}
	return result.data;
}
