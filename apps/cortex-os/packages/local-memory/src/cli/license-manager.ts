#!/usr/bin/env node

/**
 * @file License Management CLI Tool
 * @description Command-line interface for brAInwav license operations
 */

import { Command } from 'commander';
import {
	createLicenseManagerFromEnv,
	type License,
	LicenseManager,
	LicenseSchema,
} from '../license/index.js';

const program = new Command();

program
	.name('cortex-license')
	.description('brAInwav Cortex-OS License Management CLI')
	.version('1.0.0');

/**
 * Get license information
 */
program
	.command('info')
	.description('Display current license information')
	.option('--validate', 'Validate license and check expiration')
	.action(async (options) => {
		try {
			const manager = createLicenseManagerFromEnv();
			const license = await manager.getLicense();

			console.log('\n🛡️  brAInwav Cortex-OS License Information\n');
			console.log(`Organization: ${license.brainwavOrganization}`);
			console.log(`Customer: ${license.customerEmail}`);
			console.log(`Max Users: ${license.maxUsers}`);
			console.log(`Features: ${license.features.join(', ')}`);
			console.log(`Issued: ${new Date(license.issuedAt).toLocaleDateString()}`);
			console.log(`Expires: ${new Date(license.expirationDate).toLocaleDateString()}`);

			if (options.validate) {
				console.log('\n🔍 Validation Results:\n');
				const validation = await manager.validateLicense();

				if (validation.valid) {
					console.log(`✅ License is valid (${validation.daysRemaining} days remaining)`);

					if (validation.daysRemaining && validation.daysRemaining <= 30) {
						console.log(`⚠️  License expires in ${validation.daysRemaining} days - please renew`);
					}
				} else {
					console.log(`❌ License is invalid: ${validation.reason}`);
					process.exit(1);
				}
			}
		} catch (error) {
			console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	});

/**
 * Store license in 1Password
 */
program
	.command('store')
	.description('Store license in 1Password CLI')
	.requiredOption('-f, --file <file>', 'License JSON file to store')
	.option('--item <item>', '1Password item name (default: brainwav-cortex-os-license)')
	.option('--vault <vault>', '1Password vault name (default: brAInwav Development)')
	.action(async (options) => {
		try {
			const fs = await import('node:fs/promises');

			// Read license file
			const licenseData = await fs.readFile(options.file, 'utf8');
			const license = LicenseSchema.parse(JSON.parse(licenseData));

			// Create manager with custom config if provided
			const manager = new LicenseManager({
				onePasswordItem: options.item,
				onePasswordVault: options.vault,
			});

			// Store license
			await manager.storeLicense(license);

			console.log('✅ License successfully stored in 1Password CLI');
			console.log(`   Item: ${options.item || 'brainwav-cortex-os-license'}`);
			console.log(`   Vault: ${options.vault || 'brAInwav Development'}`);
		} catch (error) {
			console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	});

/**
 * Generate sample license file
 */
program
	.command('generate-sample')
	.description('Generate a sample license file for testing')
	.requiredOption('-o, --output <file>', 'Output file path')
	.action(async (options) => {
		try {
			const fs = await import('node:fs/promises');
			const path = await import('node:path');

			const sampleLicense: License = {
				licenseKey: `brainwav-dev-${Math.random().toString(36).substring(2, 15)}`,
				customerEmail: 'development@brainwav.com',
				brainwavOrganization: 'brAInwav Development Team',
				expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
				maxUsers: 50,
				features: ['local-memory', 'rag-processing', 'evaluation-harness', 'multi-modal'],
				issuedAt: new Date().toISOString(),
			};

			// Ensure output directory exists
			await fs.mkdir(path.dirname(options.output), { recursive: true });

			// Write sample license
			await fs.writeFile(options.output, JSON.stringify(sampleLicense, null, 2));

			console.log('✅ Sample license generated');
			console.log(`   File: ${options.output}`);
			console.log('⚠️  This is a development license - do not use in production');
		} catch (error) {
			console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	});

/**
 * Validate license file
 */
program
	.command('validate-file')
	.description('Validate a license file format')
	.requiredOption('-f, --file <file>', 'License JSON file to validate')
	.action(async (options) => {
		try {
			const fs = await import('node:fs/promises');

			// Read and validate license file
			const licenseData = await fs.readFile(options.file, 'utf8');
			const license = LicenseSchema.parse(JSON.parse(licenseData));

			console.log('✅ License file is valid');
			console.log(`   Organization: ${license.brainwavOrganization}`);
			console.log(`   Customer: ${license.customerEmail}`);
			console.log(`   Expires: ${new Date(license.expirationDate).toLocaleDateString()}`);

			// Check expiration
			const now = new Date();
			const expiration = new Date(license.expirationDate);

			if (expiration <= now) {
				console.log('⚠️  License has expired');
			} else {
				const daysRemaining = Math.ceil(
					(expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
				);
				console.log(`   Days remaining: ${daysRemaining}`);
			}
		} catch (error) {
			console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	});

/**
 * Clear license cache
 */
program
	.command('clear-cache')
	.description('Clear cached license data')
	.action(async () => {
		try {
			const manager = createLicenseManagerFromEnv();
			manager.clearCache();

			console.log('✅ License cache cleared');
		} catch (error) {
			console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	});

/**
 * Check 1Password CLI installation
 */
program
	.command('check-1password')
	.description('Check 1Password CLI installation and authentication')
	.action(async () => {
		try {
			const { exec } = await import('node:child_process');
			const { promisify } = await import('node:util');
			const execAsync = promisify(exec);

			console.log('🔍 Checking 1Password CLI installation...\n');

			// Check if 1Password CLI is installed
			try {
				const { stdout } = await execAsync('op --version');
				console.log(`✅ 1Password CLI installed: ${stdout.trim()}`);
			} catch {
				console.log('❌ 1Password CLI not installed');
				console.log('   Install from: https://developer.1password.com/docs/cli/get-started/');
				process.exit(1);
			}

			// Check authentication
			try {
				await execAsync('op account list');
				console.log('✅ 1Password CLI authenticated');
			} catch {
				console.log('❌ 1Password CLI not authenticated');
				console.log('   Run: op signin');
				process.exit(1);
			}

			// Check vault access
			try {
				const manager = createLicenseManagerFromEnv();
				const config = manager['config']; // Access private config for testing
				await execAsync(`op vault list --format=json`);
				console.log(`✅ Can access 1Password vaults`);
				console.log(`   Target vault: ${config.onePasswordVault}`);
			} catch {
				console.log('⚠️  Cannot list vaults - check permissions');
			}
		} catch (error) {
			console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
			process.exit(1);
		}
	});

// Handle unknown commands
program.on('command:*', () => {
	console.error('❌ Invalid command. See --help for available commands.');
	process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
	program.outputHelp();
}
