#!/usr/bin/env node

/**
 * @file_path scripts/license-scanner.mjs
 * @description Comprehensive license scanner for detecting and blocking GPL/AGPL dependencies
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude-3-5-sonnet-20241022
 * @ai_provenance_hash N/A
 */

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Package name validation to prevent command injection
function validatePackageName(packageName) {
	if (!packageName || typeof packageName !== 'string') {
		return false;
	}

	// npm package names can only contain URL-safe characters
	// See: https://docs.npmjs.com/cli/v8/configuring-npm/package-json#name
	// For security, tildes (~) are excluded from the validation pattern to reduce risk of command injection.
	const validNamePattern = /^(@[a-z0-9-][a-z0-9-._]*\/)?[a-z0-9-][a-z0-9-._]*$/;
	return validNamePattern.test(packageName) && packageName.length <= 214;
}

class LicenseScanner {
	constructor(workspacePath = '.', policyPath = './license-policy.json') {
		this.workspacePath = workspacePath;
		this.policyPath = policyPath;
		this.policy = null;
		this.violations = [];
		this.dependencies = new Map();
		this.licenseCache = new Map();
	}

	async loadPolicy() {
		try {
			const policyContent = await fs.readFile(this.policyPath, 'utf8');
			this.policy = JSON.parse(policyContent);
			console.log(`📋 Loaded license policy: ${this.policy.version}`);
		} catch (error) {
			throw new Error(`Failed to load license policy from ${this.policyPath}: ${error.message}`);
		}
	}

	async scanPackageJsonDependencies() {
		console.log('🔍 Scanning package.json dependencies...');

		try {
			const packageJsonPath = path.join(this.workspacePath, 'package.json');
			const packageContent = await fs.readFile(packageJsonPath, 'utf8');
			const packageJson = JSON.parse(packageContent);

			const allDeps = {
				...(packageJson.dependencies || {}),
				...(packageJson.devDependencies || {}),
				...(packageJson.peerDependencies || {}),
				...(packageJson.optionalDependencies || {}),
			};

			console.log(`📦 Found ${Object.keys(allDeps).length} dependencies in package.json`);

			for (const [name, version] of Object.entries(allDeps)) {
				this.dependencies.set(name, {
					version: version.replace(/^[\^~]/, ''),
					type: 'npm',
					source: 'package.json',
				});
			}
		} catch (error) {
			console.warn(`⚠️ Could not scan package.json: ${error.message}`);
		}
	}

	async getInstalledPackageLicenses() {
		console.log('🔍 Detecting licenses from installed packages...');

		try {
			// Try to use license-checker if available, otherwise fall back to manual detection
			const licenseData = {};

			try {
				// Attempt to use npm ls to get installed packages asynchronously
				const { stdout } = await execAsync('npm ls --json --depth=0 2>/dev/null || echo "{}"', {
					cwd: this.workspacePath,
					encoding: 'utf8',
				});

				const lsData = JSON.parse(stdout);
				if (lsData.dependencies) {
					for (const [name, info] of Object.entries(lsData.dependencies)) {
						licenseData[name] = {
							licenses: info.license || 'Unknown',
							repository: info.repository || '',
							path: info.path || '',
							version: info.version || '',
						};
					}
				}
			} catch (_error) {
				console.warn('⚠️ Could not get license data from npm ls, proceeding with manual detection');
			}

			// Batch detection for packages without license data
			const packagesNeedingDetection = [];
			for (const [name, _depInfo] of this.dependencies) {
				if (!licenseData[name]) {
					packagesNeedingDetection.push(name);
				}
			}

			if (packagesNeedingDetection.length > 0) {
				const batchLicenses = await this.batchDetectLicenses(packagesNeedingDetection);
				for (const [name, depInfo] of this.dependencies) {
					if (!licenseData[name] && batchLicenses.has(name)) {
						licenseData[name] = {
							licenses: batchLicenses.get(name),
							version: depInfo.version,
							type: depInfo.type,
						};
					}
				}
			}

			return licenseData;
		} catch (error) {
			console.error(`❌ Failed to get package licenses: ${error.message}`);
			return {};
		}
	}

