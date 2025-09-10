/**
 * Security validators for GitHub URLs and commit SHAs
 * Strengthens validation patterns to prevent injection attacks
 */

import { URL } from 'node:url';
import type { ValidationResult } from '../types/github-api-types.js';

/**
 * Validates GitHub repository URLs with strict security patterns
 * Prevents directory traversal, injection attacks, and validates format
 */
export const validateGitHubUrl = (url: string): ValidationResult => {
	// Length validation - prevent extremely long URLs
	if (url.length > 200) {
		return {
			valid: false,
			error: 'URL exceeds maximum length (200 characters)',
		};
	}

	// Basic format validation
	if (typeof url !== 'string' || url.trim() !== url) {
		return { valid: false, error: 'URL must be a trimmed string' };
	}

	// Protocol and domain validation
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return { valid: false, error: 'Malformed URL structure' };
	}

	if (parsed.protocol !== 'https:') {
		return { valid: false, error: 'Only HTTPS protocol is allowed' };
	}

	if (parsed.hostname !== 'github.com') {
		return { valid: false, error: 'Only github.com domain is allowed' };
	}

	// Path validation with strict GitHub repository pattern
	// Format: /owner/repo (where owner and repo follow GitHub naming rules)
	const pathPattern =
		/^\/[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9]([a-zA-Z0-9._-]{0,98}[a-zA-Z0-9])?$/;

	if (!pathPattern.test(parsed.pathname)) {
		return { valid: false, error: 'Invalid repository path format' };
	}

	// Directory traversal protection
	if (
		url.includes('..') ||
		url.includes('//github.com/') ||
		url.includes('%2e%2e')
	) {
		return { valid: false, error: 'Potential directory traversal detected' };
	}

	// Query parameter validation - only allow safe parameters
	const allowedParams = ['tab', 'ref', 'path'];
	for (const [key] of parsed.searchParams) {
		if (!allowedParams.includes(key)) {
			return {
				valid: false,
				error: `Unsafe query parameter detected: ${key}`,
				warnings: [`Only ${allowedParams.join(', ')} parameters are allowed`],
			};
		}
	}

	// Fragment validation - prevent potential XSS
	if (parsed.hash && parsed.hash.length > 100) {
		return { valid: false, error: 'URL fragment too long' };
	}

	return { valid: true };
};

/**
 * Validates Git commit SHA format
 * Ensures SHA follows exact 40-character hexadecimal format
 */
export const validateCommitSha = (sha: string): ValidationResult => {
	if (typeof sha !== 'string') {
		return { valid: false, error: 'SHA must be a string' };
	}

	const shaPattern = /^[a-fA-F0-9]{40}$/;

	if (!shaPattern.test(sha)) {
		return {
			valid: false,
			error: 'Invalid SHA format - must be exactly 40 hexadecimal characters',
		};
	}

	return { valid: true };
};

/**
 * Validates branch names according to Git naming rules
 * Prevents injection through branch name manipulation
 */
export const validateBranchName = (branch: string): ValidationResult => {
	if (typeof branch !== 'string' || branch.length === 0) {
		return { valid: false, error: 'Branch name must be a non-empty string' };
	}

	if (branch.length > 255) {
		return { valid: false, error: 'Branch name too long (max 255 characters)' };
	}

	// Git branch naming rules
	const invalidPatterns = [
		/^\./, // Cannot start with dot
		/\.$/, // Cannot end with dot
		/\.\./, // Cannot contain consecutive dots
		/[~^:\\?*[]/, // Special characters
		/\/$/, // Cannot end with slash
		/\/\//, // Cannot contain consecutive slashes
		/@{/, // Reference syntax
		/^@$/, // Just @ symbol
		/\.lock$/, // Cannot end with .lock
	];

	for (const pattern of invalidPatterns) {
		if (pattern.test(branch)) {
			return {
				valid: false,
				error: 'Branch name contains invalid characters or patterns',
			};
		}
	}

	return { valid: true };
};

/**
 * Validates file paths for security issues
 * Prevents path traversal and ensures safe file operations
 */
export const validateFilePath = (path: string): ValidationResult => {
	if (typeof path !== 'string') {
		return { valid: false, error: 'Path must be a string' };
	}

	if (path.length > 1000) {
		return { valid: false, error: 'Path too long (max 1000 characters)' };
	}

	// Path traversal protection
	if (path.includes('..') || path.includes('//') || path.includes('\\')) {
		return { valid: false, error: 'Potential path traversal detected' };
	}

	// Null byte injection protection
	if (path.includes('\0')) {
		return { valid: false, error: 'Null byte injection detected' };
	}

	// Control character protection without using control-char regex
	for (let i = 0; i < path.length; i++) {
		const code = path.charCodeAt(i);
		if ((code >= 0 && code <= 31) || code === 127) {
			return { valid: false, error: 'Control characters not allowed in paths' };
		}
	}

	return { valid: true };
};

/**
 * Validates user input for command processing
 * Sanitizes and validates user commands to prevent injection
 */
export const validateUserCommand = (command: string): ValidationResult => {
	if (typeof command !== 'string') {
		return { valid: false, error: 'Command must be a string' };
	}

	if (command.length > 500) {
		return { valid: false, error: 'Command too long (max 500 characters)' };
	}

	// Basic command injection protection
	const dangerousPatterns = [
		/[;&|`$(){}[\]]/, // Shell metacharacters
		/\$\{/, // Variable expansion
		/`/, // Command substitution
		/\$\(/, // Command substitution
		/<script/i, // Script tags
		/javascript:/i, // JavaScript URLs
		/on\w+\s*=/i, // Event handlers
	];

	for (const pattern of dangerousPatterns) {
		if (pattern.test(command)) {
			return {
				valid: false,
				error: 'Potentially dangerous command patterns detected',
			};
		}
	}

	return { valid: true };
};
