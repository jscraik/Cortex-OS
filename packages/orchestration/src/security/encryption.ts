/**
 * nO Master Agent Loop - Data Encryption & Cryptography
 *
 * Provides comprehensive encryption services for sensitive data,
 * secure communication, and cryptographic operations with
 * brAInwav security standards.
 *
 * Co-authored-by: brAInwav Development Team
 */

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	createHmac,
	randomBytes,
	scrypt,
} from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';

const scryptAsync = promisify(scrypt);

export interface EncryptionConfig {
	algorithm: string;
	keyLength: number;
	ivLength: number;
	saltLength: number;
	tagLength: number;
	iterations: number;
}

export interface EncryptedData {
	data: string;
	iv: string;
	salt?: string;
	tag?: string;
	algorithm: string;
	timestamp: number;
}

export interface KeyRotationPolicy {
	enabled: boolean;
	rotationIntervalMs: number;
	maxKeyAge: number;
	retainOldKeys: boolean;
}

/**
 * Default encryption configuration
 */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
	algorithm: 'aes-256-gcm',
	keyLength: 32, // 256 bits
	ivLength: 16, // 128 bits
	saltLength: 16, // 128 bits
	tagLength: 16, // 128 bits
	iterations: 100000, // PBKDF2 iterations
};

/**
 * Data Encryption Service
 */
export class EncryptionService {
	private config: EncryptionConfig;
	private masterKey: Buffer;
	private keyRotationPolicy: KeyRotationPolicy;
	private keyVersions: Map<number, Buffer> = new Map();
	private currentKeyVersion: number = 1;

	constructor(
		masterKey: string | Buffer,
		config: Partial<EncryptionConfig> = {},
		keyRotationPolicy: Partial<KeyRotationPolicy> = {},
	) {
		this.config = { ...DEFAULT_ENCRYPTION_CONFIG, ...config };
		this.masterKey = typeof masterKey === 'string' ? Buffer.from(masterKey) : masterKey;

		this.keyRotationPolicy = {
			enabled: true,
			rotationIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
			maxKeyAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			retainOldKeys: true,
			...keyRotationPolicy,
		};

		// Initialize first key version
		this.keyVersions.set(this.currentKeyVersion, this.masterKey);

		// Setup automatic key rotation if enabled
		if (this.keyRotationPolicy.enabled) {
			this.setupKeyRotation();
		}
	}

