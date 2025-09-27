#!/usr/bin/env node

/**
 * Integrating Agent-Toolkit into Development Workflow
 *
 * This example shows how to integrate agent-toolkit checks
 * into your daily development workflow.
 */

import { createAgentToolkit } from '@cortex-os/agent-toolkit';
import { execSync } from 'child_process';
import { watch } from 'fs';

async function setupDevelopmentWorkflow() {
	const toolkit = await createAgentToolkit();

	console.log('🚀 Setting up Agent-Toolkit Development Workflow\n');

	// Pre-commit hooks
	console.log('1. Setting up pre-commit checks...');
	const preCommitChecks = async (files: string[]) => {
		console.log(`🔍 Running pre-commit checks on ${files.length} files...`);

		// Only check changed files
		const results = await Promise.all([
			toolkit.diagnostics.analyze({ include: files }),
			toolkit.cleanup.organizeImports({ files, removeUnused: true }),
			toolkit.validation.run({ targets: files }),
		]);

		const hasErrors = results.some((r) => !r.success || r.errors?.length);
		if (hasErrors) {
			console.error('❌ Pre-commit checks failed');
			process.exit(1);
		}

		console.log('✅ Pre-commit checks passed');
	};

	// Continuous monitoring
	console.log('2. Setting up continuous monitoring...');
	if (process.env.NODE_ENV === 'development') {
		// Watch for file changes
		watch('./packages/agent-toolkit/src', async (eventType, filename) => {
			if (eventType === 'change' && filename.endsWith('.ts')) {
				console.log(`📝 Change detected: ${filename}`);

				// Quick validation
				const validation = await toolkit.validation.quickValidate({
					file: `./packages/agent-toolkit/src/${filename}`,
					checks: ['syntax', 'imports', 'exports'],
				});

				if (!validation.success) {
					console.log('⚠️ Issues found:', validation.issues);
				}
			}
		});
	}

	// Build integration
	console.log('3. Setting up build integration...');
	const buildWithValidation = async () => {
		console.log('🏗️ Running build with validation...');

		// Pre-build checks
		const preBuild = await toolkit.validation.run({
			targets: ['packages/agent-toolkit'],
			checks: ['typescript', 'dependencies', 'exports'],
		});

		if (!preBuild.success) {
			console.error('❌ Pre-build validation failed');
			console.log('Issues:', preBuild.issues);
			return false;
		}

		// Run build
		try {
			execSync('cd packages/agent-toolkit && pnpm build', { stdio: 'inherit' });
			console.log('✅ Build successful');
			return true;
		} catch (error) {
			console.error('❌ Build failed:', error);
			return false;
		}
	};

	// Test integration
	console.log('4. Setting up test integration...');
	const testWithDiagnostics = async () => {
		console.log('🧪 Running tests with diagnostics...');

		// Check test files for issues
		const testDiagnostics = await toolkit.diagnostics.analyze({
			include: ['packages/agent-toolkit/__tests__/**/*.ts'],
			severity: ['error', 'warning'],
		});

		if (testDiagnostics.errors.length > 0) {
			console.log('⚠️ Test files have issues:');
			testDiagnostics.errors.forEach((err) => {
				console.log(`  ${err.file}:${err.line}: ${err.message}`);
			});
		}

		// Run tests
		try {
			execSync('cd packages/agent-toolkit && pnpm test', { stdio: 'inherit' });
			console.log('✅ Tests passed');
		} catch (error) {
			console.error('❌ Tests failed');
		}
	};

	// Export workflow functions
	return {
		preCommitChecks,
		buildWithValidation,
		testWithDiagnostics,
		// Utility functions
		async fixCommonIssues() {
			console.log('🔧 Fixing common issues...');

			await Promise.all([
				toolkit.cleanup.organizeImports({
					files: ['packages/agent-toolkit/src/**/*.ts'],
					removeUnused: true,
					sortImports: true,
				}),
				toolkit.types.fixImplicitAny({
					files: ['packages/agent-toolkit/src/**/*.ts'],
					excludePatterns: ['__tests__'],
				}),
			]);

			console.log('✅ Common issues fixed');
		},
	};
}

// Usage example
async function main() {
	const workflow = await setupDevelopmentWorkflow();

	// Example: Run before committing
	if (process.argv.includes('--pre-commit')) {
		const changedFiles = process.argv.slice(3);
		await workflow.preCommitChecks(changedFiles);
	}

	// Example: Build with validation
	if (process.argv.includes('--build')) {
		await workflow.buildWithValidation();
	}

	// Example: Run tests with diagnostics
	if (process.argv.includes('--test')) {
		await workflow.testWithDiagnostics();
	}

	// Example: Fix common issues
	if (process.argv.includes('--fix')) {
		await workflow.fixCommonIssues();
	}

	// Default: Show help
	if (process.argv.length === 2) {
		console.log(`
Usage:
  --pre-commit [files...]  Run pre-commit checks
  --build                  Run build with validation
  --test                   Run tests with diagnostics
  --fix                    Fix common issues
    `);
	}
}

main().catch(console.error);
