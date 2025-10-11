/**
 * License management utilities leveraging the 1Password CLI.
 * Provides secure storage, retrieval, and validation of brAInwav license data.
 */

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const execAsync = promisify(exec);

const LICENSE_TEMP_PREFIX = 'brainwav-license-';
const LICENSE_PAYLOAD_FILENAME = 'license.json';

const escapeShellArg = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

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
	environmentOverride?: string;
}

interface InternalLicenseConfig {
	onePasswordItem: string;
	onePasswordVault: string;
	environmentOverride: string;
}

interface OnePasswordField {
	id?: string;
	label?: string;
	type: string;
	value: string;
}

interface OnePasswordItem {
	id?: string;
	title: string;
	category: string;
	vault?: { id?: string };
	fields?: OnePasswordField[];
}

type LicenseValidationResult = {
	valid: boolean;
	reason?: string;
	daysRemaining?: number;
};

/**
 * brAInwav License Manager with 1Password CLI integration
 */
export class LicenseManager {
	private readonly config: InternalLicenseConfig;
	private cache: License | null = null;
	private cacheExpiration = 0;
	private readonly cacheDurationMs = 5 * 60 * 1000;
	private opAvailableCache: boolean | null = null;
	private opAvailableCacheExpiration = 0;
	private readonly opAvailableCacheDurationMs = 60 * 60 * 1000; // Cache for 1 hour

	constructor(config: LicenseConfig = {}) {
		this.config = {
			onePasswordItem: config.onePasswordItem ?? 'brainwav-cortex-os-license',
			onePasswordVault: config.onePasswordVault ?? 'brAInwav Development',
			environmentOverride: config.environmentOverride ?? 'CORTEX_LICENSE_DATA',
		};
	}

	getConfiguration(): InternalLicenseConfig {
		return { ...this.config };
	}

	async getLicense(): Promise<License> {
		if (this.cache && Date.now() < this.cacheExpiration) {
			return this.cache;
		}

		const envLicense = process.env[this.config.environmentOverride];
		if (envLicense) {
			const license = this.parseLicense(envLicense, 'environment override');
			this.updateCache(license);
			return license;
		}

		const cliLicense = await this.fetchLicenseFrom1Password();
		if (cliLicense) {
			this.updateCache(cliLicense);
			return cliLicense;
		}

		throw new Error('brAInwav license not found in any configured source');
	}

	async storeLicense(license: License): Promise<void> {
		LicenseSchema.parse(license);

		await this.persistLicenseTo1Password(license);
		this.updateCache(license);

		console.info('[brAInwav] License successfully stored in 1Password CLI');
	}

	async validateLicense(): Promise<LicenseValidationResult> {
		try {
			const license = await this.getLicense();

			const now = new Date();
			const expiration = new Date(license.expirationDate);

			if (Number.isNaN(expiration.getTime()) || expiration <= now) {
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

	clearCache(): void {
		this.cache = null;
		this.cacheExpiration = 0;
		this.opAvailableCache = null;
		this.opAvailableCacheExpiration = 0;
	}

	private async fetchLicenseFrom1Password(): Promise<License | null> {
		const item = await this.fetch1PasswordItem();
		if (!item) {
			return null;
		}

		const payload = this.extract1PasswordLicenseData(item);
		return this.parseLicense(JSON.stringify(payload), '1Password CLI');
	}

	private async fetch1PasswordItem(skipAvailabilityCheck = false): Promise<OnePasswordItem | null> {
		if (!skipAvailabilityCheck && !(await this.is1PasswordAvailable())) {
			return null;
		}

		// Build command - use vault ID or name
		const command = [
			'op item get',
			escapeShellArg(this.config.onePasswordItem),
			`--vault=${escapeShellArg(this.config.onePasswordVault)}`,
			'--format=json',
		].join(' ');

		try {
			const { stdout } = await execAsync(command, { timeout: 10000 });
			const item = JSON.parse(stdout) as OnePasswordItem;
			console.debug('[brAInwav] License item retrieved from 1Password');
			return item;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			// Provide helpful error message if vault ambiguity detected
			if (errorMsg.includes('More than one vault matches')) {
				console.error(
					'[brAInwav] Multiple vaults with same name detected. Please set CORTEX_LICENSE_1P_VAULT to the vault ID instead of name.',
				);
			}
			this.warn1Password('1Password CLI error', error);
			return null;
		}
	}

	private async persistLicenseTo1Password(license: License): Promise<void> {
		await this.assert1PasswordAvailable();

		const itemPayload = this.build1PasswordItemPayload(license);
		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), LICENSE_TEMP_PREFIX));
		const payloadPath = path.join(tempDir, LICENSE_PAYLOAD_FILENAME);

		try {
			await fs.writeFile(payloadPath, JSON.stringify(itemPayload, null, 2), 'utf8');

			const existingItem = await this.fetch1PasswordItem(true);
			if (existingItem?.id) {
				const editCommand = [
					'op item edit',
					escapeShellArg(existingItem.id),
					`--input=${escapeShellArg(payloadPath)}`,
				].join(' ');
				await execAsync(editCommand);
			} else {
				const createCommand = [
					'op item create',
					`--vault=${escapeShellArg(this.config.onePasswordVault)}`,
					`--input=${escapeShellArg(payloadPath)}`,
				].join(' ');
				await execAsync(createCommand);
			}
		} finally {
			await fs.rm(tempDir, { recursive: true, force: true });
		}
	}

	private build1PasswordItemPayload(license: License): OnePasswordItem {
		return {
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
				{ label: 'Issued At', type: 'STRING', value: license.issuedAt },
			],
		};
	}

	private async assert1PasswordAvailable(): Promise<void> {
		if (!(await this.is1PasswordAvailable())) {
			throw new Error(
				'brAInwav license storage requires 1Password CLI installation and authentication',
			);
		}
	}

	private async is1PasswordAvailable(): Promise<boolean> {
		// Return cached result if still valid
		if (this.opAvailableCache !== null && Date.now() < this.opAvailableCacheExpiration) {
			return this.opAvailableCache;
		}

		try {
			// Use whoami which works with desktop app integration (biometric)
			// This doesn't require a session token when using 1Password app
			await execAsync('op whoami', { timeout: 5000 });

			// Cache successful result for 1 hour
			this.opAvailableCache = true;
			this.opAvailableCacheExpiration = Date.now() + this.opAvailableCacheDurationMs;
			console.debug('[brAInwav] 1Password CLI available and authenticated');
			return true;
		} catch (error) {
			// Cache failure result (but with shorter duration)
			this.opAvailableCache = false;
			this.opAvailableCacheExpiration = Date.now() + 5000; // Only cache failures for 5 seconds
			this.warn1Password('1Password CLI not available', error);
			return false;
		}
	}

	private warn1Password(message: string, error: unknown): void {
		const details = error instanceof Error ? error.message : String(error);
		console.warn(`[brAInwav] ${message}: ${details}`);
	}

	private extract1PasswordLicenseData(item: OnePasswordItem): License {
		const notes = item.fields?.find((field) => field.id === 'notesPlain')?.value;
		if (notes) {
			try {
				return JSON.parse(notes) as License;
			} catch {
				// fall through to field extraction when notes parsing fails
			}
		}

		const getField = (label: string) =>
			item.fields?.find((field) => field.label === label)?.value ?? '';

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

	private parseLicense(licenseData: string, source: string): License {
		try {
			const parsed = JSON.parse(licenseData) as Record<string, unknown>;
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
		environmentOverride: process.env.CORTEX_LICENSE_ENV_VAR,
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
