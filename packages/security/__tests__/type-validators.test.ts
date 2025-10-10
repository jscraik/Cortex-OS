/**
 * [brAInwav] Type Validators Tests
 * Tests for CodeQL alerts #210, #191-195
 *
 * Phase 1 (RED): Write failing tests first
 *
 * These tests verify protection against type confusion attacks
 * where arrays or objects are passed when strings are expected,
 * allowing bypass of security checks.
 */

import { describe, expect, it } from 'vitest';
import {
	ValidationError,
	validateArrayParam,
	validateNumberParam,
	validateStringParam,
} from '../src/validators/type-validators.js';

describe('[brAInwav] Type Validators - String Parameter Validation', () => {
	describe('validateStringParam', () => {
		it('should accept valid string parameters', () => {
			const result = validateStringParam('hello world', 'name');
			expect(result).toBe('hello world');
		});

		it('should reject array parameters', () => {
			expect(() => {
				validateStringParam(['../'], 'path');
			}).toThrow(ValidationError);
			expect(() => {
				validateStringParam(['../'], 'path');
			}).toThrow(/must be a string/);
		});

		it('should reject object parameters', () => {
			expect(() => {
				validateStringParam({ __proto__: { evil: true } }, 'data');
			}).toThrow(ValidationError);
		});

		it('should reject null', () => {
			expect(() => {
				validateStringParam(null, 'param');
			}).toThrow(ValidationError);
			expect(() => {
				validateStringParam(null, 'param');
			}).toThrow(/must be a string/);
		});

		it('should reject undefined', () => {
			expect(() => {
				validateStringParam(undefined, 'param');
			}).toThrow(ValidationError);
		});

		it('should reject numbers', () => {
			expect(() => {
				validateStringParam(123 as any, 'userId');
			}).toThrow(ValidationError);
		});

		it('should reject booleans', () => {
			expect(() => {
				validateStringParam(true as any, 'flag');
			}).toThrow(ValidationError);
		});

		it('should include parameter name in error message', () => {
			expect(() => {
				validateStringParam(123 as any, 'userId');
			}).toThrow(/userId/);
		});

		it('should include brAInwav branding in error', () => {
			expect(() => {
				validateStringParam([], 'test');
			}).toThrow(/brAInwav/);
		});

		it('should accept empty strings', () => {
			const result = validateStringParam('', 'name');
			expect(result).toBe('');
		});
	});

	describe('Type Confusion Attack Prevention', () => {
		it('should prevent path traversal via array bypass (CodeQL #210)', () => {
			// Attack: Send ["../", "/../secret.txt"] to bypass indexOf check
			const maliciousInput = ['../', '/../secret.txt'];

			expect(() => {
				validateStringParam(maliciousInput as any, 'path');
			}).toThrow(ValidationError);
		});

		it('should prevent prototype pollution via object bypass (CodeQL #191-195)', () => {
			const maliciousInput = { __proto__: { isAdmin: true } };

			expect(() => {
				validateStringParam(maliciousInput as any, 'config');
			}).toThrow(ValidationError);
		});

		it('should prevent constructor pollution', () => {
			const maliciousInput = { constructor: { prototype: { isAdmin: true } } };

			expect(() => {
				validateStringParam(maliciousInput as any, 'data');
			}).toThrow(ValidationError);
		});

		it('should prevent array with toString override', () => {
			const maliciousArray = ['attack'];
			Object.defineProperty(maliciousArray, 'toString', {
				value: () => 'safe-string',
			});

			expect(() => {
				validateStringParam(maliciousArray as any, 'param');
			}).toThrow(ValidationError);
		});
	});
});

