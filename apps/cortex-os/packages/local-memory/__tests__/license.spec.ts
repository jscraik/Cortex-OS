/**
 * @file License Management Tests
 * @description Tests for brAInwav license management with 1Password CLI integration
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type License, LicenseManager, LicenseSchema } from '../src/license/index.js';

// Mock child_process
vi.mock('child_process');
vi.mock('fs/promises');

describe('LicenseManager', () => {
    let manager: LicenseManager;

    const validLicense: License = {
        licenseKey: 'test-license-key-123',
        customerEmail: 'test@brainwav.com',
        brainwavOrganization: 'Test Organization',
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        maxUsers: 10,
        features: ['local-memory', 'rag-processing'],
        issuedAt: new Date().toISOString(),
    };

    beforeEach(() => {
        manager = new LicenseManager({
            onePasswordItem: 'test-license',
            onePasswordVault: 'test-vault',
            fallbackPath: '/tmp/test-license.json',
            environmentOverride: 'TEST_LICENSE_DATA',
        });

        // Clear environment
        delete process.env.TEST_LICENSE_DATA;

        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        manager.clearCache();
    });

    describe('License Schema Validation', () => {
        it('should validate a correct license', () => {
            expect(() => LicenseSchema.parse(validLicense)).not.toThrow();
        });

        it('should reject license with invalid email', () => {
            const invalidLicense = { ...validLicense, customerEmail: 'invalid-email' };
            expect(() => LicenseSchema.parse(invalidLicense)).toThrow();
        });

        it('should reject license with negative maxUsers', () => {
            const invalidLicense = { ...validLicense, maxUsers: -5 };
            expect(() => LicenseSchema.parse(invalidLicense)).toThrow();
        });

        it('should reject license with missing required fields', () => {
            const invalidLicense = { ...validLicense };
            delete (invalidLicense as any).licenseKey;
            expect(() => LicenseSchema.parse(invalidLicense)).toThrow();
        });
    });

    describe('Environment Override', () => {
        it('should load license from environment variable', async () => {
            process.env.TEST_LICENSE_DATA = JSON.stringify(validLicense);

            const license = await manager.getLicense();
            expect(license).toEqual(validLicense);
        });

        it('should cache license from environment', async () => {
            process.env.TEST_LICENSE_DATA = JSON.stringify(validLicense);

            const license1 = await manager.getLicense();
            const license2 = await manager.getLicense();

            expect(license1).toEqual(license2);
            expect(license1).toEqual(validLicense);
        });
    });

    describe('1Password CLI Integration', () => {
        it('should retrieve license from 1Password when available', async () => {
            const mockOpResponse = {
                fields: [{ id: 'notesPlain', value: JSON.stringify(validLicense) }],
            };

            vi.mocked(exec).mockImplementation((command, callback) => {
                if (command.includes('op --version')) {
                    callback?.(null, { stdout: '2.0.0', stderr: '' } as any);
                } else if (command.includes('op item get')) {
                    callback?.(null, { stdout: JSON.stringify(mockOpResponse), stderr: '' } as any);
                }
                return {} as any;
            });

            const license = await manager.getLicense();
            expect(license).toEqual(validLicense);
        });

        it('should fall back when 1Password CLI is not available', async () => {
            vi.mocked(exec).mockImplementation((command, callback) => {
                callback?.(new Error('op: command not found'), {
                    stdout: '',
                    stderr: 'command not found',
                } as any);
                return {} as any;
            });

            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validLicense));

            const license = await manager.getLicense();
            expect(license).toEqual(validLicense);
        });

        it('should extract license from 1Password fields when notes field is empty', async () => {
            const mockOpResponse = {
                fields: [
                    { label: 'License Key', value: validLicense.licenseKey },
                    { label: 'Customer Email', value: validLicense.customerEmail },
                    { label: 'Organization', value: validLicense.brainwavOrganization },
                    { label: 'Expiration', value: validLicense.expirationDate },
                    { label: 'Max Users', value: validLicense.maxUsers.toString() },
                    { label: 'Features', value: validLicense.features.join(', ') },
                    { label: 'Issued At', value: validLicense.issuedAt },
                ],
            };

            vi.mocked(exec).mockImplementation((command, callback) => {
                if (command.includes('op --version')) {
                    callback?.(null, { stdout: '2.0.0', stderr: '' } as any);
                } else if (command.includes('op item get')) {
                    callback?.(null, { stdout: JSON.stringify(mockOpResponse), stderr: '' } as any);
                }
                return {} as any;
            });

            const license = await manager.getLicense();
            expect(license.licenseKey).toBe(validLicense.licenseKey);
            expect(license.customerEmail).toBe(validLicense.customerEmail);
            expect(license.brainwavOrganization).toBe(validLicense.brainwavOrganization);
        });
    });

    describe('Fallback File Support', () => {
        it('should load license from fallback file', async () => {
            vi.mocked(exec).mockImplementation((command, callback) => {
                callback?.(new Error('op: command not found'), { stdout: '', stderr: '' } as any);
                return {} as any;
            });

            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(validLicense));

            const license = await manager.getLicense();
            expect(license).toEqual(validLicense);
        });

        it('should handle missing fallback file gracefully', async () => {
            vi.mocked(exec).mockImplementation((command, callback) => {
                callback?.(new Error('op: command not found'), { stdout: '', stderr: '' } as any);
                return {} as any;
            });

            const fileError = new Error('File not found') as any;
            fileError.code = 'ENOENT';
            vi.mocked(fs.readFile).mockRejectedValue(fileError);

            await expect(manager.getLicense()).rejects.toThrow('brAInwav license not found');
        });
    });

    describe('License Validation', () => {
        it('should validate a current license', async () => {
            process.env.TEST_LICENSE_DATA = JSON.stringify(validLicense);

            const validation = await manager.validateLicense();
            expect(validation.valid).toBe(true);
            expect(validation.daysRemaining).toBeGreaterThan(0);
        });

        it('should detect expired license', async () => {
            const expiredLicense = {
                ...validLicense,
                expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
            };

            process.env.TEST_LICENSE_DATA = JSON.stringify(expiredLicense);

            const validation = await manager.validateLicense();
            expect(validation.valid).toBe(false);
            expect(validation.reason).toContain('expired');
        });

        it('should warn about soon-to-expire license', async () => {
            const soonExpiredLicense = {
                ...validLicense,
                expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
            };

            process.env.TEST_LICENSE_DATA = JSON.stringify(soonExpiredLicense);

            const consoleSpy = vi.spyOn(console, 'warn');
            const validation = await manager.validateLicense();

            expect(validation.valid).toBe(true);
            expect(validation.daysRemaining).toBe(3);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('expires in 3 days'));
        });
    });

    describe('License Storage', () => {
        it('should store license in 1Password CLI', async () => {
            vi.mocked(exec).mockImplementation((command, callback) => {
                if (command.includes('op --version')) {
                    callback?.(null, { stdout: '2.0.0', stderr: '' } as any);
                } else if (command.includes('op item create')) {
                    callback?.(null, { stdout: 'Item created', stderr: '' } as any);
                }
                return {} as any;
            });

            await expect(manager.storeLicense(validLicense)).resolves.not.toThrow();
        });

        it('should throw error when 1Password CLI is not available for storage', async () => {
            vi.mocked(exec).mockImplementation((command, callback) => {
                callback?.(new Error('op: command not found'), { stdout: '', stderr: '' } as any);
                return {} as any;
            });

            await expect(manager.storeLicense(validLicense)).rejects.toThrow(
                'brAInwav license storage requires 1Password CLI installation',
            );
        });

        it('should validate license before storage', async () => {
            const invalidLicense = { ...validLicense, customerEmail: 'invalid-email' };

            await expect(manager.storeLicense(invalidLicense as License)).rejects.toThrow(
                'brAInwav license storage failed',
            );
        });
    });

    describe('Cache Management', () => {
        it('should cache license data', async () => {
            process.env.TEST_LICENSE_DATA = JSON.stringify(validLicense);

            const license1 = await manager.getLicense();
            const license2 = await manager.getLicense();

            expect(license1).toBe(license2); // Same object reference due to caching
        });

        it('should clear cache when requested', async () => {
            process.env.TEST_LICENSE_DATA = JSON.stringify(validLicense);

            await manager.getLicense();
            manager.clearCache();

            // Should re-fetch after cache clear
            const license = await manager.getLicense();
            expect(license).toEqual(validLicense);
        });

        it('should respect cache expiration', async () => {
            // Create manager with very short cache duration for testing
            const shortCacheManager = new LicenseManager({
                environmentOverride: 'TEST_LICENSE_DATA',
            });

            // Override cache duration for testing
            (shortCacheManager as any).cacheDurationMs = 1; // 1ms

            process.env.TEST_LICENSE_DATA = JSON.stringify(validLicense);

            await shortCacheManager.getLicense();

            // Wait for cache to expire
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Should re-fetch after cache expiration
            const license = await shortCacheManager.getLicense();
            expect(license).toEqual(validLicense);
        });
    });

    describe('Error Handling', () => {
        it('should provide descriptive error messages', async () => {
            vi.mocked(exec).mockImplementation((command, callback) => {
                callback?.(new Error('op: command not found'), { stdout: '', stderr: '' } as any);
                return {} as any;
            });

            const fileError = new Error('Permission denied');
            vi.mocked(fs.readFile).mockRejectedValue(fileError);

            await expect(manager.getLicense()).rejects.toThrow('brAInwav license retrieval failed');
        });

        it('should handle JSON parsing errors gracefully', async () => {
            process.env.TEST_LICENSE_DATA = 'invalid-json';

            await expect(manager.getLicense()).rejects.toThrow('brAInwav license parsing failed');
        });

        it('should handle validation errors with context', async () => {
            const invalidLicense = { ...validLicense, maxUsers: -1 };
            process.env.TEST_LICENSE_DATA = JSON.stringify(invalidLicense);

            await expect(manager.getLicense()).rejects.toThrow('brAInwav license validation failed');
        });
    });
});

describe('License Helper Functions', () => {
    beforeEach(() => {
        // Clear environment variables
        delete process.env.CORTEX_LICENSE_1P_ITEM;
        delete process.env.CORTEX_LICENSE_1P_VAULT;
        delete process.env.CORTEX_LICENSE_FALLBACK_PATH;
        delete process.env.CORTEX_LICENSE_ENV_VAR;
    });

    describe('createLicenseManagerFromEnv', () => {
        it('should create manager with default configuration', async () => {
            const { createLicenseManagerFromEnv } = await import('../src/license/index.js');
            const manager = createLicenseManagerFromEnv();

            expect(manager).toBeInstanceOf(LicenseManager);
        });

        it('should respect environment configuration', async () => {
            process.env.CORTEX_LICENSE_1P_ITEM = 'custom-item';
            process.env.CORTEX_LICENSE_1P_VAULT = 'custom-vault';
            process.env.CORTEX_LICENSE_FALLBACK_PATH = '/custom/path';
            process.env.CORTEX_LICENSE_ENV_VAR = 'CUSTOM_LICENSE';

            const { createLicenseManagerFromEnv } = await import('../src/license/index.js');
            const manager = createLicenseManagerFromEnv();

            expect(manager).toBeInstanceOf(LicenseManager);
            // Note: We can't easily test private config without exposing it
        });
    });

    describe('initializeLicense', () => {
        it('should initialize and validate license', async () => {
            const validLicense = {
                licenseKey: 'test-key',
                customerEmail: 'test@brainwav.com',
                brainwavOrganization: 'Test Org',
                expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                maxUsers: 10,
                features: ['test'],
                issuedAt: new Date().toISOString(),
            };

            process.env.CORTEX_LICENSE_DATA = JSON.stringify(validLicense);

            const { initializeLicense } = await import('../src/license/index.js');
            const result = await initializeLicense();

            expect(result.manager).toBeInstanceOf(LicenseManager);
            expect(result.license).toEqual(validLicense);
        });

        it('should throw error for invalid license', async () => {
            const expiredLicense = {
                licenseKey: 'test-key',
                customerEmail: 'test@brainwav.com',
                brainwavOrganization: 'Test Org',
                expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired
                maxUsers: 10,
                features: ['test'],
                issuedAt: new Date().toISOString(),
            };

            process.env.CORTEX_LICENSE_DATA = JSON.stringify(expiredLicense);

            const { initializeLicense } = await import('../src/license/index.js');

            await expect(initializeLicense()).rejects.toThrow('brAInwav license invalid');
        });
    });
});
