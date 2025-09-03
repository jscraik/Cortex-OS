#!/usr/bin/env tsx

/**
 * Structure Guard - Monorepo Policy Enforcement
 *
 * This script enforces monorepo structure policies by:
 * 1. Checking for disallowed file placements
 * 2. Ensuring required files exist
 * 3. Validating file patt// Report findings
let exitCode = 0;ackages
 * 4. Enforcing import rules
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import micromatch from 'micromatch';
import { z } from 'zod';

// Resolve the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the policy schema
const policySchema = z.object({
	version: z.string(),
	allowedPaths: z.record(z.array(z.string())),
	allowedRootEntries: z.array(z.string()),
	filePatterns: z.record(
		z.object({
			required: z.array(z.string()),
			requireOneOf: z.array(z.string()),
			allowed: z.array(z.string()),
		}),
	),
	maxFilesPerChange: z.number(),
	overrideRules: z.object({
		migrationMode: z.boolean(),
		overrideRequiresApproval: z.array(z.string()),
		maxFilesWithOverride: z.number(),
	}),
	protectedFiles: z.array(z.string()),
	allowedGlobs: z.array(z.string()),
	deniedGlobs: z.array(z.string()).default([]),
	importRules: z.object({
		bannedPatterns: z.array(z.string()),
		allowedCrossPkgImports: z.array(z.string()),
	}),
	enforcement: z.object({
		blockUnknownRoots: z.boolean(),
		blockUnknownPaths: z.boolean(),
	}),
	testRequirements: z.object({
		minCoverage: z.number(),
		requiredTestDirs: z.array(z.string()),
		excludeFromCoverage: z.array(z.string()),
	}),
});

// Load and parse policy
const policyPath = path.join(__dirname, 'policy.json');
const policy = policySchema.parse(JSON.parse(readFileSync(policyPath, 'utf8')));

// Get all files in the repository, excluding ignored directories
const files = await globby(
	[
		'**/*',
		'!**/node_modules/**',
		'!**/dist/**',
		'!**/.git/**',
		'!**/.turbo/**',
	],
	{ dot: true },
);

function validateAllowedFiles(files: string[]): string[] {
	return files.filter(
		(f) => !micromatch.isMatch(f, policy.allowedGlobs, { dot: true }),
	);
}

function validateProtectedFiles(files: string[]): string[] {
	const missing: string[] = [];
	for (const pattern of policy.protectedFiles) {
		const matches = files.some((f) =>
			micromatch.isMatch(f, pattern, { dot: true }),
		);
		if (!matches) {
			missing.push(pattern);
		}
	}
	return missing;
}

