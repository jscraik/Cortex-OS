/**
 * @file License Management with 1Password CLI Integration
 * @description Secure license storage and retrieval using 1Password CLI with fallbacks
 */

import { exec } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);

// License data schema
export const LicenseSchema = z.object({
    licenseKey: z.string().min(1),
    customerEmail: z.string().email(),
    expirationDate: z.string().datetime(),
    features: z.array(z.string()),
    maxUsers: z.number().positive(),
    brainwavOrganization: z.string().min(1),
    issuedAt: z.string().datetime(),
});

export type License = z.infer<typeof LicenseSchema>;

export interface LicenseConfig {
    onePasswordItem?: string;
    onePasswordVault?: string;
    fallbackPath?: string;
    environmentOverride?: string;
}

// 1Password item interfaces
interface OnePasswordField {
    id?: string;
    label?: string;
    type: string;
    value: string;
}

interface OnePasswordItem {
    title: string;
    category: string;
    fields?: OnePasswordField[];
}

/**
 * brAInwav License Manager with 1Password CLI integration
 */
export class LicenseManager {
    private config: LicenseConfig;
    private cache: License | null = null;
    private cacheExpiration = 0;
    private readonly cacheDurationMs = 5 * 60 * 1000; // 5 minutes

    constructor(config: LicenseConfig = {}) {
        this.config = {
            onePasswordItem: config.onePasswordItem || 'brainwav-cortex-os-license',
            onePasswordVault: config.onePasswordVault || 'brAInwav Development',
            fallbackPath: config.fallbackPath || path.join(os.homedir(), '.cortex-os', 'license.json'),
            environmentOverride: config.environmentOverride || 'CORTEX_LICENSE_DATA',
            ...config,
        };
    }

