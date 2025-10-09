#!/usr/bin/env node

/**
 * MCP Test Runner
 * Comprehensive test execution script for MCP versioned contracts
 */

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '../..');

const COLORS = {
	RED: '\x1b[31m',
	GREEN: '\x1b[32m',
	YELLOW: '\x1b[33m',
	BLUE: '\x1b[34m',
	MAGENTA: '\x1b[35m',
	CYAN: '\x1b[36m',
	RESET: '\x1b[0m',
	BOLD: '\x1b[1m',
};

function log(color, message) {
	console.log(`${color}${message}${COLORS.RESET}`);
}

function runCommand(command, description) {
	log(COLORS.BLUE, `\n🔄 ${description}...`);
	try {
		execSync(command, {
			cwd: packageRoot,
			stdio: 'inherit',
			stderr: 'inherit',
		});
		log(COLORS.GREEN, `✅ ${description} completed successfully`);
		return true;
	} catch (_error) {
		log(COLORS.RED, `❌ ${description} failed`);
		return false;
	}
}

async function runTests() {
	log(COLORS.BOLD + COLORS.MAGENTA, '\n🚀 MCP Versioned Contracts Test Suite');
	log(COLORS.CYAN, 'Comprehensive testing for MCP notifications, versioning, and integration\n');

	const testSuites = [
		{
			command: 'npx vitest run src/__tests__/server.test.ts --reporter=verbose',
			description: 'Core MCP Server Tests',
		},
		{
			command: 'npx vitest run src/__tests__/fsWatcher.test.ts --reporter=verbose',
			description: 'File System Watcher Tests',
		},
		{
			command: 'npx vitest run src/__tests__/toolRegistry.test.ts --reporter=verbose',
			description: 'Versioned Tool Registry Tests',
		},
		{
			command: 'npx vitest run src/__tests__/toolsCall.test.ts --reporter=verbose',
			description: 'SEP-1575 Tool Call Handler Tests',
		},
		{
			command: 'npx vitest run src/__tests__/refreshTool.test.ts --reporter=verbose',
			description: 'Manual Refresh Tool Tests',
		},
		{
			command: 'npx vitest run src/__tests__/notificationHandlers.test.ts --reporter=verbose',
			description: 'Notification Handler Tests',
		},
		{
			command: 'npx vitest run src/__tests__/configuration.test.ts --reporter=verbose',
			description: 'Configuration Management Tests',
		},
		{
			command: 'npx vitest run src/__tests__/integration.test.ts --reporter=verbose',
			description: 'End-to-End Integration Tests',
		},
	];

	let passedTests = 0;
	const totalTests = testSuites.length;

	for (const testSuite of testSuites) {
		const success = runCommand(testSuite.command, testSuite.description);
		if (success) {
			passedTests++;
		}
	}

	// Run coverage report
	log(COLORS.BLUE, '\n📊 Generating coverage report...');
	const coverageSuccess = runCommand('npx vitest run --coverage', 'Coverage Analysis');

	// Summary
	log(COLORS.BOLD + COLORS.MAGENTA, '\n📋 Test Suite Summary');
	log(COLORS.CYAN, `Total test suites: ${totalTests}`);
	log(COLORS.GREEN, `Passed: ${passedTests}`);

	if (passedTests < totalTests) {
		log(COLORS.RED, `Failed: ${totalTests - passedTests}`);
		log(COLORS.RED + COLORS.BOLD, '\n❌ Some tests failed. Please check the output above.');
		process.exit(1);
	} else {
		log(COLORS.GREEN + COLORS.BOLD, '\n✅ All tests passed successfully!');

		if (coverageSuccess) {
			log(COLORS.GREEN, '📈 Coverage report generated successfully');
		}

		log(COLORS.CYAN, '\n🎯 MCP Versioned Contracts implementation is ready for production!');
	}
}

// Error handling
process.on('uncaughtException', (error) => {
	log(COLORS.RED + COLORS.BOLD, `💥 Uncaught exception: ${error.message}`);
	console.error(error);
	process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
	log(COLORS.RED + COLORS.BOLD, `💥 Unhandled rejection at: ${promise}`);
	console.error(reason);
	process.exit(1);
});

// Run tests
runTests().catch((error) => {
	log(COLORS.RED + COLORS.BOLD, `💥 Test runner failed: ${error.message}`);
	console.error(error);
	process.exit(1);
});
