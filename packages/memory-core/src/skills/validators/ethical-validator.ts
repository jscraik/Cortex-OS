/**
 * brAInwav Ethical Compliance Validator
 * Validates skills against brAInwav ethical AI guidelines
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/validators/ethical-validator
 */

import type { Skill } from '../types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Ethical violation severity levels
 */
export type EthicalSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Ethical violation types
 */
export type EthicalViolationType =
	| 'bias_language'
	| 'transparency'
	| 'safety'
	| 'accessibility'
	| 'branding';

/**
 * Ethical violation details
 */
export interface EthicalViolation {
	/** Type of ethical violation */
	type: EthicalViolationType;
	/** Human-readable violation message */
	message: string;
	/** Severity level */
	severity: EthicalSeverity;
	/** Suggested improvement */
	suggestion?: string;
	/** Field where violation occurred */
	field?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Gender-biased language patterns */
const GENDER_BIAS_PATTERNS = [
	{ pattern: /\b(he|his|him)\b(?!\s+or\s+she)/gi, suggestion: 'their' },
	{ pattern: /\b(she|her|hers)\b(?!\s+or\s+he)/gi, suggestion: 'their' },
	{ pattern: /\bmanpower\b/gi, suggestion: 'workforce' },
	{ pattern: /\bchairman\b/gi, suggestion: 'chairperson' },
];

/** Exclusionary terminology */
const EXCLUSIONARY_TERMS = [
	{
		pattern: /\b(whitelist|blacklist)\b/gi,
		suggestion: 'allowlist/denylist',
	},
	{ pattern: /\b(master|slave)\b/gi, suggestion: 'primary/replica' },
	{ pattern: /\bmanhole\b/gi, suggestion: 'maintenance hole' },
	{ pattern: /\bsanity\s+check\b/gi, suggestion: 'consistency check' },
];

/** Visual-only indicators */
const VISUAL_ONLY_PATTERNS = [
	{
		pattern: /\bclick\s+the\s+(red|green|blue)\b/gi,
		suggestion: 'identify elements by label or position',
	},
	{
		pattern: /\bsee\s+(above|below|the\s+diagram)/gi,
		suggestion: 'reference by section name or provide text alternative',
	},
];

/** Safety-concerning patterns */
const SAFETY_PATTERNS = [
	{ pattern: /\boverride.*safety\b/gi, severity: 'high' as const },
	{ pattern: /\bcollect.*user\s+data/gi, severity: 'medium' as const },
	{ pattern: /\bplain\s+text.*password/gi, severity: 'high' as const },
	{ pattern: /\bdisable.*consent/gi, severity: 'high' as const },
];

/** Vague description indicators */
const VAGUE_TERMS = ['stuff', 'things', 'something', 'somehow'];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check for bias language
 */
function checkBiasLanguage(
	content: string,
	violations: EthicalViolation[],
): void {
	// Check gender-biased language
	for (const { pattern, suggestion } of GENDER_BIAS_PATTERNS) {
		const match = pattern.exec(content);
		if (match) {
			violations.push({
				type: 'bias_language',
				message: `Gender-biased language detected: "${match[0]}"`,
				severity: 'medium',
				suggestion: `Use gender-neutral language like "${suggestion}"`,
			});
		}
	}

	// Check exclusionary terms
	for (const { pattern, suggestion } of EXCLUSIONARY_TERMS) {
		const match = pattern.exec(content);
		if (match) {
			violations.push({
				type: 'bias_language',
				message: `Potentially exclusionary term: "${match[0]}"`,
				severity: 'medium',
				suggestion: `Consider using "${suggestion}" instead`,
			});
		}
	}
}

/**
 * Check transparency requirements
 */
function checkTransparency(
	skill: Skill,
	violations: EthicalViolation[],
): void {
	// Check for vague descriptions
	const descLower = skill.description.toLowerCase();
	for (const term of VAGUE_TERMS) {
		if (descLower.includes(term)) {
			violations.push({
				type: 'transparency',
				message: 'Description contains vague language',
				severity: 'low',
				suggestion: 'Provide specific, clear description of skill purpose',
				field: 'description',
			});
		}
	}

	// Check success criteria clarity
	if (skill.successCriteria) {
		for (const criterion of skill.successCriteria) {
			if (criterion.length < 15) {
				violations.push({
					type: 'transparency',
					message: 'Success criterion is too vague or short',
					severity: 'low',
					suggestion: 'Provide clear, measurable success criteria',
					field: 'successCriteria',
				});
			}
		}
	}

	// Check examples have explanations
	if (skill.examples) {
		for (const example of skill.examples) {
			if (
				example.title.length < 5 ||
				example.input.length < 5 ||
				example.output.length < 5
			) {
				violations.push({
					type: 'transparency',
					message: 'Example lacks sufficient detail',
					severity: 'low',
					suggestion: 'Provide detailed, explanatory examples',
					field: 'examples',
				});
			}
		}
	}
}

/**
 * Check safety guidelines
 */
function checkSafety(content: string, violations: EthicalViolation[]): void {
	for (const { pattern, severity } of SAFETY_PATTERNS) {
		const match = pattern.exec(content);
		if (match) {
			let message = `Safety-concerning pattern: "${match[0]}"`;
			let suggestion = '';

			if (match[0].toLowerCase().includes('password')) {
				message = 'Insecure password handling detected';
				suggestion = 'Always hash and salt passwords, never store plain text';
			} else if (match[0].toLowerCase().includes('data')) {
				message = 'User data collection without clear consent';
				suggestion = 'Ensure explicit user consent before collecting data';
			} else if (match[0].toLowerCase().includes('safety')) {
				message = 'Safety check override detected';
				suggestion = 'Preserve safety checks unless absolutely necessary';
			}

			violations.push({
				type: 'safety',
				message,
				severity,
				suggestion,
			});
		}
	}
}

/**
 * Check accessibility requirements
 */
function checkAccessibility(
	content: string,
	violations: EthicalViolation[],
): void {
	for (const { pattern, suggestion } of VISUAL_ONLY_PATTERNS) {
		const match = pattern.exec(content);
		if (match) {
			violations.push({
				type: 'accessibility',
				message: `Visual-only instruction detected: "${match[0]}"`,
				severity: 'medium',
				suggestion,
			});
		}
	}
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate skill against brAInwav ethical guidelines
 *
 * Performs comprehensive ethical validation including:
 * - Bias language detection (gender, exclusionary terms)
 * - Transparency requirements (clear descriptions, criteria)
 * - Safety guidelines (consent, secure practices)
 * - Accessibility requirements (inclusive instructions)
 *
 * @param skill - Skill to validate
 * @returns Array of ethical violations (empty if compliant)
 *
 * @example
 * ```typescript
 * const violations = validateEthicalCompliance(skill);
 * if (violations.length > 0) {
 *   const high = violations.filter(v => v.severity === 'high');
 *   if (high.length > 0) {
 *     console.warn('High-severity ethical concerns:', high);
 *   }
 * }
 * ```
 */
export function validateEthicalCompliance(
	skill: Skill,
): EthicalViolation[] {
	const violations: EthicalViolation[] = [];
	const content = skill.content + ' ' + skill.description;

	// Run all ethical checks
	checkBiasLanguage(content, violations);
	checkTransparency(skill, violations);
	checkSafety(content, violations);
	checkAccessibility(content, violations);

	return violations;
}

/**
 * Check if skill has high-severity ethical violations
 */
export function hasHighSeverityViolations(
	violations: EthicalViolation[],
): boolean {
	return violations.some(
		(v) => v.severity === 'critical' || v.severity === 'high',
	);
}

/**
 * Filter violations by type
 */
export function filterViolationsByType(
	violations: EthicalViolation[],
	type: EthicalViolationType,
): EthicalViolation[] {
	return violations.filter((v) => v.type === type);
}

/**
 * Get all suggestions from violations
 */
export function extractSuggestions(
	violations: EthicalViolation[],
): string[] {
	return violations
		.map((v) => v.suggestion)
		.filter((s): s is string => s !== undefined);
}