    /**
     * Retrieve license from 1Password CLI, fallback sources, or cache
     */
    async getLicense(): Promise<License> {
        // Check cache first
        if (this.cache && Date.now() < this.cacheExpiration) {
            return this.cache;
        }

        try {
            // 1. Try environment override first
            if (this.config.environmentOverride) {
                const envLicense = process.env[this.config.environmentOverride];
                if (envLicense) {
                    const license = await this.parseLicense(envLicense, 'environment');
                    this.updateCache(license);
                    return license;
                }
            }

            // 2. Try 1Password CLI (primary method)
            const onePasswordLicense = await this.getLicenseFrom1Password();
            if (onePasswordLicense) {
                this.updateCache(onePasswordLicense);
                return onePasswordLicense;
            }

            // 3. Fallback to local file (encrypted or plaintext)
            const fallbackLicense = await this.getLicenseFromFallback();
            if (fallbackLicense) {
                console.warn(
                    '[brAInwav] License loaded from fallback file - consider migrating to 1Password CLI',
                );
                this.updateCache(fallbackLicense);
                return fallbackLicense;
            }

            throw new Error('brAInwav license not found in any configured source');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`brAInwav license retrieval failed: ${errorMessage}`);
        }
    }

    /**
     * Store license in 1Password CLI
     */
    async storeLicense(license: License): Promise<void> {
        try {
            // Validate license data
            LicenseSchema.parse(license);

            // Store in 1Password CLI
            await this.storeLicenseIn1Password(license);

            // Update cache
            this.updateCache(license);

            console.info('[brAInwav] License successfully stored in 1Password CLI');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`brAInwav license storage failed: ${errorMessage}`);
        }
    }

    /**
     * Validate license and check expiration
     */
    async validateLicense(): Promise<{ valid: boolean; reason?: string; daysRemaining?: number }> {
        try {
            const license = await this.getLicense();

            const now = new Date();
            const expiration = new Date(license.expirationDate);

            if (expiration <= now) {
                return {
                    valid: false,
                    reason: `brAInwav license expired on ${expiration.toLocaleDateString()}`,
                };
            }

            const daysRemaining = Math.ceil(
                (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );

            if (daysRemaining <= 7) {
                console.warn(`[brAInwav] License expires in ${daysRemaining} days - please renew`);
            }

            return {
                valid: true,
                daysRemaining,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                valid: false,
                reason: `brAInwav license validation error: ${errorMessage}`,
            };
        }
    }

    /**
     * Clear cached license data
     */
    clearCache(): void {
        this.cache = null;
        this.cacheExpiration = 0;
    }

    /**
     * Get license from 1Password CLI
     */
    private async getLicenseFrom1Password(): Promise<License | null> {
        try {
            // Check if 1Password CLI is available
            await execAsync('op --version');

            // Retrieve license from 1Password
            const command = `op item get "${this.config.onePasswordItem}" --vault="${this.config.onePasswordVault}" --format=json`;
            const { stdout } = await execAsync(command);

            const item = JSON.parse(stdout);

            // Extract license data from 1Password item
            const licenseData = this.extract1PasswordLicenseData(item);

            return await this.parseLicense(JSON.stringify(licenseData), '1Password CLI');
        } catch (error) {
            if (error instanceof Error && error.message.includes('op: command not found')) {
                console.warn(
                    '[brAInwav] 1Password CLI not installed - falling back to alternative methods',
                );
            } else {
                console.warn(
                    `[brAInwav] 1Password CLI error: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
            return null;
        }
    }

    /**
     * Store license in 1Password CLI
     */
    private async storeLicenseIn1Password(license: License): Promise<void> {
        try {
            // Check if 1Password CLI is available
            await execAsync('op --version');

            // Create or update 1Password item
            const itemData = {
                title: this.config.onePasswordItem,
                category: 'SECURE_NOTE',
                fields: [
                    { id: 'notesPlain', type: 'STRING', value: JSON.stringify(license, null, 2) },
                    { label: 'License Key', type: 'STRING', value: license.licenseKey },
                    { label: 'Customer Email', type: 'STRING', value: license.customerEmail },
                    { label: 'Organization', type: 'STRING', value: license.brainwavOrganization },
                    { label: 'Expiration', type: 'STRING', value: license.expirationDate },
                    { label: 'Max Users', type: 'STRING', value: license.maxUsers.toString() },
                    { label: 'Features', type: 'STRING', value: license.features.join(', ') },
                ],
            };

            const command = `echo '${JSON.stringify(itemData)}' | op item create --vault="${this.config.onePasswordVault}" -`;
            await execAsync(command);
        } catch (error) {
            if (error instanceof Error && error.message.includes('op: command not found')) {
                throw new Error('brAInwav license storage requires 1Password CLI installation');
            }
            throw error;
        }
    }

    /**
     * Get license from fallback file
     */
    private async getLicenseFromFallback(): Promise<License | null> {
        try {
            if (!this.config.fallbackPath) {
                return null;
            }

            const licenseData = await fs.readFile(this.config.fallbackPath, 'utf8');
            return await this.parseLicense(licenseData, 'fallback file');
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                return null; // File doesn't exist
            }
            console.warn(
                `[brAInwav] Fallback license file error: ${error instanceof Error ? error.message : String(error)}`,
            );
            return null;
        }
    }

    /**
     * Parse and validate license data
     */
    private async parseLicense(licenseData: string, source: string): Promise<License> {
        try {
            const parsed = JSON.parse(licenseData);
            const license = LicenseSchema.parse(parsed);

            console.info(`[brAInwav] License loaded from ${source}`);
            return license;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(
                    `brAInwav license validation failed from ${source}: ${error.errors.map((e) => e.message).join(', ')}`,
                );
            }
            throw new Error(
                `brAInwav license parsing failed from ${source}: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    /**
     * Extract license data from 1Password item
     */
    private extract1PasswordLicenseData(item: OnePasswordItem): License {
        // Extract from notes field (primary storage)
        const notes = item.fields?.find((field: OnePasswordField) => field.id === 'notesPlain')?.value;
        if (notes) {
            try {
                return JSON.parse(notes);
            } catch {
                // Fall through to field extraction
            }
        }

        // Extract from individual fields (fallback)
        const getField = (label: string) =>
            item.fields?.find((field: OnePasswordField) => field.label === label)?.value || '';

        return {
            licenseKey: getField('License Key'),
            customerEmail: getField('Customer Email'),
            brainwavOrganization: getField('Organization'),
            expirationDate: getField('Expiration'),
            maxUsers: parseInt(getField('Max Users'), 10) || 1,
            features: getField('Features').split(', ').filter(Boolean),
            issuedAt: getField('Issued At') || new Date().toISOString(),
        };
    }

    /**
     * Update cache with license data
     */
    private updateCache(license: License): void {
        this.cache = license;
        this.cacheExpiration = Date.now() + this.cacheDurationMs;
    }
}

/**
 * Create license manager from environment configuration
 */
export function createLicenseManagerFromEnv(): LicenseManager {
    return new LicenseManager({
        onePasswordItem: process.env.CORTEX_LICENSE_1P_ITEM,
        onePasswordVault: process.env.CORTEX_LICENSE_1P_VAULT,
        fallbackPath: process.env.CORTEX_LICENSE_FALLBACK_PATH,
        environmentOverride: process.env.CORTEX_LICENSE_ENV_VAR || 'CORTEX_LICENSE_DATA',
    });
}

/**
 * Initialize and validate license for brAInwav Cortex-OS
 */
export async function initializeLicense(): Promise<{ manager: LicenseManager; license: License }> {
    const manager = createLicenseManagerFromEnv();

    try {
        const license = await manager.getLicense();
        const validation = await manager.validateLicense();

        if (!validation.valid) {
            throw new Error(`brAInwav license invalid: ${validation.reason}`);
        }

        console.info(
            `[brAInwav] License valid for ${license.brainwavOrganization} (${validation.daysRemaining} days remaining)`,
        );

        return { manager, license };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`brAInwav license initialization failed: ${errorMessage}`);
    }
}
