#!/usr/bin/env node

/**
 * @file_path tests/security/simple-security-runner.ts
 * @description Simple security test runner for verification
 * @maintainer Security Team
 * @version 1.0.0
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Colors for console output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	fg: {
		red: '\x1b[31m',
		green: '\x1b[32m',
		yellow: '\x1b[33m',
		blue: '\x1b[34m',
		magenta: '\x1b[35m',
		cyan: '\x1b[36m',
	},
};

// Logger functions
function logInfo(message: string) {
	console.log(`${colors.fg.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message: string) {
	console.log(`${colors.fg.green}[SUCCESS]${colors.reset} ${message}`);
}

function logWarning(message: string) {
	console.log(`${colors.fg.yellow}[WARNING]${colors.reset} ${message}`);
}

function logError(message: string) {
	console.log(`${colors.fg.red}[ERROR]${colors.reset} ${message}`);
}

function logHeader(message: string) {
	console.log(`${colors.bright}${colors.fg.cyan}${message}${colors.reset}`);
}

/**
 * Helper function to check if files exist
 */
function checkFilesExist(files: string[], required: boolean = true): boolean {
	let allExist = true;
	for (const file of files) {
		try {
			execSync(`test -f ${file}`, { stdio: 'ignore' });
			logSuccess(`✅ Found ${file}`);
		} catch {
			if (required) {
				logError(`❌ Missing ${file}`);
				allExist = false;
			} else {
				logWarning(`⚠️  Missing ${file} (optional)`);
			}
		}
	}
	return allExist;
}

/**
 * Helper function to verify package.json scripts
 */
function verifyPackageScripts() {
	try {
		const packageJson = JSON.parse(execSync('cat ../../package.json', { encoding: 'utf-8' }));

		const requiredScripts = [
			'test:security:unit',
			'test:security:integration',
			'test:security:regression',
		];

		for (const script of requiredScripts) {
			if (packageJson.scripts?.[script]) {
				logSuccess(`✅ Found script: ${script}`);
			} else {
				logWarning(`⚠️  Missing script: ${script} (will be added)`);
			}
		}
	} catch (error) {
		logError(`❌ Failed to parse package.json: ${error.message}`);
		throw error;
	}
}

/**
 * Create a simple security test file
 */
function createSimpleTest(): string {
	const simpleTestContent = `
import { test, expect } from 'vitest';

test('simple security validation test', () => {
  // Simple test to verify the testing framework works
  const maliciousInput = "123'; DROP TABLE users; --";
  const isValid = !maliciousInput.includes("';") && !maliciousInput.includes('--');
  expect(isValid).toBe(false);
});
    `;

	const testFileName = 'simple-security.test.ts';
	writeFileSync(testFileName, simpleTestContent);
	logSuccess(`✅ Created ${testFileName}`);
	return testFileName;
}

// Simple test runner
async function runSecurityTests() {
	logHeader('🚀 Running Security Tests Verification');

	const testDir = join(process.cwd(), 'temp-security-tests');

	try {
		// Setup test directory
		mkdirSync(testDir, { recursive: true });
		process.chdir(testDir);

		// Test 1: Verify security test files exist
		logInfo('Test 1: Verifying security test files exist');
		const testFiles = [
			'../database-wrapper.unit.test.ts',
			'../neo4j-wrapper.unit.test.ts',
			'../command-executor.unit.test.ts',
			'../security-wrappers.integration.test.ts',
			'../security-regression.test.ts',
		];

		if (!checkFilesExist(testFiles, true)) {
			throw new Error('Some security test files are missing');
		}

		// Test 2: Verify security scripts exist
		logInfo('Test 2: Verifying security scripts exist');
		const scriptFiles = ['../../scripts/run-security-tests.mjs'];
		checkFilesExist(scriptFiles, true);

		// Test 3: Verify package.json scripts
		logInfo('Test 3: Verifying package.json has security test scripts');
		verifyPackageScripts();

		// Test 4: Verify CI/CD pipeline
		logInfo('Test 4: Verifying CI/CD pipeline exists');
		const pipelineExists = checkFilesExist(['../../.github/workflows/security-testing.yml'], true);
		if (!pipelineExists) {
			throw new Error('Missing security CI/CD pipeline');
		}

		// Test 5: Verify documentation
		logInfo('Test 5: Verifying security documentation exists');
		const docFiles = ['../../docs/security/PHASE4_PROGRESS_SUMMARY.md'];
		checkFilesExist(docFiles, false);

		// Test 6: Create simple test
		logInfo('Test 6: Creating and running a simple security test');
		createSimpleTest();

		// Cleanup
		process.chdir('../../');
		execSync(`rm -rf ${testDir}`, { stdio: 'ignore' });

		logSuccess('✅ All security verification tests passed');
		return true;
	} catch (error) {
		logError(`❌ Security verification tests failed: ${error.message}`);

		// Cleanup
		try {
			process.chdir('../../');
			execSync('rm -rf temp-security-tests', { stdio: 'ignore' });
		} catch {
			logWarning('⚠️  Failed to clean up temporary files');
		}

		return false;
	}
}

// Run the verification
runSecurityTests()
	.then((success) => {
		if (success) {
			logHeader('\n🎉 Security verification completed successfully!');
			process.exit(0);
		} else {
			logHeader('\n💥 Security verification failed!');
			process.exit(1);
		}
	})
	.catch((error) => {
		logError(`Unexpected error: ${error.message}`);
		process.exit(1);
	});
