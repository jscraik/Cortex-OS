/**
 * Utility Function Tests
 * Goal: Achieve 95% coverage on all utility functions
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	avgBy,
	calculateAge,
	calculateChecksum,
	camelToSnake,
	capitalize,
	comparePassword,
	countBy,
	debounce,
	deburr,
	decodeBase64,
	deepClone,
	encodeBase64,
	escapeRegex,
	flatMap,
	formatBytes,
	formatCurrency,
	formatDate,
	generateJWT,
	generateSecureToken,
	generateSlug,
	generateUUID,
	getDateRange,
	groupBy,
	hashPassword,
	interpolate,
	isArray,
	isBoolean,
	isDateValid,
	isEmpty,
	isFunction,
	isNil,
	isNumber,
	isObject,
	isString,
	isValidUUID,
	kebabCase,
	maxBy,
	mergeObjects,
	minBy,
	omitObject,
	padEnd,
	padStart,
	parseDate,
	parseNumber,
	parseUrl,
	partitionBy,
	pascalCase,
	pickObject,
	pluck,
	range,
	repeat,
	retry,
	roundToDecimal,
	sanitizeString,
	shuffleArray,
	snakeToCamel,
	sortBy,
	startCase,
	stripHtml,
	sumBy,
	swapCase,
	template,
	throttle,
	truncateText,
	uniqueArray,
	validateEmail,
	validatePassword,
	verifyJWT,
	zip,
	zipObject,
} from '../utils/index.ts';

describe('Utility Functions', () => {
	describe('Security Utilities', () => {
		describe('hashPassword', () => {
			it('should hash password with bcrypt', async () => {
				const password = 'testPassword123!';
				const hash = await hashPassword(password);

				expect(hash).toBeDefined();
				expect(hash).not.toBe(password);
				expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
			});

			it('should generate different hashes for same password', async () => {
				const password = 'testPassword123!';
				const hash1 = await hashPassword(password);
				const hash2 = await hashPassword(password);

				expect(hash1).not.toBe(hash2);
			});

			it('should handle empty password', async () => {
				const hash = await hashPassword('');
				expect(hash).toBeDefined();
			});

			it('should handle long passwords', async () => {
				const longPassword = 'a'.repeat(1000);
				const hash = await hashPassword(longPassword);
				expect(hash).toBeDefined();
			});
		});

		describe('comparePassword', () => {
			it('should verify correct password', async () => {
				const password = 'testPassword123!';
				const hash = await hashPassword(password);
				const isValid = await comparePassword(password, hash);

				expect(isValid).toBe(true);
			});

			it('should reject incorrect password', async () => {
				const password = 'testPassword123!';
				const wrongPassword = 'wrongPassword456!';
				const hash = await hashPassword(password);
				const isValid = await comparePassword(wrongPassword, hash);

				expect(isValid).toBe(false);
			});

			it('should handle empty password', async () => {
				const password = 'testPassword123!';
				const hash = await hashPassword(password);
				const isValid = await comparePassword('', hash);

				expect(isValid).toBe(false);
			});

			it('should reject invalid hash format', async () => {
				const password = 'testPassword123!';
				const invalidHash = 'invalid_hash_format';

				await expect(comparePassword(password, invalidHash)).rejects.toThrow();
			});
		});

		describe('generateJWT', () => {
			beforeEach(() => {
				vi.stubEnv('JWT_SECRET', 'test-secret-key-for-jwt-generation');
			});

			it('should generate valid JWT token', () => {
				const payload = { userId: '123', email: 'test@example.com' };
				const token = generateJWT(payload);

				expect(token).toBeDefined();
				expect(typeof token).toBe('string');
				expect(token.split('.')).toHaveLength(3); // header.payload.signature
			});

			it('should generate different tokens each time', () => {
				const payload = { userId: '123' };
				const token1 = generateJWT(payload);
				const token2 = generateJWT(payload);

				expect(token1).not.toBe(token2);
			});

			it('should include expiration in token', () => {
				const payload = { userId: '123' };
				const token = generateJWT(payload, { expiresIn: '1h' });

				const decoded = JSON.parse(atob(token.split('.')[1]));
				expect(decoded.exp).toBeDefined();
				expect(decoded.exp).toBeGreaterThan(decoded.iat);
			});

			it('should handle custom options', () => {
				const payload = { userId: '123' };
				const options = {
					issuer: 'test-issuer',
					audience: 'test-audience',
					expiresIn: '7d',
				};
				const token = generateJWT(payload, options);

				const decoded = JSON.parse(atob(token.split('.')[1]));
				expect(decoded.iss).toBe('test-issuer');
				expect(decoded.aud).toBe('test-audience');
			});
		});

		describe('verifyJWT', () => {
			beforeEach(() => {
				vi.stubEnv('JWT_SECRET', 'test-secret-key-for-jwt-generation');
			});

			it('should verify valid JWT token', () => {
				const payload = { userId: '123', email: 'test@example.com' };
				const token = generateJWT(payload);
				const decoded = verifyJWT(token);

				expect(decoded).toBeDefined();
				expect(decoded.userId).toBe('123');
				expect(decoded.email).toBe('test@example.com');
			});

			it('should reject expired token', () => {
				const payload = { userId: '123' };
				const token = generateJWT(payload, { expiresIn: '-1h' }); // Expired

				expect(() => verifyJWT(token)).toThrow('Token expired');
			});

			it('should reject invalid token format', () => {
				const invalidToken = 'invalid.token.format';

				expect(() => verifyJWT(invalidToken)).toThrow();
			});

			it('should reject token with wrong signature', () => {
				vi.stubEnv('JWT_SECRET', 'original-secret');
				const payload = { userId: '123' };
				const token = generateJWT(payload);

				vi.stubEnv('JWT_SECRET', 'different-secret');
				expect(() => verifyJWT(token)).toThrow('Invalid signature');
			});
		});

		describe('generateSecureToken', () => {
			it('should generate random token of specified length', () => {
				const token = generateSecureToken(32);
				expect(token).toHaveLength(32);
				expect(/^[a-zA-Z0-9]+$/.test(token)).toBe(true);
			});

			it('should generate different tokens each time', () => {
				const token1 = generateSecureToken(32);
				const token2 = generateSecureToken(32);
				expect(token1).not.toBe(token2);
			});

			it('should handle minimum length', () => {
				const token = generateSecureToken(1);
				expect(token).toHaveLength(1);
			});

			it('should handle large lengths', () => {
				const token = generateSecureToken(1024);
				expect(token).toHaveLength(1024);
			});

			it('should use URL-safe characters when specified', () => {
				const token = generateSecureToken(32, true);
				expect(/^[a-zA-Z0-9\-_]+$/.test(token)).toBe(true);
			});
		});
	});

	describe('Validation Utilities', () => {
		describe('sanitizeString', () => {
			it('should remove HTML tags', () => {
				const input = '<script>alert("xss")</script>Hello World';
				const output = sanitizeString(input);
				expect(output).toBe('Hello World');
			});

			it('should escape HTML entities', () => {
				const input = '<div>&lt;script&gt;</div>';
				const output = sanitizeString(input);
				expect(output).toBe('&lt;script&gt;');
			});

			it('should remove extra whitespace', () => {
				const input = 'Hello    World\n\n\tTest';
				const output = sanitizeString(input);
				expect(output).toBe('Hello World Test');
			});

			it('should handle empty string', () => {
				expect(sanitizeString('')).toBe('');
			});

			it('should handle null/undefined', () => {
				expect(sanitizeString(null as any)).toBe('');
				expect(sanitizeString(undefined as any)).toBe('');
			});
		});

		describe('validateEmail', () => {
			it('should validate correct email addresses', () => {
				expect(validateEmail('test@example.com')).toBe(true);
				expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
				expect(validateEmail('user123@test-domain.com')).toBe(true);
			});

			it('should reject invalid email addresses', () => {
				expect(validateEmail('invalid')).toBe(false);
				expect(validateEmail('@domain.com')).toBe(false);
				expect(validateEmail('user@')).toBe(false);
				expect(validateEmail('user..name@domain.com')).toBe(false);
				expect(validateEmail('user@domain..com')).toBe(false);
			});

			it('should handle edge cases', () => {
				expect(validateEmail('')).toBe(false);
				expect(validateEmail('a@b.c')).toBe(true); // Minimal valid email
				expect(validateEmail(`${'a'.repeat(64)}@${'b'.repeat(63)}.com`)).toBe(true); // Max lengths
			});
		});

		describe('validatePassword', () => {
			it('should validate strong passwords', () => {
				expect(validatePassword('StrongP@ssw0rd!')).toBe(true);
				expect(validatePassword('MySecure123!')).toBe(true);
				expect(validatePassword('Complex$Pass456')).toBe(true);
			});

			it('should reject weak passwords', () => {
				expect(validatePassword('password')).toBe(false); // No uppercase, number, special
				expect(validatePassword('PASSWORD')).toBe(false); // No lowercase, number, special
				expect(validatePassword('12345678')).toBe(false); // No letters, special
				expect(validatePassword('short')).toBe(false); // Too short
				expect(validatePassword('NoSpecialChar123')).toBe(false); // No special character
			});

			it('should handle custom requirements', () => {
				const options = { minLength: 12, requireUppercase: false };
				expect(validatePassword('lowercase123!', options)).toBe(true);
				expect(validatePassword('short1!', options)).toBe(false);
			});

			it('should handle empty password', () => {
				expect(validatePassword('')).toBe(false);
			});
		});
	});

	describe('Data Transformation Utilities', () => {
		describe('formatBytes', () => {
			it('should format bytes in different units', () => {
				expect(formatBytes(0)).toBe('0 Bytes');
				expect(formatBytes(1024)).toBe('1 KB');
				expect(formatBytes(1048576)).toBe('1 MB');
				expect(formatBytes(1073741824)).toBe('1 GB');
				expect(formatBytes(1099511627776)).toBe('1 TB');
			});

			it('should handle decimal values', () => {
				expect(formatBytes(1536)).toBe('1.5 KB');
				expect(formatBytes(2621440)).toBe('2.5 MB');
			});

			it('should use custom decimals', () => {
				expect(formatBytes(1536, 3)).toBe('1.500 KB');
			});
		});

		describe('parseUrl', () => {
			it('should parse valid URL', () => {
				const url = 'https://example.com:8080/path/to/page?query=value#section';
				const parsed = parseUrl(url);

				expect(parsed.protocol).toBe('https:');
				expect(parsed.hostname).toBe('example.com');
				expect(parsed.port).toBe('8080');
				expect(parsed.pathname).toBe('/path/to/page');
				expect(parsed.search).toBe('?query=value');
				expect(parsed.hash).toBe('#section');
			});

			it('should handle relative URLs', () => {
				const url = '/path/to/page?query=value';
				const parsed = parseUrl(url);

				expect(parsed.pathname).toBe('/path/to/page');
				expect(parsed.search).toBe('?query=value');
			});

			it('should handle invalid URL', () => {
				expect(() => parseUrl('not-a-valid-url')).toThrow();
			});
		});

		describe('generateSlug', () => {
			it('should convert text to slug format', () => {
				expect(generateSlug('Hello World')).toBe('hello-world');
				expect(generateSlug('This is a Test!')).toBe('this-is-a-test');
				expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
			});

			it('should handle special characters', () => {
				expect(generateSlug('Café au lait')).toBe('cafe-au-lait');
				expect(generateSlug('Привет мир')).toBe('privet-mir');
			});

			it('should handle empty string', () => {
				expect(generateSlug('')).toBe('');
			});

			it('should use custom separator', () => {
				expect(generateSlug('Hello World', '_')).toBe('hello_world');
			});
		});

		describe('truncateText', () => {
			it('should truncate long text', () => {
				expect(truncateText('This is a very long text', 10)).toBe('This is...');
				expect(truncateText('Short', 10)).toBe('Short');
			});

			it('should use custom suffix', () => {
				expect(truncateText('This is very long', 10, ' [more]')).toBe('This is [more]');
			});

			it('should preserve word boundaries', () => {
				expect(truncateText('This is a sentence', 12, '', true)).toBe('This is a');
			});
		});

		describe('camelToSnake', () => {
			it('should convert camelCase to snake_case', () => {
				expect(camelToSnake('camelCase')).toBe('camel_case');
				expect(camelToSnake('convertToSnake')).toBe('convert_to_snake');
				expect(camelToSnake('already_snake')).toBe('already_snake');
			});

			it('should handle acronyms', () => {
				expect(camelToSnake('HTTPRequest')).toBe('http_request');
				expect(camelToSnake('parseXMLData')).toBe('parse_xml_data');
			});
		});

		describe('snakeToCamel', () => {
			it('should convert snake_case to camelCase', () => {
				expect(snakeToCamel('snake_case')).toBe('snakeCase');
				expect(snakeToCamel('convert_to_camel')).toBe('convertToCamel');
			});

			it('should handle multiple underscores', () => {
				expect(snakeToCamel('__private_var__')).toBe('privateVar');
			});
		});
	});

	describe('Object Utilities', () => {
		describe('deepClone', () => {
			it('should clone primitive values', () => {
				expect(deepClone(42)).toBe(42);
				expect(deepClone('string')).toBe('string');
				expect(deepClone(true)).toBe(true);
			});

			it('should clone arrays', () => {
				const arr = [1, 2, { nested: true }];
				const cloned = deepClone(arr);
				expect(cloned).toEqual(arr);
				expect(cloned).not.toBe(arr);
				expect(cloned[2]).not.toBe(arr[2]);
			});

			it('should clone objects', () => {
				const obj = { a: 1, b: { nested: { value: 42 } } };
				const cloned = deepClone(obj);
				expect(cloned).toEqual(obj);
				expect(cloned).not.toBe(obj);
				expect(cloned.b).not.toBe(obj.b);
				expect(cloned.b.nested).not.toBe(obj.b.nested);
			});

			it('should handle circular references', () => {
				const obj: any = { a: 1 };
				obj.self = obj;
				const cloned = deepClone(obj);
				expect(cloned.a).toBe(1);
				expect(cloned.self).toBe(cloned);
			});
		});

		describe('mergeObjects', () => {
			it('should merge simple objects', () => {
				const obj1 = { a: 1, b: 2 };
				const obj2 = { b: 3, c: 4 };
				const merged = mergeObjects(obj1, obj2);
				expect(merged).toEqual({ a: 1, b: 3, c: 4 });
			});

			it('should deep merge nested objects', () => {
				const obj1 = { a: { b: 1, c: 2 } };
				const obj2 = { a: { c: 3, d: 4 } };
				const merged = mergeObjects(obj1, obj2);
				expect(merged).toEqual({ a: { b: 1, c: 3, d: 4 } });
			});

			it('should handle arrays', () => {
				const obj1 = { arr: [1, 2] };
				const obj2 = { arr: [3, 4] };
				const merged = mergeObjects(obj1, obj2);
				expect(merged.arr).toEqual([3, 4]);
			});
		});

		describe('pickObject', () => {
			it('should pick specified properties', () => {
				const obj = { a: 1, b: 2, c: 3, d: 4 };
				const picked = pickObject(obj, ['a', 'c']);
				expect(picked).toEqual({ a: 1, c: 3 });
			});

			it('should handle non-existent properties', () => {
				const obj = { a: 1 };
				const picked = pickObject(obj, ['a', 'b', 'c']);
				expect(picked).toEqual({ a: 1 });
			});
		});

		describe('omitObject', () => {
			it('should omit specified properties', () => {
				const obj = { a: 1, b: 2, c: 3, d: 4 };
				const omitted = omitObject(obj, ['b', 'd']);
				expect(omitted).toEqual({ a: 1, c: 3 });
			});
		});

		describe('isEmpty', () => {
			it('should detect empty values', () => {
				expect(isEmpty({})).toBe(true);
				expect(isEmpty([])).toBe(true);
				expect(isEmpty('')).toBe(true);
				expect(isEmpty(null)).toBe(true);
				expect(isEmpty(undefined)).toBe(true);
			});

			it('should detect non-empty values', () => {
				expect(isEmpty({ a: 1 })).toBe(false);
				expect(isEmpty([1])).toBe(false);
				expect(isEmpty('test')).toBe(false);
				expect(isEmpty(0)).toBe(false);
				expect(isEmpty(false)).toBe(false);
			});
		});
	});

	describe('Array Utilities', () => {
		describe('groupBy', () => {
			it('should group array by key', () => {
				const arr = [
					{ category: 'A', value: 1 },
					{ category: 'B', value: 2 },
					{ category: 'A', value: 3 },
				];
				const grouped = groupBy(arr, 'category');
				expect(grouped).toEqual({
					A: [
						{ category: 'A', value: 1 },
						{ category: 'A', value: 3 },
					],
					B: [{ category: 'B', value: 2 }],
				});
			});

			it('should group by function', () => {
				const arr = [1, 2, 3, 4, 5];
				const grouped = groupBy(arr, (n) => (n % 2 === 0 ? 'even' : 'odd'));
				expect(grouped).toEqual({
					even: [2, 4],
					odd: [1, 3, 5],
				});
			});
		});

		describe('uniqueArray', () => {
			it('should remove duplicates', () => {
				expect(uniqueArray([1, 2, 2, 3, 1, 4])).toEqual([1, 2, 3, 4]);
			});

			it('should handle objects', () => {
				const arr = [{ id: 1 }, { id: 1 }, { id: 2 }];
				const unique = uniqueArray(arr, (x) => x.id);
				expect(unique).toEqual([{ id: 1 }, { id: 2 }]);
			});
		});

		describe('shuffleArray', () => {
			it('should shuffle array', () => {
				const arr = [1, 2, 3, 4, 5];
				const shuffled = shuffleArray([...arr]);
				expect(shuffled).toHaveLength(5);
				expect(shuffled.sort()).toEqual(arr);
			});
		});

		describe('sortBy', () => {
			it('should sort by property', () => {
				const arr = [
					{ name: 'Charlie', age: 30 },
					{ name: 'Alice', age: 25 },
					{ name: 'Bob', age: 35 },
				];
				const sorted = sortBy(arr, 'age');
				expect(sorted.map((x) => x.age)).toEqual([25, 30, 35]);
			});

			it('should sort by function', () => {
				const arr = [3, 1, 4, 1, 5];
				const sorted = sortBy(arr, (x) => x * -1);
				expect(sorted).toEqual([5, 4, 3, 1, 1]);
			});
		});

		describe('partitionBy', () => {
			it('should partition array by predicate', () => {
				const arr = [1, 2, 3, 4, 5, 6];
				const [even, odd] = partitionBy(arr, (x) => x % 2 === 0);
				expect(even).toEqual([2, 4, 6]);
				expect(odd).toEqual([1, 3, 5]);
			});
		});
	});

	describe('Function Utilities', () => {
		describe('debounce', () => {
			vi.useFakeTimers();

			it('should debounce function calls', () => {
				const fn = vi.fn();
				const debouncedFn = debounce(fn, 100);

				debouncedFn();
				debouncedFn();
				debouncedFn();

				expect(fn).not.toHaveBeenCalled();

				vi.advanceTimersByTime(100);
				expect(fn).toHaveBeenCalledTimes(1);
			});

			it('should cancel previous calls', () => {
				const fn = vi.fn();
				const debouncedFn = debounce(fn, 100);

				debouncedFn();
				vi.advanceTimersByTime(50);
				debouncedFn();
				vi.advanceTimersByTime(100);

				expect(fn).toHaveBeenCalledTimes(1);
			});
		});

		describe('throttle', () => {
			vi.useFakeTimers();

			it('should throttle function calls', () => {
				const fn = vi.fn();
				const throttledFn = throttle(fn, 100);

				throttledFn();
				throttledFn();
				throttledFn();

				expect(fn).toHaveBeenCalledTimes(1);

				vi.advanceTimersByTime(100);
				throttledFn();
				expect(fn).toHaveBeenCalledTimes(2);
			});
		});

		describe('retry', () => {
			it('should retry on failure', async () => {
				const fn = vi
					.fn()
					.mockRejectedValueOnce(new Error('Failed'))
					.mockRejectedValueOnce(new Error('Failed'))
					.mockResolvedValue('success');

				const result = await retry(fn, { attempts: 3, delay: 10 });

				expect(result).toBe('success');
				expect(fn).toHaveBeenCalledTimes(3);
			});

			it('should throw after max attempts', async () => {
				const fn = vi.fn().mockRejectedValue(new Error('Failed'));

				await expect(retry(fn, { attempts: 3, delay: 10 })).rejects.toThrow('Failed');
				expect(fn).toHaveBeenCalledTimes(3);
			});
		});
	});

	describe('Date Utilities', () => {
		describe('formatDate', () => {
			it('should format date with default format', () => {
				const date = new Date('2023-01-15T12:30:00Z');
				const formatted = formatDate(date);
				expect(formatted).toMatch(/2023-01-15/);
			});

			it('should format date with custom format', () => {
				const date = new Date('2023-01-15T12:30:00Z');
				const formatted = formatDate(date, 'MM/DD/YYYY');
				expect(formatted).toBe('01/15/2023');
			});
		});

		describe('parseDate', () => {
			it('should parse ISO date', () => {
				const date = parseDate('2023-01-15T12:30:00Z');
				expect(date).toBeInstanceOf(Date);
				expect(date.getFullYear()).toBe(2023);
			});

			it('should parse custom format', () => {
				const date = parseDate('01/15/2023', 'MM/DD/YYYY');
				expect(date.getFullYear()).toBe(2023);
				expect(date.getMonth()).toBe(0);
				expect(date.getDate()).toBe(15);
			});
		});

		describe('isDateValid', () => {
			it('should validate correct dates', () => {
				expect(isDateValid('2023-01-15')).toBe(true);
				expect(isDateValid('01/15/2023')).toBe(true);
			});

			it('should reject invalid dates', () => {
				expect(isDateValid('2023-02-30')).toBe(false); // Feb 30 doesn't exist
				expect(isDateValid('invalid')).toBe(false);
			});
		});

		describe('calculateAge', () => {
			it('should calculate age correctly', () => {
				const birthDate = new Date('1990-01-15');
				const currentDate = new Date('2023-01-15');
				const age = calculateAge(birthDate, currentDate);
				expect(age).toBe(33);
			});

			it('should handle birthdays not yet occurred', () => {
				const birthDate = new Date('1990-12-31');
				const currentDate = new Date('2023-01-15');
				const age = calculateAge(birthDate, currentDate);
				expect(age).toBe(32);
			});
		});

		describe('getDateRange', () => {
			it('should generate date range', () => {
				const start = new Date('2023-01-01');
				const end = new Date('2023-01-05');
				const range = getDateRange(start, end);
				expect(range).toHaveLength(5);
				expect(range[0].getDate()).toBe(1);
				expect(range[4].getDate()).toBe(5);
			});
		});
	});

	describe('String Utilities', () => {
		describe('capitalize', () => {
			it('should capitalize first letter', () => {
				expect(capitalize('hello')).toBe('Hello');
				expect(capitalize('HELLO')).toBe('Hello');
				expect(capitalize('')).toBe('');
			});
		});

		describe('kebabCase', () => {
			it('should convert to kebab-case', () => {
				expect(kebabCase('camelCase')).toBe('camel-case');
				expect(kebabCase('snake_case')).toBe('snake-case');
				expect(kebabCase(' spaced out ')).toBe('spaced-out');
			});
		});

		describe('pascalCase', () => {
			it('should convert to PascalCase', () => {
				expect(pascalCase('camel-case')).toBe('CamelCase');
				expect(pascalCase('snake_case')).toBe('SnakeCase');
			});
		});

		describe('escapeRegex', () => {
			it('should escape regex special characters', () => {
				expect(escapeRegex('a.b*c+d?')).toBe('a\\.b\\*c\\+d\\?');
			});
		});

		describe('stripHtml', () => {
			it('should strip HTML tags', () => {
				expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
				expect(stripHtml('<div>Content</div>')).toBe('Content');
			});
		});
	});

	describe('UUID Utilities', () => {
		describe('generateUUID', () => {
			it('should generate valid UUID v4', () => {
				const uuid = generateUUID();
				const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
				expect(regex.test(uuid)).toBe(true);
			});

			it('should generate unique UUIDs', () => {
				const uuid1 = generateUUID();
				const uuid2 = generateUUID();
				expect(uuid1).not.toBe(uuid2);
			});
		});

		describe('isValidUUID', () => {
			it('should validate UUID v4', () => {
				expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
				expect(isValidUUID('invalid-uuid')).toBe(false);
			});
		});
	});

	describe('Encoding Utilities', () => {
		describe('encodeBase64', () => {
			it('should encode to base64', () => {
				expect(encodeBase64('hello')).toBe('aGVsbG8=');
				expect(encodeBase64('hello world')).toBe('aGVsbG8gd29ybGQ=');
			});
		});

		describe('decodeBase64', () => {
			it('should decode from base64', () => {
				expect(decodeBase64('aGVsbG8=')).toBe('hello');
				expect(decodeBase64('aGVsbG8gd29ybGQ=')).toBe('hello world');
			});

			it('should handle invalid base64', () => {
				expect(() => decodeBase64('invalid!')).toThrow();
			});
		});
	});

	describe('Math Utilities', () => {
		describe('roundToDecimal', () => {
			it('should round to specified decimals', () => {
				expect(roundToDecimal(Math.PI, 2)).toBe(3.14);
				expect(roundToDecimal(3.145, 2)).toBe(3.15);
				expect(roundToDecimal(3, 2)).toBe(3.0);
			});
		});

		describe('sumBy', () => {
			it('should sum array values', () => {
				const arr = [{ value: 1 }, { value: 2 }, { value: 3 }];
				expect(sumBy(arr, 'value')).toBe(6);
			});
		});

		describe('avgBy', () => {
			it('should calculate average', () => {
				const arr = [{ value: 2 }, { value: 4 }, { value: 6 }];
				expect(avgBy(arr, 'value')).toBe(4);
			});
		});

		describe('maxBy', () => {
			it('should find max by property', () => {
				const arr = [{ value: 1 }, { value: 3 }, { value: 2 }];
				expect(maxBy(arr, 'value')).toEqual({ value: 3 });
			});
		});

		describe('minBy', () => {
			it('should find min by property', () => {
				const arr = [{ value: 1 }, { value: 3 }, { value: 2 }];
				expect(minBy(arr, 'value')).toEqual({ value: 1 });
			});
		});
	});

	describe('Type Checking Utilities', () => {
		describe('isString', () => {
			it('should check if value is string', () => {
				expect(isString('hello')).toBe(true);
				expect(isString(123)).toBe(false);
				expect(isString(null)).toBe(false);
			});
		});

		describe('isNumber', () => {
			it('should check if value is number', () => {
				expect(isNumber(123)).toBe(true);
				expect(isNumber(123.45)).toBe(true);
				expect(isNumber('123')).toBe(false);
				expect(isNumber(NaN)).toBe(false);
			});
		});

		describe('isBoolean', () => {
			it('should check if value is boolean', () => {
				expect(isBoolean(true)).toBe(true);
				expect(isBoolean(false)).toBe(true);
				expect(isBoolean(1)).toBe(false);
				expect(isBoolean('true')).toBe(false);
			});
		});

		describe('isObject', () => {
			it('should check if value is object', () => {
				expect(isObject({})).toBe(true);
				expect(isObject([])).toBe(true);
				expect(isObject(null)).toBe(false);
				expect(isObject(() => {})).toBe(false);
			});
		});

		describe('isArray', () => {
			it('should check if value is array', () => {
				expect(isArray([])).toBe(true);
				expect(isArray({})).toBe(false);
				expect(isArray('array')).toBe(false);
			});
		});

		describe('isFunction', () => {
			it('should check if value is function', () => {
				expect(isFunction(() => {})).toBe(true);
				expect(isFunction(() => {})).toBe(true);
				expect(isFunction({})).toBe(false);
			});
		});

		describe('isNil', () => {
			it('should check if value is null or undefined', () => {
				expect(isNil(null)).toBe(true);
				expect(isNil(undefined)).toBe(true);
				expect(isNil(0)).toBe(false);
				expect(isNil('')).toBe(false);
				expect(isNil(false)).toBe(false);
			});
		});
	});

	describe('Performance Utilities', () => {
		describe('calculateChecksum', () => {
			it('should calculate checksum for string', () => {
				const checksum1 = calculateChecksum('hello');
				const checksum2 = calculateChecksum('hello');
				const checksum3 = calculateChecksum('world');

				expect(typeof checksum1).toBe('string');
				expect(checksum1).toBe(checksum2);
				expect(checksum1).not.toBe(checksum3);
			});

			it('should calculate checksum for object', () => {
				const obj = { a: 1, b: 2 };
				const checksum = calculateChecksum(obj);
				expect(typeof checksum).toBe('string');
			});
		});
	});

	describe('Template Utilities', () => {
		describe('template', () => {
			it('should interpolate template variables', () => {
				const tpl = template('Hello <%= name %>!');
				const result = tpl({ name: 'World' });
				expect(result).toBe('Hello World!');
			});

			it('should handle multiple variables', () => {
				const tpl = template('<%= first %> <%= last %>');
				const result = tpl({ first: 'John', last: 'Doe' });
				expect(result).toBe('John Doe');
			});

			it('should handle missing variables', () => {
				const tpl = template('Hello <%= name %>!');
				const result = tpl({});
				expect(result).toBe('Hello !');
			});
		});

		describe('interpolate', () => {
			it('should interpolate string with variables', () => {
				const result = interpolate('Hello ${name}!', { name: 'World' });
				expect(result).toBe('Hello World!');
			});
		});
	});

	describe('Advanced Array Operations', () => {
		describe('flatMap', () => {
			it('should map and flatten array', () => {
				const arr = [[1, 2], [3, 4], [5]];
				const result = flatMap(arr, (x) => x);
				expect(result).toEqual([1, 2, 3, 4, 5]);
			});
		});

		describe('zip', () => {
			it('should zip arrays together', () => {
				const result = zip([1, 2], ['a', 'b'], [true, false]);
				expect(result).toEqual([
					[1, 'a', true],
					[2, 'b', false],
				]);
			});

			it('should handle different lengths', () => {
				const result = zip([1, 2, 3], ['a', 'b']);
				expect(result).toEqual([
					[1, 'a'],
					[2, 'b'],
					[3, undefined],
				]);
			});
		});

		describe('zipObject', () => {
			it('should create object from keys and values', () => {
				const keys = ['a', 'b', 'c'];
				const values = [1, 2, 3];
				const result = zipObject(keys, values);
				expect(result).toEqual({ a: 1, b: 2, c: 3 });
			});
		});

		describe('range', () => {
			it('should generate range of numbers', () => {
				expect(range(5)).toEqual([0, 1, 2, 3, 4]);
				expect(range(1, 5)).toEqual([1, 2, 3, 4]);
				expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
			});
		});

		describe('repeat', () => {
			it('should repeat string n times', () => {
				expect(repeat('a', 3)).toBe('aaa');
				expect(repeat('ab', 2)).toBe('abab');
				expect(repeat('test', 0)).toBe('');
			});

			it('should repeat element n times', () => {
				expect(repeat(42, 3)).toEqual([42, 42, 42]);
			});
		});

		describe('countBy', () => {
			it('should count occurrences', () => {
				const arr = ['a', 'b', 'a', 'c', 'b', 'a'];
				const result = countBy(arr);
				expect(result).toEqual({ a: 3, b: 2, c: 1 });
			});

			it('should count by key', () => {
				const arr = [
					{ type: 'fruit', name: 'apple' },
					{ type: 'fruit', name: 'banana' },
					{ type: 'vegetable', name: 'carrot' },
				];
				const result = countBy(arr, 'type');
				expect(result).toEqual({ fruit: 2, vegetable: 1 });
			});
		});
	});

	describe('String Formatting', () => {
		describe('formatCurrency', () => {
			it('should format currency', () => {
				expect(formatCurrency(1234.56)).toBe('$1,234.56');
				expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
				expect(formatCurrency(1234.56, 'USD', 0)).toBe('$1,235');
			});
		});

		describe('padStart', () => {
			it('should pad start of string', () => {
				expect(padStart('5', 3, '0')).toBe('005');
				expect(padStart('test', 8, ' ')).toBe('    test');
			});
		});

		describe('padEnd', () => {
			it('should pad end of string', () => {
				expect(padEnd('5', 3, '0')).toBe('500');
				expect(padEnd('test', 8, ' ')).toBe('test    ');
			});
		});

		describe('startCase', () => {
			it('should convert to start case', () => {
				expect(startCase('hello_world')).toBe('Hello World');
				expect(startCase('helloWorld')).toBe('Hello World');
				expect(startCase('hello-world')).toBe('Hello World');
			});
		});

		describe('swapCase', () => {
			it('should swap case', () => {
				expect(swapCase('Hello World')).toBe('hELLO wORLD');
				expect(swapCase('Test123')).toBe('tEST123');
			});
		});

		describe('deburr', () => {
			it('should remove diacritical marks', () => {
				expect(deburr('déjà vu')).toBe('deja vu');
				expect(deburr('naïve café')).toBe('naive cafe');
				expect(deburr('Ångström')).toBe('Angstrom');
			});
		});
	});

	describe('Type Coercion', () => {
		describe('parseNumber', () => {
			it('should parse number from string', () => {
				expect(parseNumber('123')).toBe(123);
				expect(parseNumber('123.45')).toBe(123.45);
				expect(parseNumber('1,234.56')).toBe(1234.56);
				expect(parseNumber('$123.45')).toBe(123.45);
				expect(parseNumber('invalid')).toBeNaN();
			});
		});
	});

	describe('Pluck Operations', () => {
		describe('pluck', () => {
			it('should pluck property from array of objects', () => {
				const arr = [
					{ name: 'John', age: 30 },
					{ name: 'Jane', age: 25 },
					{ name: 'Bob', age: 35 },
				];
				expect(pluck(arr, 'name')).toEqual(['John', 'Jane', 'Bob']);
			});
		});
	});
});