function validatePackageStructure(
	files: string[],
): { packageName: string; errors: string[] }[] {
	const errors: { packageName: string; errors: string[] }[] = [];

	// Get all unique package directories
	const packageDirs = [
		...new Set(
			files
				.filter((f) => f.startsWith('packages/') && f.split('/').length >= 3)
				.map((f) => `packages/${f.split('/')[1]}/`),
		),
	];

	for (const pkgDir of packageDirs) {
		const packageName = pkgDir.split('/')[1];
		// Filter files that belong to this package (including the package directory itself)
		const pkgFiles = files.filter((f) => f.startsWith(pkgDir.slice(0, -1)));
		const pkgErrors: string[] = [];

		// Check if this is a TypeScript or Python package
		const hasTsConfig = pkgFiles.some((f) => f.includes('tsconfig.json'));
		const hasPyProject = pkgFiles.some((f) => f.includes('pyproject.toml'));

		if (hasTsConfig) {
			// TypeScript package validation
			const tsPatterns = policy.filePatterns.typescript;

			// Check required files
			for (const required of tsPatterns.required) {
				if (!pkgFiles.some((f) => f.includes(required))) {
					pkgErrors.push(`Missing required file: ${required}`);
				}
			}

			// Check requireOneOf
			let hasOne = false;
			for (const oneOf of tsPatterns.requireOneOf) {
				if (pkgFiles.some((f) => f.includes(oneOf))) {
					hasOne = true;
					break;
				}
			}
			if (!hasOne) {
				pkgErrors.push(
					`Must have one of: ${tsPatterns.requireOneOf.join(', ')}`,
				);
			}

			// Check allowed files
			const disallowed = pkgFiles.filter((f) => {
				// Remove package directory from path for matching
				const relativePath = f.replace(pkgDir.slice(0, -1), '');
				// Handle root-level files in package differently
				const pathToMatch = relativePath.startsWith('/')
					? relativePath.slice(1)
					: relativePath;
				if (pathToMatch === '') return false; // Skip the package directory itself
				return !micromatch.isMatch(pathToMatch, tsPatterns.allowed, {
					dot: true,
				});
			});

			if (disallowed.length > 0) {
				pkgErrors.push(`Disallowed files: ${disallowed.join(', ')}`);
			}
		} else if (hasPyProject) {
			// Python package validation
			const pyPatterns = policy.filePatterns.python;

			// Check required files
			for (const required of pyPatterns.required) {
				if (!pkgFiles.some((f) => f.includes(required))) {
					pkgErrors.push(`Missing required file: ${required}`);
				}
			}

			// Check requireOneOf
			let hasOne = false;
			for (const oneOf of pyPatterns.requireOneOf) {
				if (pkgFiles.some((f) => f.includes(oneOf))) {
					hasOne = true;
					break;
				}
			}
			if (!hasOne) {
				pkgErrors.push(
					`Must have one of: ${pyPatterns.requireOneOf.join(', ')}`,
				);
			}

			// Check allowed files
			const disallowed = pkgFiles.filter((f) => {
				// Remove package directory from path for matching
				const relativePath = f.replace(pkgDir.slice(0, -1), '');
				// Handle root-level files in package differently
				const pathToMatch = relativePath.startsWith('/')
					? relativePath.slice(1)
					: relativePath;
				if (pathToMatch === '') return false; // Skip the package directory itself
				return !micromatch.isMatch(pathToMatch, pyPatterns.allowed, {
					dot: true,
				});
			});

			if (disallowed.length > 0) {
				pkgErrors.push(`Disallowed files: ${disallowed.join(', ')}`);
			}
		}

		if (pkgErrors.length > 0) {
			errors.push({ packageName, errors: pkgErrors });
		}
	}

	return errors;
}

function validateRootEntries(files: string[]): string[] {
	const rootEntries = files.filter((f) => !f.includes('/'));
	const disallowed = rootEntries.filter(
		(f) => !policy.allowedRootEntries.includes(f),
	);
	return disallowed;
}

// Filter out denied files first
const filteredFiles = files.filter(
	(f) => !micromatch.isMatch(f, policy.deniedGlobs, { dot: true }),
);

console.log(`Filtered out ${files.length - filteredFiles.length} denied files`);

// Run validations on filtered files
const disallowedFiles = validateAllowedFiles(filteredFiles);
const missingProtected = validateProtectedFiles(filteredFiles);
const packageStructureErrors = validatePackageStructure(filteredFiles);
const disallowedRootEntries = validateRootEntries(filteredFiles);

// Report findings
let exitCode = 0;

if (disallowedFiles.length > 0) {
	console.error('❌ Disallowed file placements:');
	for (const f of disallowedFiles) {
		console.error(`  - ${f}`);
	}
	console.error(
		"\nAuto-fix: Move files to allowed locations or extend 'allowedGlobs' in policy.json",
	);
	exitCode = Math.max(exitCode, 2);
}

if (missingProtected.length > 0) {
	console.error('❌ Missing protected files:');
	for (const f of missingProtected) {
		console.error(`  - ${f}`);
	}
	console.error(
		"\nAuto-fix: Restore required files or adjust 'protectedFiles' in policy.json",
	);
	exitCode = Math.max(exitCode, 3);
}

if (packageStructureErrors.length > 0) {
	console.error('❌ Package structure violations:');
	for (const { packageName, errors } of packageStructureErrors) {
		console.error(`  ${packageName}:`);
		for (const e of errors) {
			console.error(`    - ${e}`);
		}
	}
	exitCode = Math.max(exitCode, 5);
}

if (disallowedRootEntries.length > 0) {
	console.error('❌ Disallowed root entries:');
	for (const f of disallowedRootEntries) {
		console.error(`  - ${f}`);
	}
	console.error(
		"\nAuto-fix: Move files to allowed locations or add to 'allowedRootEntries' in policy.json",
	);
	exitCode = Math.max(exitCode, 6);
}

if (exitCode === 0) {
	console.log('✅ All structure checks passed');
}

process.exitCode = exitCode;
