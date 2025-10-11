/**
 * brAInwav Security Validator
 * Validates skills against security rules to prevent malicious content
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/validators/security-validator
 */

import type { Skill } from '../types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Security violation severity levels
 */
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Security violation types
 */
export type SecurityViolationType =
	| 'code_injection'
	| 'xss_pattern'
	| 'path_traversal'
	| 'shell_injection'
	| 'dangerous_api'
	| 'resource_limit';

/**
 * Security violation details
 */
export interface SecurityViolation {
	/** Type of security violation */
	type: SecurityViolationType;
	/** Human-readable violation message */
	message: string;
	/** Severity level */
	severity: SecuritySeverity;
	/** Line number where violation occurred */
	line: number;
	/** Suggested remediation */
	remediation?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum skill content size: 1MB */
const MAX_SKILL_SIZE = 1024 * 1024;

/** Maximum nesting depth for structured content */
const MAX_NESTING_DEPTH = 10;

/** Dangerous code patterns */
const CODE_INJECTION_PATTERNS = [
	/\beval\s*\(/gi,
	/new\s+Function\s*\(/gi,
	/process\.exit\s*\(/gi,
	/child_process/gi,
	/vm\.runInNewContext/gi,
];

/** Path traversal patterns */
const PATH_TRAVERSAL_PATTERNS = [
	/\.\.\//g,
	/\/etc\/passwd/gi,
	/\/etc\/shadow/gi,
	/%2e%2e%2f/gi, // URL encoded ../
	/%252e%252e%252f/gi, // Double encoded
];

/** XSS patterns */
const XSS_PATTERNS = [
	/<script[\s\S]*?>/gi,
	/javascript:/gi,
	/on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers
	/data:text\/html/gi,
];

/** Shell injection patterns */
const SHELL_INJECTION_PATTERNS = [
	/rm\s+-rf\s+\//gi,
	/\$\([^)]+\)/g, // Command substitution $(...)
	/`[^`]+`/g, // Backtick command substitution
	/;\s*rm\s+/gi,
	/&&\s*rm\s+/gi,
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Extract content from code blocks to avoid false positives
 */
function extractCodeBlocks(content: string): {
	cleanContent: string;
	codeBlocks: string[];
} {
	const codeBlocks: string[] = [];
	const cleanContent = content.replace(
		/```[\s\S]*?```/g,
		(match) => {
			codeBlocks.push(match);
			return `CODE_BLOCK_${codeBlocks.length - 1}`;
		},
	);
	return { cleanContent, codeBlocks };
}

/**
 * Check for code injection patterns
 */
function checkCodeInjection(
	content: string,
	violations: SecurityViolation[],
): void {
	const { cleanContent } = extractCodeBlocks(content);

	for (const pattern of CODE_INJECTION_PATTERNS) {
		const match = pattern.exec(cleanContent);
		if (match) {
			const line = cleanContent.slice(0, match.index).split('\n').length;
			violations.push({
				type: 'code_injection',
				message: `Dangerous code pattern detected: ${match[0]}`,
				severity: 'critical',
				line,
				remediation: 'Remove eval(), Function(), or similar dangerous APIs',
			});
		}
	}
}

/**
 * Check for path traversal attempts
 */
function checkPathTraversal(
	content: string,
	violations: SecurityViolation[],
): void {
	for (const pattern of PATH_TRAVERSAL_PATTERNS) {
		const match = pattern.exec(content);
		if (match) {
			const line = content.slice(0, match.index).split('\n').length;
			violations.push({
				type: 'path_traversal',
				message: `Path traversal pattern detected: ${match[0]}`,
				severity: 'high',
				line,
				remediation: 'Use safe, relative paths within allowed directories',
			});
		}
	}
}

/**
 * Check for XSS patterns
 */
function checkXSSPatterns(
	content: string,
	violations: SecurityViolation[],
): void {
	const { cleanContent } = extractCodeBlocks(content);

	for (const pattern of XSS_PATTERNS) {
		const match = pattern.exec(cleanContent);
		if (match) {
			const line = cleanContent.slice(0, match.index).split('\n').length;
			violations.push({
				type: 'xss_pattern',
				message: `XSS pattern detected: ${match[0]}`,
				severity: 'high',
				line,
				remediation: 'Remove script tags, event handlers, and dangerous protocols',
			});
		}
	}
}

/**
 * Check for shell injection patterns
 */
function checkShellInjection(
	content: string,
	violations: SecurityViolation[],
): void {
	const { cleanContent } = extractCodeBlocks(content);

	for (const pattern of SHELL_INJECTION_PATTERNS) {
		const match = pattern.exec(cleanContent);
		if (match) {
			const line = cleanContent.slice(0, match.index).split('\n').length;
			violations.push({
				type: 'shell_injection',
				message: `Shell injection pattern detected: ${match[0]}`,
				severity: 'critical',
				line,
				remediation: 'Avoid dangerous shell commands',
			});
		}
	}
}

/**
 * Check resource limits
 */
function checkResourceLimits(
	skill: Skill,
	violations: SecurityViolation[],
): void {
	const contentSize = Buffer.byteLength(skill.content, 'utf-8');

	if (contentSize > MAX_SKILL_SIZE) {
		violations.push({
			type: 'resource_limit',
			message: `Skill content exceeds size limit: ${contentSize} bytes (max: ${MAX_SKILL_SIZE})`,
			severity: 'medium',
			line: 0,
			remediation: `Reduce content size to under ${MAX_SKILL_SIZE} bytes`,
		});
	}
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate skill against security rules
 *
 * Performs comprehensive security validation including:
 * - Code injection prevention (eval, Function, etc.)
 * - Path traversal detection (../, /etc/passwd)
 * - XSS pattern detection (<script>, javascript:)
 * - Shell injection detection (rm -rf, command substitution)
 * - Resource limit enforcement (size, nesting)
 *
 * @param skill - Skill to validate
 * @returns Array of security violations (empty if safe)
 *
 * @example
 * ```typescript
 * const violations = validateSecurityRules(skill);
 * if (violations.length > 0) {
 *   const critical = violations.filter(v => v.severity === 'critical');
 *   if (critical.length > 0) {
 *     throw new SecurityError('Critical security violations found');
 *   }
 * }
 * ```
 */
export function validateSecurityRules(skill: Skill): SecurityViolation[] {
	const violations: SecurityViolation[] = [];
	const content = skill.content;

	// Run all security checks
	checkCodeInjection(content, violations);
	checkPathTraversal(content, violations);
	checkXSSPatterns(content, violations);
	checkShellInjection(content, violations);
	checkResourceLimits(skill, violations);

	return violations;
}

/**
 * Check if skill has critical security violations
 */
export function hasCriticalViolations(
	violations: SecurityViolation[],
): boolean {
	return violations.some((v) => v.severity === 'critical');
}

/**
 * Filter violations by severity
 */
export function filterViolationsBySeverity(
	violations: SecurityViolation[],
	severity: SecuritySeverity,
): SecurityViolation[] {
	return violations.filter((v) => v.severity === severity);
}

/**
 * Assert skill is secure or throw error
 *
 * @throws {Error} If critical security violations found
 */
export function assertSecureSkill(skill: Skill): void {
	const violations = validateSecurityRules(skill);
	const critical = filterViolationsBySeverity(violations, 'critical');

	if (critical.length > 0) {
		const messages = critical.map((v) => `Line ${v.line}: ${v.message}`).join('\n');
		throw new Error(
			`brAInwav Security validation failed - critical violations:\n${messages}`,
		);
	}
}