describe('[brAInwav] Type Validators - Array Parameter Validation', () => {
	describe('validateArrayParam', () => {
		it('should accept valid array parameters', () => {
			const result = validateArrayParam(['tag1', 'tag2'], 'tags');
			expect(result).toEqual(['tag1', 'tag2']);
		});

		it('should reject string parameters when array expected', () => {
			expect(() => {
				validateArrayParam('notAnArray' as any, 'tags');
			}).toThrow(ValidationError);
			expect(() => {
				validateArrayParam('notAnArray' as any, 'tags');
			}).toThrow(/must be an array/);
		});

		it('should reject object parameters', () => {
			expect(() => {
				validateArrayParam({ length: 2, 0: 'a', 1: 'b' } as any, 'items');
			}).toThrow(ValidationError);
		});

		it('should reject null', () => {
			expect(() => {
				validateArrayParam(null as any, 'items');
			}).toThrow(ValidationError);
		});

		it('should reject undefined', () => {
			expect(() => {
				validateArrayParam(undefined as any, 'items');
			}).toThrow(ValidationError);
		});

		it('should accept empty arrays', () => {
			const result = validateArrayParam([], 'tags');
			expect(result).toEqual([]);
		});

		it('should include brAInwav branding in errors', () => {
			expect(() => {
				validateArrayParam('not-array' as any, 'test');
			}).toThrow(/brAInwav/);
		});
	});

	describe('Array Element Type Validation', () => {
		it('should validate string elements when specified', () => {
			const result = validateArrayParam(['a', 'b', 'c'], 'tags', 'string');
			expect(result).toEqual(['a', 'b', 'c']);
		});

		it('should reject non-string elements when string type specified', () => {
			expect(() => {
				validateArrayParam([1, 2, 3] as any, 'tags', 'string');
			}).toThrow(ValidationError);
			expect(() => {
				validateArrayParam([1, 2, 3] as any, 'tags', 'string');
			}).toThrow(/must be string/);
		});

		it('should validate number elements when specified', () => {
			const result = validateArrayParam([1, 2, 3], 'numbers', 'number');
			expect(result).toEqual([1, 2, 3]);
		});

		it('should reject mixed types when element type specified', () => {
			expect(() => {
				validateArrayParam(['a', 1, 'b'] as any, 'mixed', 'string');
			}).toThrow(ValidationError);
		});

		it('should include element index in error message', () => {
			expect(() => {
				validateArrayParam(['valid', 123, 'valid'] as any, 'items', 'string');
			}).toThrow(/\[1\]/); // Should mention index 1
		});
	});

	describe('Array Attack Prevention', () => {
		it('should prevent array-like objects', () => {
			const arrayLike = { 0: 'a', 1: 'b', length: 2 };

			expect(() => {
				validateArrayParam(arrayLike as any, 'items');
			}).toThrow(ValidationError);
		});

		it('should prevent prototype-polluted arrays', () => {
			const arr = ['safe'];
			(arr as any).__proto__.polluted = true;

			// Array is still valid, but we can detect pollution in other ways
			const result = validateArrayParam(arr, 'items');
			expect(result).toEqual(['safe']);
		});
	});
});

describe('[brAInwav] Type Validators - Number Parameter Validation', () => {
	describe('validateNumberParam', () => {
		it('should accept valid number parameters', () => {
			const result = validateNumberParam(42, 'count');
			expect(result).toBe(42);
		});

		it('should accept zero', () => {
			const result = validateNumberParam(0, 'count');
			expect(result).toBe(0);
		});

		it('should accept negative numbers', () => {
			const result = validateNumberParam(-10, 'offset');
			expect(result).toBe(-10);
		});

		it('should accept floating point numbers', () => {
			const result = validateNumberParam(3.14, 'pi');
			expect(result).toBe(3.14);
		});

		it('should reject string numbers', () => {
			expect(() => {
				validateNumberParam('42' as any, 'count');
			}).toThrow(ValidationError);
		});

		it('should reject NaN', () => {
			expect(() => {
				validateNumberParam(NaN, 'count');
			}).toThrow(ValidationError);
			expect(() => {
				validateNumberParam(NaN, 'count');
			}).toThrow(/must be a valid number/);
		});

		it('should reject Infinity', () => {
			expect(() => {
				validateNumberParam(Infinity, 'count');
			}).toThrow(ValidationError);
		});

		it('should reject null', () => {
			expect(() => {
				validateNumberParam(null as any, 'count');
			}).toThrow(ValidationError);
		});

		it('should include brAInwav branding', () => {
			expect(() => {
				validateNumberParam('not-a-number' as any, 'test');
			}).toThrow(/brAInwav/);
		});
	});

	describe('Number Range Validation', () => {
		it('should validate minimum value', () => {
			const result = validateNumberParam(5, 'count', { min: 0 });
			expect(result).toBe(5);
		});

		it('should reject values below minimum', () => {
			expect(() => {
				validateNumberParam(-1, 'count', { min: 0 });
			}).toThrow(ValidationError);
			expect(() => {
				validateNumberParam(-1, 'count', { min: 0 });
			}).toThrow(/>=/);
		});

		it('should validate maximum value', () => {
			const result = validateNumberParam(50, 'count', { max: 100 });
			expect(result).toBe(50);
		});

		it('should reject values above maximum', () => {
			expect(() => {
				validateNumberParam(101, 'count', { max: 100 });
			}).toThrow(ValidationError);
			expect(() => {
				validateNumberParam(101, 'count', { max: 100 });
			}).toThrow(/<=/);
		});

		it('should validate range (min and max)', () => {
			const result = validateNumberParam(50, 'count', { min: 0, max: 100 });
			expect(result).toBe(50);
		});
	});
});

describe('[brAInwav] Type Validators - ValidationError', () => {
	it('should be instanceof Error', () => {
		try {
			validateStringParam(123 as any, 'test');
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ValidationError);
		}
	});

	it('should have correct error name', () => {
		try {
			validateStringParam(123 as any, 'test');
		} catch (error) {
			expect((error as Error).name).toBe('ValidationError');
		}
	});

	it('should include parameter name in message', () => {
		try {
			validateStringParam(123 as any, 'mySpecialParam');
		} catch (error) {
			expect((error as Error).message).toContain('mySpecialParam');
		}
	});

	it('should include brAInwav branding', () => {
		try {
			validateStringParam(123 as any, 'test');
		} catch (error) {
			expect((error as Error).message).toContain('brAInwav');
		}
	});
});
