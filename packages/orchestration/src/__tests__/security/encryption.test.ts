/**
 * nO Master Agent Loop - Encryption Service Tests
 *
 * Comprehensive TDD test suite for data encryption, cryptographic operations,
 * and security functions with brAInwav standards.
 *
 * Co-authored-by: brAInwav Development Team
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createEncryptionService,
	DEFAULT_ENCRYPTION_CONFIG,
	EncryptionSchemas,
	EncryptionService,
	quickDecrypt,
	quickEncrypt,
} from '../../security/encryption.js';

describe('EncryptionService', () => {
	let encryptionService: EncryptionService;
	const testKey = 'test-master-key-32-characters-long!!';
	const testData = 'sensitive-test-data';

	beforeEach(() => {
		encryptionService = new EncryptionService(testKey);
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	describe('Basic Encryption/Decryption', () => {
		it('should encrypt and decrypt string data correctly', async () => {
			const encrypted = await encryptionService.encrypt(testData);

			expect(encrypted).toMatchObject({
				data: expect.any(String),
				iv: expect.any(String),
				salt: expect.any(String),
				tag: expect.any(String),
				algorithm: DEFAULT_ENCRYPTION_CONFIG.algorithm,
				timestamp: expect.any(Number),
			});

			const decrypted = await encryptionService.decrypt(encrypted);
			expect(decrypted).toBe(testData);
		});

		it('should encrypt and decrypt object data correctly', async () => {
			const testObject = {
				username: 'testuser',
				email: 'test@brainwav.ai',
				metadata: { role: 'admin' },
			};

			const encrypted = await encryptionService.encrypt(testObject);
			const decrypted = await encryptionService.decrypt(encrypted);

			expect(JSON.parse(decrypted)).toEqual(testObject);
		});

		it('should produce different ciphertext for same plaintext', async () => {
			const encrypted1 = await encryptionService.encrypt(testData);
			const encrypted2 = await encryptionService.encrypt(testData);

			expect(encrypted1.data).not.toBe(encrypted2.data);
			expect(encrypted1.iv).not.toBe(encrypted2.iv);
			expect(encrypted1.salt).not.toBe(encrypted2.salt);
		});

		it('should fail decryption with tampered data', async () => {
			const encrypted = await encryptionService.encrypt(testData);

			// Tamper with encrypted data
			const tamperedEncrypted = {
				...encrypted,
				data: `${encrypted.data.slice(0, -4)}XXXX`,
			};

			await expect(encryptionService.decrypt(tamperedEncrypted)).rejects.toThrow(
				'Decryption failed',
			);
		});

		it('should fail decryption with wrong IV', async () => {
			const encrypted = await encryptionService.encrypt(testData);

			// Wrong IV
			const wrongIVEncrypted = {
				...encrypted,
				iv: Buffer.from('wrong-iv-16-bytes').toString('base64'),
			};

			await expect(encryptionService.decrypt(wrongIVEncrypted)).rejects.toThrow(
				'Decryption failed',
			);
		});
	});

	describe('Field Encryption', () => {
		it('should encrypt specific fields in an object', async () => {
			const testObject = {
				id: '123',
				username: 'testuser',
				password: 'secret123',
				email: 'test@brainwav.ai',
				apiKey: 'api-key-123',
			};

			const encrypted = await encryptionService.encryptFields(testObject, ['password', 'apiKey']);

			expect(encrypted.id).toBe('123');
			expect(encrypted.username).toBe('testuser');
			expect(encrypted.email).toBe('test@brainwav.ai');

			expect(encrypted.password).toMatchObject({
				data: expect.any(String),
				iv: expect.any(String),
				algorithm: expect.any(String),
			});

			expect(encrypted.apiKey).toMatchObject({
				data: expect.any(String),
				iv: expect.any(String),
				algorithm: expect.any(String),
			});
		});

		it('should decrypt specific fields in an object', async () => {
			const testObject = {
				username: 'testuser',
				password: 'secret123',
				apiKey: 'api-key-123',
			};

			const encrypted = await encryptionService.encryptFields(testObject, ['password', 'apiKey']);

			const decrypted = await encryptionService.decryptFields(encrypted, ['password', 'apiKey']);

			expect(decrypted.username).toBe('testuser');
			expect(decrypted.password).toBe('secret123');
			expect(decrypted.apiKey).toBe('api-key-123');
		});

		it('should handle missing fields gracefully', async () => {
			const testObject = { username: 'testuser' };

			const encrypted = await encryptionService.encryptFields(
				testObject,
				['password', 'apiKey'], // These fields don't exist
			);

			expect(encrypted).toEqual(testObject);
		});

		it('should handle decryption errors gracefully', async () => {
			const testObject = {
				username: 'testuser',
				password: { data: 'invalid-encrypted-data' },
			};

			// Mock console.warn to avoid test output noise
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await encryptionService.decryptFields(testObject, ['password']);

			expect(result.username).toBe('testuser');
			expect(result.password).toEqual({ data: 'invalid-encrypted-data' });
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('Hashing Functions', () => {
		it('should generate secure hash with salt', () => {
			const result = encryptionService.hash(testData);

			expect(result).toMatchObject({
				hash: expect.any(String),
				salt: expect.any(String),
			});

			expect(result.hash).toHaveLength(64); // SHA-256 hex length
			expect(result.salt).toHaveLength(32); // 16 bytes in hex
		});

		it('should verify hash correctly', () => {
			const { hash, salt } = encryptionService.hash(testData);

			expect(encryptionService.verifyHash(testData, hash, salt)).toBe(true);
			expect(encryptionService.verifyHash('wrong-data', hash, salt)).toBe(false);
		});

		it('should produce different hashes for same data', () => {
			const result1 = encryptionService.hash(testData);
			const result2 = encryptionService.hash(testData);

			expect(result1.hash).not.toBe(result2.hash);
			expect(result1.salt).not.toBe(result2.salt);
		});

		it('should use provided salt consistently', () => {
			const customSalt = 'custom-salt-16-b';
			const result1 = encryptionService.hash(testData, customSalt);
			const result2 = encryptionService.hash(testData, customSalt);

			expect(result1.hash).toBe(result2.hash);
			expect(result1.salt).toBe(result2.salt);
		});
	});

	describe('HMAC Functions', () => {
		it('should generate HMAC correctly', () => {
			const hmac = encryptionService.generateHMAC(testData);

			expect(hmac).toEqual(expect.any(String));
			expect(hmac).toHaveLength(64); // SHA-256 hex length
		});

		it('should verify HMAC correctly', () => {
			const hmac = encryptionService.generateHMAC(testData);

			expect(encryptionService.verifyHMAC(testData, hmac)).toBe(true);
			expect(encryptionService.verifyHMAC('wrong-data', hmac)).toBe(false);
		});

		it('should use custom key for HMAC', () => {
			const customKey = 'custom-hmac-key';
			const hmac1 = encryptionService.generateHMAC(testData, customKey);
			const hmac2 = encryptionService.generateHMAC(testData);

			expect(hmac1).not.toBe(hmac2);
			expect(encryptionService.verifyHMAC(testData, hmac1, customKey)).toBe(true);
		});
	});

	describe('Token Generation', () => {
		it('should generate secure random tokens', () => {
			const token1 = encryptionService.generateToken();
			const token2 = encryptionService.generateToken();

			expect(token1).toEqual(expect.any(String));
			expect(token2).toEqual(expect.any(String));
			expect(token1).not.toBe(token2);
			expect(token1).toHaveLength(64); // 32 bytes in hex
		});

		it('should generate tokens of specified length', () => {
			const token = encryptionService.generateToken(16);
			expect(token).toHaveLength(32); // 16 bytes in hex
		});

		it('should generate API keys with metadata', async () => {
			const apiKey = await encryptionService.generateAPIKey();

			expect(apiKey).toMatchObject({
				key: expect.any(String),
				hash: expect.any(String),
			});

			expect(apiKey.key).toHaveLength(64); // 32 bytes in hex
			expect(apiKey.hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/); // bcrypt hash format

			// Verify the API key can be validated
			const isValid = await encryptionService.verifyAPIKey(apiKey.key, apiKey.hash);
			expect(isValid).toBe(true);

			// Verify wrong key fails validation
			const wrongKey = encryptionService.generateToken(32);
			const isInvalid = await encryptionService.verifyAPIKey(wrongKey, apiKey.hash);
			expect(isInvalid).toBe(false);
		});
	});

	describe('Key Rotation', () => {
		it('should track current key version', () => {
			const version = encryptionService.getCurrentKeyVersion();
			expect(version).toBe(1);
		});

		it('should provide encryption statistics', () => {
			const stats = encryptionService.getStats();

			expect(stats).toMatchObject({
				currentKeyVersion: 1,
				totalKeyVersions: 1,
				algorithm: DEFAULT_ENCRYPTION_CONFIG.algorithm,
				keyRotationEnabled: true,
			});
		});

		it('should create encryption service with custom rotation policy', () => {
			const customService = new EncryptionService(
				testKey,
				{},
				{
					enabled: false,
					rotationIntervalMs: 1000,
					maxKeyAge: 5000,
					retainOldKeys: false,
				},
			);

			const stats = customService.getStats();
			expect(stats.keyRotationEnabled).toBe(false);
		});
	});

	describe('Factory Functions', () => {
		it('should create encryption service with defaults', () => {
			const service = createEncryptionService();
			const stats = service.getStats();

			expect(stats.algorithm).toBe(DEFAULT_ENCRYPTION_CONFIG.algorithm);
			expect(stats.currentKeyVersion).toBe(1);
		});

		it('should create encryption service with custom key', () => {
			const customKey = 'custom-encryption-key-for-testing';
			const service = createEncryptionService(customKey);

			expect(service).toBeInstanceOf(EncryptionService);
		});

		it('should perform quick encrypt/decrypt', async () => {
			const encrypted = await quickEncrypt(testData, testKey);
			const decrypted = await quickDecrypt(encrypted, testKey);

			expect(decrypted).toBe(testData);
		});

		it('should fail quick decrypt with wrong key', async () => {
			const encrypted = await quickEncrypt(testData, testKey);

			await expect(quickDecrypt(encrypted, 'wrong-key')).rejects.toThrow('Decryption failed');
		});
	});

	describe('Validation Schemas', () => {
		it('should validate encrypt data schema', () => {
			const validData = { data: 'test-data' };
			const result = EncryptionSchemas.encryptData.safeParse(validData);

			expect(result.success).toBe(true);
		});

		it('should validate decrypt data schema', () => {
			const validData = {
				data: 'encrypted-data',
				iv: 'initialization-vector',
				salt: 'salt-value',
				tag: 'auth-tag',
				algorithm: 'aes-256-gcm',
				timestamp: Date.now(),
			};

			const result = EncryptionSchemas.decryptData.safeParse(validData);
			expect(result.success).toBe(true);
		});

		it('should validate hash data schema', () => {
			const validData = { data: 'test-data' };
			const result = EncryptionSchemas.hashData.safeParse(validData);

			expect(result.success).toBe(true);
		});

		it('should validate generate token schema', () => {
			const validData = { length: 16 };
			const result = EncryptionSchemas.generateToken.safeParse(validData);

			expect(result.success).toBe(true);
		});

		it('should reject invalid token length', () => {
			const invalidData = { length: 5 }; // Too short
			const result = EncryptionSchemas.generateToken.safeParse(invalidData);

			expect(result.success).toBe(false);
		});
	});

	describe('Error Handling', () => {
		it('should handle encryption errors gracefully', async () => {
			// Create service with invalid configuration
			const invalidService = new EncryptionService('', {
				algorithm: 'invalid-algorithm' as 'aes-256-gcm',
			});

			await expect(invalidService.encrypt(testData)).rejects.toThrow('Encryption failed');
		});

		it('should handle malformed encrypted data', async () => {
			const malformedData = {
				data: 'not-base64!@#$%',
				iv: 'invalid-iv',
				algorithm: 'aes-256-gcm',
				timestamp: Date.now(),
			};

			await expect(encryptionService.decrypt(malformedData)).rejects.toThrow('Decryption failed');
		});
	});

	describe('Performance and Security', () => {
		it('should encrypt large data efficiently', async () => {
			const largeData = 'a'.repeat(10000); // 10KB of data
			const startTime = Date.now();

			const encrypted = await encryptionService.encrypt(largeData);
			const decrypted = await encryptionService.decrypt(encrypted);

			const endTime = Date.now();

			expect(decrypted).toBe(largeData);
			expect(endTime - startTime).toBeLessThan(100); // Should be fast
		});

		it('should generate cryptographically secure tokens', () => {
			const tokens = new Set();

			// Generate many tokens to check for duplicates
			for (let i = 0; i < 1000; i++) {
				tokens.add(encryptionService.generateToken());
			}

			expect(tokens.size).toBe(1000); // All should be unique
		});

		it('should use authenticated encryption', async () => {
			const encrypted = await encryptionService.encrypt(testData);

			// Ensure auth tag is present for GCM mode
			expect(encrypted.tag).toBeDefined();
			expect(encrypted.tag).toEqual(expect.any(String));
		});
	});
});

describe('brAInwav Integration', () => {
	it('should work with brAInwav environment variables', () => {
		// Mock environment variable
		process.env.ENCRYPTION_KEY = 'brainwav-production-key-32-chars';

		const service = createEncryptionService();
		const stats = service.getStats();

		expect(stats.currentKeyVersion).toBe(1);
		expect(stats.algorithm).toBe('aes-256-gcm');

		// Clean up
		delete process.env.ENCRYPTION_KEY;
	});

	it('should provide secure defaults for production', () => {
		const service = createEncryptionService();
		const stats = service.getStats();

		expect(stats.algorithm).toBe('aes-256-gcm'); // Strong encryption
		expect(stats.keyRotationEnabled).toBe(true); // Security best practice
	});
});
