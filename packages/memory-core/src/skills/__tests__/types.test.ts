/**
 * brAInwav Skill Types Tests
 * Test type guards and utility type functions
 *
 * @version 1.0.0
 * @module @cortex-os/memory-core/skills/__tests__/types.test
 */

import { describe, expect, it } from 'vitest';
import {
	isSkillExecutionError,
	isSkillValidationError,
	isSkillValidationWarning,
	type SkillExecutionError,
	type SkillValidationError,
	type SkillValidationWarning,
} from '../types.js';

describe('brAInwav Skill Type Guards', () => {
	describe('isSkillValidationWarning', () => {
		it('should identify valid warning objects', () => {
			const warning: SkillValidationWarning = {
				field: 'examples',
				message: 'No examples provided',
				severity: 'warning',
			};

			expect(isSkillValidationWarning(warning)).toBe(true);
		});

		it('should identify valid info objects', () => {
			const info: SkillValidationWarning = {
				field: 'persuasiveFraming',
				message: 'Persuasive framing not provided',
				severity: 'info',
				suggestion: 'Consider adding authority element',
			};

			expect(isSkillValidationWarning(info)).toBe(true);
		});

		it('should reject non-warning objects', () => {
			const notWarning = {
				field: 'test',
				message: 'test',
				severity: 'error',
			};

			expect(isSkillValidationWarning(notWarning)).toBe(false);
		});

		it('should reject null and undefined', () => {
			expect(isSkillValidationWarning(null)).toBe(false);
			expect(isSkillValidationWarning(undefined)).toBe(false);
		});

		it('should reject primitives', () => {
			expect(isSkillValidationWarning('warning')).toBe(false);
			expect(isSkillValidationWarning(123)).toBe(false);
			expect(isSkillValidationWarning(true)).toBe(false);
		});

		it('should reject objects missing required fields', () => {
			const incomplete = {
				field: 'test',
				severity: 'warning',
			};

			expect(isSkillValidationWarning(incomplete)).toBe(false);
		});
	});

	describe('isSkillValidationError', () => {
		it('should identify valid error objects', () => {
			const error: SkillValidationError = {
				field: 'id',
				message: 'ID must start with "skill-"',
				code: 'INVALID_ID_FORMAT',
			};

			expect(isSkillValidationError(error)).toBe(true);
		});

		it('should identify errors with optional fields', () => {
			const error: SkillValidationError = {
				field: 'content',
				message: 'Content too short',
				code: 'CONTENT_LENGTH_MIN',
				value: 'short',
				constraint: 'min: 50',
			};

			expect(isSkillValidationError(error)).toBe(true);
		});

		it('should reject objects missing required fields', () => {
			const incomplete = {
				field: 'test',
				message: 'test',
			};

			expect(isSkillValidationError(incomplete)).toBe(false);
		});

		it('should reject null and undefined', () => {
			expect(isSkillValidationError(null)).toBe(false);
			expect(isSkillValidationError(undefined)).toBe(false);
		});

		it('should reject primitives', () => {
			expect(isSkillValidationError('error')).toBe(false);
			expect(isSkillValidationError(123)).toBe(false);
		});
	});

	describe('isSkillExecutionError', () => {
		it('should identify valid execution errors', () => {
			const error: SkillExecutionError = {
				code: 'EXECUTION_TIMEOUT',
				message: 'Skill execution timed out after 30s',
				recoverable: true,
				retryAfter: 5000,
			};

			expect(isSkillExecutionError(error)).toBe(true);
		});

		it('should identify non-recoverable errors', () => {
			const error: SkillExecutionError = {
				code: 'MISSING_TOOL',
				message: 'Required tool "vitest" not available',
				recoverable: false,
				details: {
					requiredTool: 'vitest',
					availableTools: ['typescript', 'eslint'],
				},
			};

			expect(isSkillExecutionError(error)).toBe(true);
		});

		it('should reject objects missing required fields', () => {
			const incomplete = {
				code: 'TEST',
				message: 'test',
			};

			expect(isSkillExecutionError(incomplete)).toBe(false);
		});

		it('should reject null and undefined', () => {
			expect(isSkillExecutionError(null)).toBe(false);
			expect(isSkillExecutionError(undefined)).toBe(false);
		});

		it('should reject primitives', () => {
			expect(isSkillExecutionError('error')).toBe(false);
			expect(isSkillExecutionError(false)).toBe(false);
		});

		it('should reject objects with wrong types', () => {
			const wrongType = {
				code: 'TEST',
				message: 'test',
				recoverable: 'yes',
			};

			expect(isSkillExecutionError(wrongType)).toBe(false);
		});
	});
});

describe('brAInwav Skill Type Exports', () => {
	it('should export contract types', async () => {
		const types = await import('../types.js');

		expect(types).toBeDefined();
		expect(types.isSkillValidationWarning).toBeDefined();
		expect(types.isSkillValidationError).toBeDefined();
		expect(types.isSkillExecutionError).toBeDefined();
	});
});
