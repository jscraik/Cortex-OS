import type { APIKey } from './types';

// In-memory store for API keys (in production, use database)
const apiKeys: Map<string, APIKey> = new Map();

// Initialize with some test keys
export function initializeAPIKeys(): void {
	// Add test API key
	apiKeys.set('test-api-key-valid', {
		id: 'key-1',
		key: 'test-api-key-valid',
		name: 'Test API Key',
		roles: ['user'],
		permissions: ['read:agents', 'execute:agents'],
		createdAt: new Date().toISOString(),
	});

	// Add admin API key
	apiKeys.set('admin-api-key-valid', {
		id: 'key-2',
		key: 'admin-api-key-valid',
		name: 'Admin API Key',
		roles: ['admin'],
		permissions: ['read:agents', 'execute:agents', 'manage:agents'],
		createdAt: new Date().toISOString(),
	});
}

// Initialize keys
initializeAPIKeys();

/**
 * Validate API key
 * @param apiKey The API key to validate
 * @returns The API key information if valid, null otherwise
 */
export async function validateAPIKey(apiKey: string): Promise<boolean> {
	const keyInfo = apiKeys.get(apiKey);

	if (!keyInfo) {
		return false;
	}

	// Check if key is expired
	if (keyInfo.expiresAt && new Date(keyInfo.expiresAt) < new Date()) {
		return false;
	}

	// Update last used timestamp
	keyInfo.lastUsed = new Date().toISOString();
	apiKeys.set(apiKey, keyInfo);

	return true;
}

/**
 * Get API key information
 * @param apiKey The API key
 * @returns The API key information
 */
export async function getAPIKey(apiKey: string): Promise<APIKey | null> {
	const keyInfo = apiKeys.get(apiKey);

	if (!keyInfo) {
		return null;
	}

	// Check if key is expired
	if (keyInfo.expiresAt && new Date(keyInfo.expiresAt) < new Date()) {
		return null;
	}

	return keyInfo;
}

/**
 * Extract API key from request
 * @param headers Request headers
 * @returns The API key or null if not found
 */
export function extractAPIKey(headers: Headers): string | null {
	// Check Authorization header first
	const authHeader = headers.get('Authorization');
	if (authHeader?.startsWith('Bearer ')) {
		return authHeader.substring(7);
	}

	// Check X-API-Key header
	const apiKeyHeader = headers.get('X-API-Key');
	if (apiKeyHeader) {
		return apiKeyHeader;
	}

	return null;
}

/**
 * Create a new API key
 * @param name Key name
 * @param roles User roles
 * @param permissions User permissions
 * @param expiresAt Optional expiration date
 * @returns The created API key
 */
export async function createAPIKey(
	name: string,
	roles: string[],
	permissions: string[],
	expiresAt?: string,
): Promise<APIKey> {
	// Generate secure random key
	const crypto = require('node:crypto');
	const key = crypto.randomBytes(32).toString('hex');
	const id = `key-${Date.now()}`;

	const apiKey: APIKey = {
		id,
		key,
		name,
		roles,
		permissions,
		createdAt: new Date().toISOString(),
		expiresAt,
	};

	apiKeys.set(key, apiKey);
	return apiKey;
}

/**
 * Revoke an API key
 * @param apiKey The API key to revoke
 * @returns True if revoked, false if not found
 */
export async function revokeAPIKey(apiKey: string): Promise<boolean> {
	return apiKeys.delete(apiKey);
}

/**
 * List all API keys
 * @returns Array of API keys (without actual key values)
 */
export async function listAPIKeys(): Promise<Omit<APIKey, 'key'>[]> {
	return Array.from(apiKeys.values()).map(({ key, ...rest }) => rest);
}
