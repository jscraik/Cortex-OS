/**
 * Security tests for prototype pollution prevention in profile.ts
 */
import { describe, expect, it } from 'vitest';

// Test the logic that would be used in profile.ts
function safeSetNestedProperty(obj: any, path: string, value: any): void {
	const parts = path.split('.');

	// Navigate to the parent object
	let current: any = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		// Security: Check for prototype pollution attempts
		const key = parts[i];
		if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
			throw new Error('brAInwav: Prototype pollution attempt detected');
		}
		// Security: Use hasOwnProperty to prevent prototype chain traversal
		if (!Object.hasOwn(current, key)) {
			throw new Error(`brAInwav: Invalid path segment "${key}"`);
		}
		current = current[key];
	}

	// Set the value with prototype pollution protection
	const lastPart = parts[parts.length - 1];
	if (lastPart === '__proto__' || lastPart === 'constructor' || lastPart === 'prototype') {
		throw new Error('brAInwav: Prototype pollution attempt detected');
	}
	const numValue = parseFloat(value);
	current[lastPart] = Number.isNaN(numValue) ? value : numValue;
}

describe('brAInwav Prototype Pollution Prevention - profile', () => {
	it('should reject __proto__ in path segments', () => {
		const obj = { budgets: { nested: { value: 100 } } };
		const path = '__proto__.polluted';
		const value = 'malicious';

		expect(() => safeSetNestedProperty(obj, path, value)).toThrow(
			'brAInwav: Prototype pollution attempt detected',
		);
	});

	it('should reject constructor in path segments', () => {
		const obj = { budgets: { nested: { value: 100 } } };
		const path = 'constructor.prototype.polluted';
		const value = 'malicious';

		expect(() => safeSetNestedProperty(obj, path, value)).toThrow(
			'brAInwav: Prototype pollution attempt detected',
		);
	});

	it('should reject prototype in path segments', () => {
		const obj = { budgets: { nested: { value: 100 } } };
		const path = 'budgets.prototype.polluted';
		const value = 'malicious';

		expect(() => safeSetNestedProperty(obj, path, value)).toThrow(
			'brAInwav: Prototype pollution attempt detected',
		);
	});

	it('should reject __proto__ as final property', () => {
		const obj = { budgets: { nested: {} } };
		const path = 'budgets.nested.__proto__';
		const value = 'malicious';

		expect(() => safeSetNestedProperty(obj, path, value)).toThrow(
			'brAInwav: Prototype pollution attempt detected',
		);
	});

	it('should reject invalid path segments that do not exist', () => {
		const obj = { budgets: { nested: { value: 100 } } };
		const path = 'budgets.nonexistent.value';
		const value = '200';

		expect(() => safeSetNestedProperty(obj, path, value)).toThrow(
			'brAInwav: Invalid path segment "nonexistent"',
		);
	});

	it('should allow valid property assignments', () => {
		const obj = { budgets: { nested: { value: 100 } } };
		const path = 'budgets.nested.value';
		const value = '200';

		safeSetNestedProperty(obj, path, value);
		expect(obj.budgets.nested.value).toBe(200);
	});

	it('should handle string values correctly', () => {
		const obj = { budgets: { nested: { name: 'old' } } };
		const path = 'budgets.nested.name';
		const value = 'new';

		safeSetNestedProperty(obj, path, value);
		expect(obj.budgets.nested.name).toBe('new');
	});

	it('should convert numeric strings to numbers', () => {
		const obj = { budgets: { nested: { value: 0 } } };
		const path = 'budgets.nested.value';
		const value = '42.5';

		safeSetNestedProperty(obj, path, value);
		expect(obj.budgets.nested.value).toBe(42.5);
		expect(typeof obj.budgets.nested.value).toBe('number');
	});

	it('should not pollute Object prototype', () => {
		const obj = { budgets: { nested: { value: 100 } } };
		const maliciousPath = '__proto__.polluted';

		expect(() => safeSetNestedProperty(obj, maliciousPath, 'bad')).toThrow();

		// Verify Object prototype is not polluted
		const testObj = {};
		expect((testObj as any).polluted).toBeUndefined();
	});
});
