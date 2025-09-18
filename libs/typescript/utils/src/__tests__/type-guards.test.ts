/**
 * @fileoverview Comprehensive tests for type guards
 * Following TDD principles with edge cases and error conditions
 */

import { describe, expect, it } from 'vitest';
import type { ProposalShape } from '../type-guards.js';
import {
	hasProperties,
	isBoolean,
	isError,
	isNumber,
	isProposalShape,
	isRecord,
	isString,
	safeValidate,
} from '../type-guards.js';

describe('Type Guards', () => {
	describe('isRecord', () => {
		it('should return true for plain objects', () => {
			expect(isRecord({})).toBe(true);
			expect(isRecord({ key: 'value' })).toBe(true);
			expect(isRecord({ nested: { object: true } })).toBe(true);
		});

		it('should return false for non-objects', () => {
			expect(isRecord(null)).toBe(false);
			expect(isRecord(undefined)).toBe(false);
			expect(isRecord('string')).toBe(false);
			expect(isRecord(42)).toBe(false);
			expect(isRecord(true)).toBe(false);
		});

		it('should return false for arrays', () => {
			expect(isRecord([])).toBe(false);
			expect(isRecord([1, 2, 3])).toBe(false);
		});

		it('should return false for class instances', () => {
			class TestClass {}
			expect(isRecord(new TestClass())).toBe(false);
			expect(isRecord(new Date())).toBe(false);
			expect(isRecord(new Error())).toBe(false);
		});
	});

	describe('hasProperties', () => {
		it('should return true when all properties exist', () => {
			const obj = { name: 'test', age: 25, active: true };
			expect(hasProperties(obj, ['name', 'age'])).toBe(true);
			expect(hasProperties(obj, ['name'])).toBe(true);
		});

		it('should return false when properties are missing', () => {
			const obj = { name: 'test' };
			expect(hasProperties(obj, ['name', 'age'])).toBe(false);
			expect(hasProperties(obj, ['missing'])).toBe(false);
		});

		it('should return false when properties are undefined', () => {
			const obj = { name: 'test', age: undefined };
			expect(hasProperties(obj, ['name', 'age'])).toBe(false);
		});

		it('should return false for non-objects', () => {
			expect(hasProperties('string', ['length'])).toBe(false);
			expect(hasProperties(null, [])).toBe(false);
		});
	});

	describe('isProposalShape', () => {
		it('should return true for valid proposal shapes', () => {
			expect(isProposalShape({})).toBe(true);
			expect(isProposalShape({ dataClass: 'sensitive' })).toBe(true);
			expect(isProposalShape({ path: '/some/path' })).toBe(true);
			expect(isProposalShape({ dataClass: 'public', path: '/path' })).toBe(true);
		});

		it('should return false for invalid dataClass types', () => {
			expect(isProposalShape({ dataClass: 123 })).toBe(false);
			expect(isProposalShape({ dataClass: null })).toBe(false);
			expect(isProposalShape({ dataClass: [] })).toBe(false);
		});

		it('should return false for invalid path types', () => {
			expect(isProposalShape({ path: 123 })).toBe(false);
			expect(isProposalShape({ path: null })).toBe(false);
			expect(isProposalShape({ path: {} })).toBe(false);
		});

		it('should return false for non-objects', () => {
			expect(isProposalShape(null)).toBe(false);
			expect(isProposalShape('string')).toBe(false);
			expect(isProposalShape([])).toBe(false);
		});
	});

	describe('primitive type guards', () => {
		describe('isError', () => {
			it('should return true for Error instances', () => {
				expect(isError(new Error('test'))).toBe(true);
				expect(isError(new TypeError('test'))).toBe(true);
				expect(isError(new RangeError('test'))).toBe(true);
			});

			it('should return false for non-Error values', () => {
				expect(isError('error')).toBe(false);
				expect(isError({ message: 'error' })).toBe(false);
				expect(isError(null)).toBe(false);
			});
		});

		describe('isString', () => {
			it('should return true for strings', () => {
				expect(isString('test')).toBe(true);
				expect(isString('')).toBe(true);
				expect(isString(String(123))).toBe(true);
			});

			it('should return false for non-strings', () => {
				expect(isString(123)).toBe(false);
				expect(isString(null)).toBe(false);
				expect(isString({})).toBe(false);
			});
		});

		describe('isNumber', () => {
			it('should return true for valid numbers', () => {
				expect(isNumber(0)).toBe(true);
				expect(isNumber(42)).toBe(true);
				expect(isNumber(-42)).toBe(true);
				expect(isNumber(3.14)).toBe(true);
			});

			it('should return false for NaN', () => {
				expect(isNumber(NaN)).toBe(false);
			});

			it('should return false for non-numbers', () => {
				expect(isNumber('42')).toBe(false);
				expect(isNumber(null)).toBe(false);
				expect(isNumber({})).toBe(false);
			});
		});

		describe('isBoolean', () => {
			it('should return true for booleans', () => {
				expect(isBoolean(true)).toBe(true);
				expect(isBoolean(false)).toBe(true);
			});

			it('should return false for non-booleans', () => {
				expect(isBoolean(0)).toBe(false);
				expect(isBoolean(1)).toBe(false);
				expect(isBoolean('true')).toBe(false);
			});
		});
	});

	describe('safeValidate', () => {
		it('should return success result for valid data', () => {
			const result = safeValidate('test', isString, 'Expected string');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toBe('test');
			}
		});

		it('should return error result for invalid data', () => {
			const result = safeValidate(123, isString, 'Expected string');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Expected string: received number');
			}
		});

		it('should handle complex objects', () => {
			const proposal = { dataClass: 'sensitive', path: '/test' };
			const result = safeValidate(proposal, isProposalShape, 'Invalid proposal');
			expect(result.success).toBe(true);
		});

		it('should provide detailed error messages', () => {
			const result = safeValidate(null, isProposalShape, 'Invalid proposal');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain('Invalid proposal');
				expect(result.error).toContain('object');
			}
		});
	});

	describe('Type safety integration', () => {
		it('should work with TypeScript type narrowing', () => {
			const value: unknown = { dataClass: 'sensitive', path: '/test' };

			if (isProposalShape(value)) {
				const proposal: ProposalShape = value;
				expect(typeof proposal.dataClass).toBe('string');
				expect(typeof proposal.path).toBe('string');
			}
		});

		it('should handle edge cases in production scenarios', () => {
			// Simulate real-world usage scenarios
			const proposals: unknown[] = [
				{ dataClass: 'sensitive' },
				{ path: '/usr/local' },
				'invalid',
				null,
				{ dataClass: 123 },
				{ extra: 'property', dataClass: 'public' },
			];

			const validProposals = proposals.filter(isProposalShape);
			expect(validProposals).toHaveLength(3);
		});
	});
});