	async detectPackageLicense(packageName) {
		if (this.licenseCache.has(packageName)) {
			return this.licenseCache.get(packageName);
		}

		// Validate package name to prevent command injection
		if (!validatePackageName(packageName)) {
			console.warn(`⚠️ Invalid package name: ${packageName}`);
			this.licenseCache.set(packageName, 'Unknown');
			return 'Unknown';
		}

		try {
			// Try to find package.json in node_modules
			const packagePath = path.join(
				this.workspacePath,
				'node_modules',
				packageName,
				'package.json',
			);

			try {
				const packageContent = await fs.readFile(packagePath, 'utf8');
				const packageJson = JSON.parse(packageContent);
				const license = packageJson.license || packageJson.licenses || 'Unknown';
				this.licenseCache.set(packageName, license);
				return license;
			} catch {
				// Package not installed or no package.json
			}

			// Try to get from npm registry as fallback using async exec
			try {
				const { stdout } = await execAsync(
					`npm view "${packageName}" license 2>/dev/null || echo "Unknown"`,
					{
						encoding: 'utf8',
						timeout: 5000,
					},
				);
				const license = stdout.trim() || 'Unknown';
				this.licenseCache.set(packageName, license);
				return license;
			} catch {
				// NPM view failed
			}

			this.licenseCache.set(packageName, 'Unknown');
			return 'Unknown';
		} catch (error) {
			console.warn(`⚠️ Could not detect license for ${packageName}: ${error.message}`);
			this.licenseCache.set(packageName, 'Unknown');
			return 'Unknown';
		}
	}

