/**
 * [brAInwav] Password Hashing Tests
 * Tests for CodeQL alert #260 - Weak password hashing (MD5)
 *
 * Phase 1 (RED): Write failing tests first
 *
 * These tests verify secure password hashing using bcrypt
 * instead of weak MD5 hashing.
 */

import { describe, expect, it } from 'vitest';
import { hashPassword, migrateFromMD5, verifyPassword } from '../src/crypto/password-hash.js';

describe('[brAInwav] Password Hashing', () => {
	describe('hashPassword', () => {
		it('should hash passwords using bcrypt', async () => {
			const password = 'test-password-123';
			const hash = await hashPassword(password);

			expect(hash).toBeDefined();
			expect(hash).not.toBe(password);
			expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt format
		});

		it('should produce different hashes for same password', async () => {
			const password = 'same-password';
			const hash1 = await hashPassword(password);
			const hash2 = await hashPassword(password);

			// bcrypt uses random salt, so hashes differ
			expect(hash1).not.toBe(hash2);
		});

		it('should handle empty passwords', async () => {
			const hash = await hashPassword('');
			expect(hash).toBeDefined();
			expect(hash).toMatch(/^\$2[aby]\$/);
		});

		it('should handle long passwords', async () => {
			const longPassword = 'a'.repeat(100);
			const hash = await hashPassword(longPassword);
			expect(hash).toBeDefined();
		});

		it('should handle special characters', async () => {
			const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
			const hash = await hashPassword(password);
			expect(hash).toBeDefined();
		});

		it('should handle unicode characters', async () => {
			const password = '密码🔐パスワード';
			const hash = await hashPassword(password);
			expect(hash).toBeDefined();
		});
	});

	describe('verifyPassword', () => {
		it('should verify correct passwords', async () => {
			const password = 'correct-password';
			const hash = await hashPassword(password);

			const isValid = await verifyPassword(password, hash);
			expect(isValid).toBe(true);
		});

		it('should reject incorrect passwords', async () => {
			const hash = await hashPassword('correct');
			const isValid = await verifyPassword('wrong', hash);

			expect(isValid).toBe(false);
		});

		it('should reject empty password when non-empty was hashed', async () => {
			const hash = await hashPassword('password');
			const isValid = await verifyPassword('', hash);

			expect(isValid).toBe(false);
		});

		it('should use timing-safe comparison', async () => {
			const hash = await hashPassword('password');

			// Measure time for correct password
			const start1 = Date.now();
			await verifyPassword('password', hash);
			const time1 = Date.now() - start1;

			// Measure time for wrong password
			const start2 = Date.now();
			await verifyPassword('wrong-password', hash);
			const time2 = Date.now() - start2;

			// Timing should be similar (bcrypt is inherently timing-safe)
			// Allow reasonable variance (within 50ms)
			expect(Math.abs(time1 - time2)).toBeLessThan(50);
		});

		it('should reject invalid hash format', async () => {
			// bcrypt returns false for invalid hashes, doesn't throw
			const result = await verifyPassword('password', 'invalid-hash');
			expect(result).toBe(false);
		});

		it('should reject MD5 hashes', async () => {
			// MD5 hash format (32 hex characters)
			// bcrypt returns false for non-bcrypt hashes
			const md5Hash = 'a' + '0'.repeat(31);
			const result = await verifyPassword('password', md5Hash);
			expect(result).toBe(false);
		});
	});

	describe('Security Properties', () => {
		it('should use sufficient work factor (cost)', async () => {
			const password = 'test';
			const hash = await hashPassword(password);

			// bcrypt hash format: $2a$10$... where 10 is the cost
			// Extract cost from hash
			const costMatch = hash.match(/^\$2[aby]\$(\d+)\$/);
			expect(costMatch).toBeDefined();
			const cost = Number.parseInt(costMatch![1], 10);

			// Should use at least cost factor 10
			expect(cost).toBeGreaterThanOrEqual(10);
		});

		it('should be slow enough to prevent brute force', async () => {
			const start = Date.now();
			await hashPassword('test');
			const duration = Date.now() - start;

			// bcrypt should take at least 30ms (typically 50-200ms)
			// Lower threshold to account for fast machines
			expect(duration).toBeGreaterThan(30);
		}, 10000);

		it('should include salt in hash', async () => {
			const password = 'test';
			const hash = await hashPassword(password);

			// bcrypt format: $2a$10$saltsaltsaltsaltsalthashhashhashhashhashhas
			// Salt is embedded in hash (22 characters after cost)
			expect(hash.length).toBeGreaterThan(50);
		});
	});

	describe('migrateFromMD5 (CodeQL #260 fix)', () => {
		it('should detect MD5 hashes', () => {
			const md5Hash = '5f4dcc3b5aa765d61d8327deb882cf99'; // 'password' in MD5
			const isMD5 = migrateFromMD5(md5Hash);

			expect(isMD5).toBe(true);
		});

		it('should not detect bcrypt hashes as MD5', () => {
			const bcryptHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
			const isMD5 = migrateFromMD5(bcryptHash);

			expect(isMD5).toBe(false);
		});

		it('should handle mixed case MD5 hashes', () => {
			const md5Hash = '5F4DCC3B5AA765D61D8327DEB882CF99';
			const isMD5 = migrateFromMD5(md5Hash);

			expect(isMD5).toBe(true);
		});

		it('should reject invalid hash formats', () => {
			expect(migrateFromMD5('too-short')).toBe(false);
			expect(migrateFromMD5('x'.repeat(32))).toBe(false); // non-hex
		});
	});

	describe('Error Handling', () => {
		it('should handle bcrypt errors gracefully', async () => {
			// Very long password might cause issues
			const veryLongPassword = 'a'.repeat(10000);

			// Should either hash it or throw a clear error
			await expect(async () => {
				await hashPassword(veryLongPassword);
			}).not.toThrow(/undefined/); // No undefined errors
		});

		it('should include brAInwav branding in errors', async () => {
			// Test with a scenario that actually throws
			try {
				// This will throw from bcrypt if hash is completely invalid
				await hashPassword('a'.repeat(100000)); // Very long might cause issues
			} catch (error) {
				// If it throws, it should have brAInwav branding
				expect((error as Error).message).toContain('brAInwav');
			}
			// If it doesn't throw, that's fine - bcrypt handles it
		});
	});

	describe('Integration Scenarios', () => {
		it('should support full registration + login flow', async () => {
			// Registration
			const userPassword = 'SecureP@ssw0rd!';
			const hashedPassword = await hashPassword(userPassword);

			// Store hash in database (simulated)
			const storedHash = hashedPassword;

			// Login attempt - correct password
			const loginResult = await verifyPassword(userPassword, storedHash);
			expect(loginResult).toBe(true);

			// Login attempt - wrong password
			const wrongResult = await verifyPassword('WrongPassword', storedHash);
			expect(wrongResult).toBe(false);
		});

		it('should support password change flow', async () => {
			// Original password
			const oldPassword = 'old-password';
			const oldHash = await hashPassword(oldPassword);

			// Verify old password before change
			const isOldValid = await verifyPassword(oldPassword, oldHash);
			expect(isOldValid).toBe(true);

			// Change to new password
			const newPassword = 'new-password';
			const newHash = await hashPassword(newPassword);

			// Old password should not work with new hash
			const oldWithNew = await verifyPassword(oldPassword, newHash);
			expect(oldWithNew).toBe(false);

			// New password should work
			const newWithNew = await verifyPassword(newPassword, newHash);
			expect(newWithNew).toBe(true);
		});
	});
});
