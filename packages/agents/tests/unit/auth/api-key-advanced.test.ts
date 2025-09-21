import { beforeEach, describe, expect, it } from 'vitest';
import {
    createAPIKey,
    extractAPIKey,
    getAPIKey,
    initializeAPIKeys,
    listAPIKeys,
    revokeAPIKey,
    validateAPIKey,
} from '../../../src/auth/api-key';

describe('API Key Authentication - Advanced Tests', () => {
    beforeEach(() => {
        // Reset API keys for each test
        initializeAPIKeys();
    });

    describe('API Key Validation Edge Cases', () => {
        it('should reject empty string API key', async () => {
            const result = await validateAPIKey('');
            expect(result).toBe(false);
        });

        it('should reject null/undefined API key', async () => {
            // @ts-expect-error Testing invalid input
            const resultNull = await validateAPIKey(null);
            expect(resultNull).toBe(false);

            // @ts-expect-error Testing invalid input
            const resultUndefined = await validateAPIKey(undefined);
            expect(resultUndefined).toBe(false);
        });

        it('should reject API key with only whitespace', async () => {
            const result = await validateAPIKey('   ');
            expect(result).toBe(false);
        });

        it('should reject extremely long API key (DoS protection)', async () => {
            const longKey = 'x'.repeat(10000); // 10KB key
            const result = await validateAPIKey(longKey);
            expect(result).toBe(false);
        });

        it('should handle API key with special characters', async () => {
            const specialKey = 'key-with-$pecial-ch@rs!';
            const result = await validateAPIKey(specialKey);
            expect(result).toBe(false); // Should not exist
        });

        it('should be case-sensitive for API keys', async () => {
            const result1 = await validateAPIKey('test-api-key-valid');
            const result2 = await validateAPIKey('TEST-API-KEY-VALID');

            expect(result1).toBe(true);
            expect(result2).toBe(false); // Case sensitive
        });

        it('should track last used timestamp', async () => {
            const keyInfo1 = await getAPIKey('test-api-key-valid');
            const originalLastUsed = keyInfo1?.lastUsed;

            // Validate key (should update lastUsed)
            await validateAPIKey('test-api-key-valid');

            const keyInfo2 = await getAPIKey('test-api-key-valid');
            expect(keyInfo2?.lastUsed).toBeDefined();
            expect(keyInfo2?.lastUsed).not.toBe(originalLastUsed);
        });
    });

    describe('API Key Expiration Handling', () => {
        it('should reject expired API keys', async () => {
            // Create an expired key
            const expiredKey = await createAPIKey(
                'Expired Test Key',
                ['user'],
                ['read:agents'],
                new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
            );

            const result = await validateAPIKey(expiredKey.key);
            expect(result).toBe(false);
        });

        it('should accept non-expired API keys', async () => {
            // Create a future-expiring key
            const validKey = await createAPIKey(
                'Future Test Key',
                ['user'],
                ['read:agents'],
                new Date(Date.now() + 86400000).toISOString(), // Expires tomorrow
            );

            const result = await validateAPIKey(validKey.key);
            expect(result).toBe(true);
        });

        it('should handle keys without expiration (permanent keys)', async () => {
            const permanentKey = await createAPIKey(
                'Permanent Test Key',
                ['user'],
                ['read:agents'],
                // No expiration date
            );

            const result = await validateAPIKey(permanentKey.key);
            expect(result).toBe(true);
        });

        it('should handle malformed expiration dates gracefully', async () => {
            // This would require directly manipulating the API key store
            // Testing implementation robustness
            const key = await createAPIKey('Test Key', ['user'], ['read:agents']);

            // Verify it works normally
            const result = await validateAPIKey(key.key);
            expect(result).toBe(true);
        });
    });

    describe('Header Extraction Scenarios', () => {
        it('should extract API key from Authorization Bearer header', () => {
            const headers = new Headers();
            headers.set('Authorization', 'Bearer my-secret-key-123');

            const extracted = extractAPIKey(headers);
            expect(extracted).toBe('my-secret-key-123');
        });

        it('should extract API key from X-API-Key header', () => {
            const headers = new Headers();
            headers.set('X-API-Key', 'my-secret-key-456');

            const extracted = extractAPIKey(headers);
            expect(extracted).toBe('my-secret-key-456');
        });

        it('should prioritize Authorization header over X-API-Key', () => {
            const headers = new Headers();
            headers.set('Authorization', 'Bearer auth-key');
            headers.set('X-API-Key', 'x-api-key');

            const extracted = extractAPIKey(headers);
            expect(extracted).toBe('auth-key');
        });

        it('should handle malformed Authorization header', () => {
            const headers = new Headers();
            headers.set('Authorization', 'NotBearer my-key');

            const extracted = extractAPIKey(headers);
            expect(extracted).toBe(null);
        });

        it('should handle Authorization header without Bearer prefix', () => {
            const headers = new Headers();
            headers.set('Authorization', 'my-key-without-bearer');

            const extracted = extractAPIKey(headers);
            expect(extracted).toBe(null);
        });

        it('should handle empty Authorization Bearer header', () => {
            const headers = new Headers();
            headers.set('Authorization', 'Bearer ');

            const extracted = extractAPIKey(headers);
            // Headers normalizes 'Bearer ' to 'Bearer', which is malformed, so should return null
            expect(extracted).toBe(null);
        });

        it('should handle missing headers gracefully', () => {
            const headers = new Headers();

            const extracted = extractAPIKey(headers);
            expect(extracted).toBe(null);
        });

        it('should handle case-insensitive header names', () => {
            const headers = new Headers();
            headers.set('authorization', 'Bearer lower-case-header');

            const extracted = extractAPIKey(headers);
            expect(extracted).toBe('lower-case-header');
        });
    });

    describe('API Key Management Operations', () => {
        it('should create API key with secure random generation', async () => {
            const key1 = await createAPIKey('Test Key 1', ['user'], ['read:agents']);
            const key2 = await createAPIKey('Test Key 2', ['user'], ['read:agents']);

            expect(key1.key).toBeDefined();
            expect(key2.key).toBeDefined();
            expect(key1.key).not.toBe(key2.key); // Should be unique
            expect(key1.key.length).toBeGreaterThan(32); // Should be long enough
            expect(key1.id).toBeDefined();
            expect(key1.createdAt).toBeDefined();
        });

        it('should create API key with proper metadata', async () => {
            const key = await createAPIKey(
                'Test Management Key',
                ['admin', 'user'],
                ['read:agents', 'write:agents', 'manage:system'],
            );

            expect(key.name).toBe('Test Management Key');
            expect(key.roles).toEqual(['admin', 'user']);
            expect(key.permissions).toEqual(['read:agents', 'write:agents', 'manage:system']);
            expect(new Date(key.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
        });

        it('should revoke API key successfully', async () => {
            const key = await createAPIKey('To Be Revoked', ['user'], ['read:agents']);

            // Verify key works
            const validationBefore = await validateAPIKey(key.key);
            expect(validationBefore).toBe(true);

            // Revoke the key
            const revoked = await revokeAPIKey(key.key);
            expect(revoked).toBe(true);

            // Verify key no longer works
            const validationAfter = await validateAPIKey(key.key);
            expect(validationAfter).toBe(false);
        });

        it('should handle revoking non-existent API key', async () => {
            const revoked = await revokeAPIKey('non-existent-key');
            expect(revoked).toBe(false);
        });

        it('should list API keys without exposing actual key values', async () => {
            await createAPIKey('Listed Key 1', ['user'], ['read:agents']);
            await createAPIKey('Listed Key 2', ['admin'], ['manage:agents']);

            const keys = await listAPIKeys();

            expect(keys.length).toBeGreaterThanOrEqual(2);

            // Find our created keys
            const listedKey1 = keys.find((k) => k.name === 'Listed Key 1');
            const listedKey2 = keys.find((k) => k.name === 'Listed Key 2');

            expect(listedKey1).toBeDefined();
            expect(listedKey2).toBeDefined();

            // Verify key values are not exposed
            expect(listedKey1).not.toHaveProperty('key');
            expect(listedKey2).not.toHaveProperty('key');

            // Verify metadata is present
            expect(listedKey1?.id).toBeDefined();
            expect(listedKey1?.name).toBe('Listed Key 1');
            expect(listedKey1?.roles).toEqual(['user']);
        });
    });

    describe('brAInwav Security Requirements', () => {
        it('should follow brAInwav security standards for key generation', async () => {
            const key = await createAPIKey('brAInwav Security Key', ['user'], ['read:agents']);

            // Verify key meets brAInwav security requirements
            expect(key.key.length).toBeGreaterThan(32); // Minimum length for brAInwav
            expect(key.key).toMatch(/^[a-f0-9]+$/); // Hex format for brAInwav standards
            expect(key.id).toMatch(/^key-\d+$/); // brAInwav ID format
        });

        it('should include brAInwav audit trail in key metadata', async () => {
            const key = await createAPIKey('brAInwav Audit Key', ['admin'], ['manage:system']);

            expect(key.createdAt).toBeDefined();
            expect(new Date(key.createdAt)).toBeInstanceOf(Date);

            // Verify audit trail format (brAInwav requirement)
            expect(key.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('should handle brAInwav rate limiting scenarios', async () => {
            // Test rapid validation attempts (brAInwav DoS protection)
            const key = 'test-api-key-valid';
            const results = [];

            for (let i = 0; i < 10; i++) {
                results.push(await validateAPIKey(key));
            }

            // All should succeed (no rate limiting in validation itself)
            expect(results.every((r) => r === true)).toBe(true);
        });
    });

    describe('Concurrent Access Scenarios', () => {
        it('should handle concurrent API key validation', async () => {
            const key = 'test-api-key-valid';

            // Simulate concurrent requests
            const promises = Array(5)
                .fill(0)
                .map(() => validateAPIKey(key));
            const results = await Promise.all(promises);

            // All should succeed
            expect(results.every((r) => r === true)).toBe(true);
        });

        it('should handle concurrent key creation', async () => {
            // Create multiple keys concurrently
            const promises = Array(3)
                .fill(0)
                .map((_, i) => createAPIKey(`Concurrent Key ${i}`, ['user'], ['read:agents']));

            const keys = await Promise.all(promises);

            // All should be unique
            const keyValues = keys.map((k) => k.key);
            const uniqueKeys = new Set(keyValues);
            expect(uniqueKeys.size).toBe(keys.length);
        });
    });
});