	/**
	 * Encrypt sensitive data with authenticated encryption
	 */
	async encrypt(data: string | object, keyVersion?: number): Promise<EncryptedData> {
		try {
			const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
			const dataBuffer = Buffer.from(plaintext, 'utf8');

			// Generate random IV and salt
			const iv = randomBytes(this.config.ivLength);
			const salt = randomBytes(this.config.saltLength);

			// Derive encryption key
			const key = await this.deriveKey(salt, keyVersion);

			// Create cipher
			const cipher = createCipheriv(this.config.algorithm, key, iv);

			// Encrypt data
			const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);

			// Get authentication tag for GCM mode
			const tag = (cipher as any).getAuthTag();

			return {
				data: encrypted.toString('base64'),
				iv: iv.toString('base64'),
				salt: salt.toString('base64'),
				tag: tag.toString('base64'),
				algorithm: this.config.algorithm,
				timestamp: Date.now(),
			};
		} catch (error) {
			throw new Error(
				`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Decrypt authenticated encrypted data
	 */
	async decrypt(encryptedData: EncryptedData): Promise<string> {
		try {
			// Parse components
			const dataBuffer = Buffer.from(encryptedData.data, 'base64');
			const iv = Buffer.from(encryptedData.iv, 'base64');
			const salt = encryptedData.salt ? Buffer.from(encryptedData.salt, 'base64') : undefined;
			const tag = encryptedData.tag ? Buffer.from(encryptedData.tag, 'base64') : undefined;

			// Derive decryption key
			const key = await this.deriveKey(salt);

			// Create decipher
			const decipher = createDecipheriv(encryptedData.algorithm, key, iv);

			// Set auth tag for GCM mode
			if (tag) {
				(decipher as any).setAuthTag(tag);
			}

			// Decrypt data
			const decrypted = Buffer.concat([decipher.update(dataBuffer), decipher.final()]);

			return decrypted.toString('utf8');
		} catch (error) {
			throw new Error(
				`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Encrypt multiple fields in an object
	 */
	async encryptFields(
		obj: Record<string, any>,
		fieldsToEncrypt: string[],
	): Promise<Record<string, any>> {
		const result = { ...obj };

		for (const field of fieldsToEncrypt) {
			if (result[field] !== undefined && result[field] !== null) {
				result[field] = await this.encrypt(result[field]);
			}
		}

		return result;
	}

	/**
	 * Decrypt multiple fields in an object
	 */
	async decryptFields(
		obj: Record<string, any>,
		fieldsToDecrypt: string[],
	): Promise<Record<string, any>> {
		const result = { ...obj };

		for (const field of fieldsToDecrypt) {
			if (result[field] && typeof result[field] === 'object' && result[field].data) {
				try {
					result[field] = await this.decrypt(result[field]);
				} catch (error) {
					// Log error but don't fail entire operation
					console.warn(`Failed to decrypt field ${field}:`, error);
				}
			}
		}

		return result;
	}

	/**
	 * Generate secure hash with salt
	 */
	hash(data: string, salt?: string): { hash: string; salt: string } {
		const saltString = salt || randomBytes(this.config.saltLength).toString('hex');
		const hash = createHash('sha256').update(data).update(saltString).digest('hex');

		return {
			hash,
			salt: saltString,
		};
	}

	/**
	 * Verify hash with salt
	 */
	verifyHash(data: string, hash: string, salt: string): boolean {
		const computed = this.hash(data, salt);
		return computed.hash === hash;
	}

	/**
	 * Generate HMAC for message authentication
	 */
	generateHMAC(data: string, key?: string): string {
		const hmacKey = key || this.masterKey.toString('hex');
		return createHmac('sha256', hmacKey).update(data).digest('hex');
	}

	/**
	 * Verify HMAC
	 */
	verifyHMAC(data: string, hmac: string, key?: string): boolean {
		const computed = this.generateHMAC(data, key);
		return computed === hmac;
	}

	/**
	 * Generate secure random token
	 */
	generateToken(length: number = 32): string {
		return randomBytes(length).toString('hex');
	}

	/**
	 * Generate API key with metadata
	 */
	generateAPIKey(): { key: string; hash: string; salt: string } {
		const key = this.generateToken(32);
		const { hash, salt } = this.hash(key);

		return { key, hash, salt };
	}

	/**
	 * Derive encryption key from master key and salt
	 */
	private async deriveKey(salt?: Buffer, keyVersion?: number): Promise<Buffer> {
		const masterKey = keyVersion
			? this.keyVersions.get(keyVersion) || this.masterKey
			: this.masterKey;

		if (!salt) {
			return masterKey.slice(0, this.config.keyLength);
		}

		return (await scryptAsync(masterKey, salt, this.config.keyLength)) as Buffer;
	}

	/**
	 * Setup automatic key rotation
	 */
	private setupKeyRotation(): void {
		setInterval(() => {
			this.rotateKeys();
		}, this.keyRotationPolicy.rotationIntervalMs);
	}

	/**
	 * Rotate encryption keys
	 */
	private rotateKeys(): void {
		if (!this.keyRotationPolicy.enabled) return;

		// Generate new key version
		this.currentKeyVersion++;
		const newKey = this.deriveNewKey();
		this.keyVersions.set(this.currentKeyVersion, newKey);

		// Clean up old keys if policy allows
		if (!this.keyRotationPolicy.retainOldKeys) {
			for (const [version] of this.keyVersions) {
				// Keep current and recent keys only
				if (version < this.currentKeyVersion - 2) {
					this.keyVersions.delete(version);
				}
			}
		}

		console.log(`Key rotation completed. New version: ${this.currentKeyVersion}`);
	}

	/**
	 * Derive new key for rotation
	 */
	private deriveNewKey(): Buffer {
		const timestamp = Date.now().toString();
		const newKeySeed = createHash('sha256').update(this.masterKey).update(timestamp).digest();

		return newKeySeed.slice(0, this.config.keyLength);
	}

	/**
	 * Get current key version
	 */
	getCurrentKeyVersion(): number {
		return this.currentKeyVersion;
	}

	/**
	 * Get encryption statistics
	 */
	getStats(): {
		currentKeyVersion: number;
		totalKeyVersions: number;
		algorithm: string;
		keyRotationEnabled: boolean;
	} {
		return {
			currentKeyVersion: this.currentKeyVersion,
			totalKeyVersions: this.keyVersions.size,
			algorithm: this.config.algorithm,
			keyRotationEnabled: this.keyRotationPolicy.enabled,
		};
	}
}

/**
 * Validation schemas for encryption operations
 */
export const EncryptionSchemas = {
	encryptData: z.object({
		data: z.union([z.string(), z.record(z.any())]),
		keyVersion: z.number().optional(),
	}),

	decryptData: z.object({
		data: z.string(),
		iv: z.string(),
		salt: z.string().optional(),
		tag: z.string().optional(),
		algorithm: z.string(),
		timestamp: z.number(),
	}),

	hashData: z.object({
		data: z.string(),
		salt: z.string().optional(),
	}),

	generateToken: z.object({
		length: z.number().min(8).max(256).optional(),
	}),
};

/**
 * Secure field encryption decorator for sensitive data
 */
export function encryptSensitiveFields(encryptionService: EncryptionService, fields: string[]) {
	return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const result = await originalMethod.apply(this, args);

			if (result && typeof result === 'object') {
				return await encryptionService.encryptFields(result, fields);
			}

			return result;
		};

		return descriptor;
	};
}

/**
 * Factory function to create encryption service with brAInwav defaults
 */
export function createEncryptionService(
	masterKey?: string,
	config?: Partial<EncryptionConfig>,
): EncryptionService {
	const key =
		masterKey ||
		process.env.ENCRYPTION_KEY ||
		'brainwav-default-encryption-key-change-in-production';

	return new EncryptionService(key, {
		...DEFAULT_ENCRYPTION_CONFIG,
		...config,
	});
}

/**
 * Utility function for quick encryption
 */
export async function quickEncrypt(data: string, key: string): Promise<string> {
	const service = createEncryptionService(key);
	const encrypted = await service.encrypt(data);
	return JSON.stringify(encrypted);
}

/**
 * Utility function for quick decryption
 */
export async function quickDecrypt(encryptedData: string, key: string): Promise<string> {
	const service = createEncryptionService(key);
	const parsed = JSON.parse(encryptedData);
	return await service.decrypt(parsed);
}
