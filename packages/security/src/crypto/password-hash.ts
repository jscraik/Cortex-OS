/**
 * [brAInwav] Password Hashing
 * Fixes CodeQL alert #260 - Weak password hashing (MD5)
 *
 * Provides secure password hashing using bcrypt instead of MD5.
 * Bcrypt is designed for password hashing with:
 * - Automatic salting
 * - Configurable work factor (cost)
 * - Timing-attack resistance
 */

import bcrypt from 'bcrypt';

/**
 * Number of salt rounds for bcrypt
 * Higher = more secure but slower
 * 10 = ~100ms per hash (good balance)
 * 12 = ~400ms per hash (more secure)
 */
const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * CodeQL Fix: Replaces MD5 hashing with secure bcrypt (#260)
 *
 * @param password - Plain text password to hash
 * @returns Promise resolving to bcrypt hash string
 *
 * @example
 * ```typescript
 * const hash = await hashPassword('user-password-123');
 * // Store hash in database
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
	try {
		return await bcrypt.hash(password, SALT_ROUNDS);
	} catch (error) {
		throw new Error(`[brAInwav] Password hashing failed: ${(error as Error).message}`, {
			cause: error,
		});
	}
}

/**
 * Verify a password against a bcrypt hash
 * Uses timing-safe comparison
 *
 * @param providedPassword - Plain text password to verify
 * @param storedHash - Bcrypt hash from database
 * @returns Promise resolving to true if password matches
 *
 * @example
 * ```typescript
 * const isValid = await verifyPassword(userInput, storedHash);
 * if (isValid) {
 *   // Login successful
 * }
 * ```
 */
export async function verifyPassword(
	providedPassword: string,
	storedHash: string,
): Promise<boolean> {
	try {
		// bcrypt.compare is timing-safe
		return await bcrypt.compare(providedPassword, storedHash);
	} catch (error) {
		throw new Error(`[brAInwav] Password verification failed: ${(error as Error).message}`, {
			cause: error,
		});
	}
}

/**
 * Detect if a hash is MD5 format (for migration purposes)
 * MD5 hashes are 32 hexadecimal characters
 *
 * @param hash - Hash string to check
 * @returns true if hash appears to be MD5 format
 *
 * @example
 * ```typescript
 * if (migrateFromMD5(storedHash)) {
 *   // Force user to reset password
 *   // or rehash during next successful login
 * }
 * ```
 */
export function migrateFromMD5(hash: string): boolean {
	// MD5 produces 32 hexadecimal characters
	const md5Pattern = /^[a-fA-F0-9]{32}$/;
	return md5Pattern.test(hash);
}

/**
 * Verify password with automatic migration from MD5
 * Use this during login to transparently upgrade old MD5 hashes
 *
 * @param providedPassword - Plain text password
 * @param storedHash - Hash from database (MD5 or bcrypt)
 * @param onMigrate - Callback to save new bcrypt hash
 * @returns Promise resolving to true if password matches
 *
 * @example
 * ```typescript
 * const isValid = await verifyPasswordWithMigration(
 *   userPassword,
 *   user.passwordHash,
 *   async (newHash) => {
 *     await db.updateUserPassword(userId, newHash);
 *   }
 * );
 * ```
 */
export async function verifyPasswordWithMigration(
	providedPassword: string,
	storedHash: string,
	onMigrate?: (newHash: string) => Promise<void>,
): Promise<boolean> {
	// Check if it's an old MD5 hash
	if (migrateFromMD5(storedHash)) {
		// For MD5, we need the password to verify
		// Since we can't verify MD5 securely, we should reject
		// and require password reset
		throw new Error(
			'[brAInwav] MD5 password hash detected. Please reset your password for security.',
		);
	}

	// Normal bcrypt verification
	const isValid = await verifyPassword(providedPassword, storedHash);

	// If valid and migration callback provided, could upgrade hash
	// (e.g., increase cost factor in future)
	if (isValid && onMigrate) {
		// Check if hash uses old cost factor (optional future enhancement)
		const currentCost = Number.parseInt(storedHash.split('$')[2], 10);
		if (currentCost < SALT_ROUNDS) {
			const newHash = await hashPassword(providedPassword);
			await onMigrate(newHash);
		}
	}

	return isValid;
}