	// Batch license detection for better performance
	async batchDetectLicenses(packageNames) {
		const results = new Map();
		const uncachedPackages = packageNames.filter((name) => !this.licenseCache.has(name));

		if (uncachedPackages.length === 0) {
			// All packages are cached
			for (const name of packageNames) {
				results.set(name, this.licenseCache.get(name));
			}
			return results;
		}

		console.log(`🔍 Batch fetching licenses for ${uncachedPackages.length} packages...`);

		// First try to get licenses from local node_modules in parallel
		const localLicensePromises = uncachedPackages.map(async (packageName) => {
			if (!validatePackageName(packageName)) {
				return { packageName, license: 'Unknown' };
			}

			try {
				const packagePath = path.join(
					this.workspacePath,
					'node_modules',
					packageName,
					'package.json',
				);
				const packageContent = await fs.readFile(packagePath, 'utf8');
				const packageJson = JSON.parse(packageContent);
				const license = packageJson.license || packageJson.licenses || 'Unknown';
				return { packageName, license };
			} catch {
				return { packageName, license: null }; // Will fetch from registry
			}
		});

		const localResults = await Promise.all(localLicensePromises);
		const needRegistryFetch = [];

		for (const { packageName, license } of localResults) {
			if (license && license !== 'Unknown') {
				this.licenseCache.set(packageName, license);
				results.set(packageName, license);
			} else {
				needRegistryFetch.push(packageName);
			}
		}

		// Batch fetch from npm registry in smaller chunks to avoid overwhelming the API
		const BATCH_SIZE = 5;
		for (let i = 0; i < needRegistryFetch.length; i += BATCH_SIZE) {
			const batch = needRegistryFetch.slice(i, i + BATCH_SIZE);
			const batchPromises = batch.map(async (packageName) => {
				try {
					const { stdout } = await execAsync(
						`npm view "${packageName}" license 2>/dev/null || echo "Unknown"`,
						{
							encoding: 'utf8',
							timeout: 5000,
						},
					);
					const license = stdout.trim() || 'Unknown';
					return { packageName, license };
				} catch {
					return { packageName, license: 'Unknown' };
				}
			});

			const batchResults = await Promise.all(batchPromises);
			for (const { packageName, license } of batchResults) {
				this.licenseCache.set(packageName, license);
				results.set(packageName, license);
			}

			// Small delay between batches to be respectful to npm registry
			if (i + BATCH_SIZE < needRegistryFetch.length) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		// Add cached results for any packages that were already cached
		for (const name of packageNames) {
			if (!results.has(name) && this.licenseCache.has(name)) {
				results.set(name, this.licenseCache.get(name));
			}
		}

		return results;
	}

	normalizedLicense(license) {
		if (!license || typeof license !== 'string') {
			return 'Unknown';
		}

		// Handle common license format variations
		return license
			.trim()
			.replace(/\s+/g, ' ')
			.replace(/\(|\)/g, '')
			.replace(/\s*AND\s*/gi, ' AND ')
			.replace(/\s*OR\s*/gi, ' OR ');
	}

	isLicenseBlocked(license) {
		const normalizedLicense = this.normalizedLicense(license);

		// Check exact match in blocked licenses
		if (this.policy.blockedLicenses.licenses.includes(normalizedLicense)) {
			return true;
		}

		// Check if any blocked license is contained in the license string
		return this.policy.blockedLicenses.licenses.some((blockedLicense) =>
			normalizedLicense.toLowerCase().includes(blockedLicense.toLowerCase()),
		);
	}

	isLicenseAllowed(license) {
		const normalizedLicense = this.normalizedLicense(license);

		// Check exact match in allowed licenses
		if (this.policy.allowedLicenses.licenses.includes(normalizedLicense)) {
			return true;
		}

		// Check if any allowed license is contained in the license string
		return this.policy.allowedLicenses.licenses.some((allowedLicense) =>
			normalizedLicense.toLowerCase().includes(allowedLicense.toLowerCase()),
		);
	}

	isPackageExempt(packageName) {
		return this.policy.exemptions.packages.includes(packageName);
	}

	analyzeCompliance(licenseData) {
		console.log('🔍 Analyzing license compliance...');

		this.violations = [];
		const compliant = [];
		const unknown = [];

		for (const [packageName, info] of Object.entries(licenseData)) {
			const license = info.licenses;

			// Skip exempt packages
			if (this.isPackageExempt(packageName)) {
				console.log(`⚠️ ${packageName}: Exempt from license checking`);
				continue;
			}

			// Check for blocked licenses
			if (this.isLicenseBlocked(license)) {
				this.violations.push({
					package: packageName,
					version: info.version,
					license: license,
					severity: 'CRITICAL',
					reason: 'Blocked license detected',
					action: 'Remove package or find alternative',
				});
				console.log(`❌ ${packageName}@${info.version}: BLOCKED license "${license}"`);
				continue;
			}

			// Check for allowed licenses
			if (this.isLicenseAllowed(license)) {
				compliant.push({
					package: packageName,
					version: info.version,
					license: license,
					status: 'COMPLIANT',
				});
				console.log(`✅ ${packageName}@${info.version}: Compliant license "${license}"`);
				continue;
			}

			// Unknown or unlisted license
			if (license === 'Unknown' || !license) {
				unknown.push({
					package: packageName,
					version: info.version,
					license: license,
					severity: this.policy.policy.allowUnknownLicenses ? 'WARNING' : 'ERROR',
					reason: 'License could not be determined',
					action: 'Manually verify license compatibility',
				});
				console.log(`❓ ${packageName}@${info.version}: Unknown license`);

				if (!this.policy.policy.allowUnknownLicenses) {
					this.violations.push({
						package: packageName,
						version: info.version,
						license: license,
						severity: 'ERROR',
						reason: 'Unknown license not allowed by policy',
						action: 'Determine actual license or add to exemptions',
					});
				}
				continue;
			}

			// License not in allowed list
			this.violations.push({
				package: packageName,
				version: info.version,
				license: license,
				severity: 'WARNING',
				reason: 'License not in allowed list',
				action: 'Review license compatibility and add to policy if acceptable',
			});
			console.log(`⚠️ ${packageName}@${info.version}: Unrecognized license "${license}"`);
		}

		return { compliant, unknown, violations: this.violations };
	}

	async generateComplianceReport(analysis) {
		const report = {
			timestamp: new Date().toISOString(),
			scanner: {
				name: 'cortex-os-license-scanner',
				version: '1.0.0',
			},
			policy: {
				version: this.policy.version,
				enforcement: this.policy.policy.enforcement,
			},
			summary: {
				totalPackages: this.dependencies.size,
				compliantPackages: analysis.compliant.length,
				unknownLicenses: analysis.unknown.length,
				violations: this.violations.length,
				criticalViolations: this.violations.filter((v) => v.severity === 'CRITICAL').length,
				status:
					this.violations.filter((v) => v.severity === 'CRITICAL').length > 0 ? 'FAILED' : 'PASSED',
			},
			violations: this.violations,
			compliant: analysis.compliant,
			unknownLicenses: analysis.unknown,
			policyConfiguration: {
				blockedLicenses: this.policy.blockedLicenses.licenses,
				allowedLicenses: this.policy.allowedLicenses.licenses,
				exemptions: this.policy.exemptions.packages,
			},
		};

		if (this.policy.reporting.generateReport) {
			const reportPath = this.policy.reporting.reportPath;
			await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
			console.log(`📊 Compliance report generated: ${reportPath}`);
		}

		return report;
	}

	printSummary(report) {
		console.log('\n📊 License Compliance Summary');
		console.log('================================');
		console.log(`Total packages scanned: ${report.summary.totalPackages}`);
		console.log(`Compliant packages: ${report.summary.compliantPackages}`);
		console.log(`Unknown licenses: ${report.summary.unknownLicenses}`);
		console.log(`License violations: ${report.summary.violations}`);
		console.log(`Critical violations: ${report.summary.criticalViolations}`);
		console.log(`Overall status: ${report.summary.status}`);

		if (this.violations.length > 0) {
			console.log('\n❌ License Violations Found:');
			this.violations.forEach((violation) => {
				console.log(`  - ${violation.package}@${violation.version}`);
				console.log(`    License: ${violation.license}`);
				console.log(`    Severity: ${violation.severity}`);
				console.log(`    Reason: ${violation.reason}`);
				console.log(`    Action: ${violation.action}`);
				console.log('');
			});
		}
	}

	async scan() {
		try {
			console.log('🚀 Starting license compliance scan...');

			await this.loadPolicy();
			await this.scanPackageJsonDependencies();

			const licenseData = await this.getInstalledPackageLicenses();
			const analysis = this.analyzeCompliance(licenseData);
			const report = await this.generateComplianceReport(analysis);

			this.printSummary(report);

			// Determine exit code based on policy
			const criticalViolations = this.violations.filter((v) => v.severity === 'CRITICAL');
			if (this.policy.policy.failOnBlockedLicense && criticalViolations.length > 0) {
				console.log('\n💥 Critical license violations found. Build should fail.');
				return { success: false, report, exitCode: 1 };
			}

			console.log('\n✅ License compliance scan completed successfully.');
			return { success: true, report, exitCode: 0 };
		} catch (error) {
			console.error('💥 License scanning failed:', error.message);
			return { success: false, error: error.message, exitCode: 1 };
		}
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);
	const workspacePath = args[0] || '.';
	const policyPath = args[1] || './license-policy.json';

	const scanner = new LicenseScanner(workspacePath, policyPath);
	const result = await scanner.scan();

	if (result.exitCode !== 0) {
		process.exit(result.exitCode);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error('❌ License scanner failed:', error);
		process.exit(1);
	});
}

export { LicenseScanner };

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
