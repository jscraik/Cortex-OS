#!/usr/bin/env tsx

/**
 * Structure Guard - Monorepo Policy Enforcement
// @ts-nocheck
 *
 * This script enforces monorepo structure policies by:
 * 1. Checking for disallowed file placements
 * 2. Ensuring required files exist
 * 3. Validating file patterns and package structures
 * 4. Enforcing import rules
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { globby } from 'globby';

const localRequire = createRequire(path.join(process.cwd(), 'index.js'));
const micromatch = localRequire('micromatch');

import { z } from 'zod';

// Define the policy schema
const policySchema = z.object({
	version: z.string(),
	excludePatterns: z.array(z.string()).default([]),
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
const policyPath = path.join(process.cwd(), 'tools', 'structure-guard', 'policy.json');
const policy = policySchema.parse(JSON.parse(readFileSync(policyPath, 'utf8')));

// Build ignore patterns from policy.excludePatterns
const excludeGlobs = (policy.excludePatterns || []).map((p: string) =>
	p.startsWith('!') ? p : `!${p}`,
);

function validateDeniedFiles(files: string[]): string[] {
	return files.filter((f) => micromatch.isMatch(f, policy.deniedGlobs, { dot: true }));
}

function validateAllowedFiles(files: string[]): string[] {
	return files.filter((f) => {
		// If it's a root-level file, defer to allowedRootEntries
		if (!f.includes('/')) {
			return !policy.allowedRootEntries.includes(f);
		}
		return !micromatch.isMatch(f, policy.allowedGlobs, { dot: true });
	});
}

function validateProtectedFiles(files: string[]): string[] {
	const missing: string[] = [];
	for (const pattern of policy.protectedFiles) {
		const matches = files.some((f) => micromatch.isMatch(f, pattern, { dot: true }));
		if (!matches) {
			missing.push(pattern);
		}
	}
	return missing;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function validatePackageStructure(
	files: string[],
	pkgDirs: string[],
): { packageName: string; errors: string[] }[] {
	const errors: { packageName: string; errors: string[] }[] = [];

	// Validate only discovered package directories (those with manifest files)
	for (const pkgDir of pkgDirs) {
		// Derive a readable package identifier relative to packages/
		const packageName = pkgDir.startsWith('packages/')
			? pkgDir.slice('packages/'.length).replace(/\/$/, '')
			: pkgDir.replace(/\/$/, '');
		// Compute child package directories under this pkgDir (excluding itself)
		const childPkgDirs = pkgDirs.filter((d) => d !== pkgDir && d.startsWith(pkgDir));
		// Filter files that belong to this package, excluding files that are inside nested child packages
		const pkgFiles = files.filter(
			(f) => f.startsWith(pkgDir) && !childPkgDirs.some((child) => f.startsWith(child)),
		);
		const pkgErrors: string[] = [];

		// Check if this is a TypeScript or Python package
		const hasTsConfig = pkgFiles.some((f) => f.endsWith('tsconfig.json'));
		const hasPyProject = pkgFiles.some((f) => f.endsWith('pyproject.toml'));

		// Consider a TypeScript package only if it has tsconfig AND a src directory (skip meta/aggregator packages)
		const hasSrcDir = pkgFiles.some((f) => f.startsWith(`${pkgDir}src/`));

		if (hasTsConfig && hasSrcDir) {
			// TypeScript package validation
			const tsPatterns = policy.filePatterns.typescript;

			// Check required files
			for (const required of tsPatterns.required) {
				if (!pkgFiles.some((f) => f.endsWith(required))) {
					pkgErrors.push(`Missing required file: ${required}`);
				}
			}

			// Check requireOneOf (support glob-style matches relative to package root)
			let hasOne = false;
			for (const oneOf of tsPatterns.requireOneOf) {
				if (
					pkgFiles.some((f) => {
						const rel = f.startsWith(pkgDir) ? f.slice(pkgDir.length) : f;
						return micromatch.isMatch(rel, oneOf, { dot: true });
					})
				) {
					hasOne = true;
					break;
				}
			}
			if (!hasOne) {
				pkgErrors.push(`Must have one of: ${tsPatterns.requireOneOf.join(', ')}`);
			}

			// Check allowed files
			const disallowed = pkgFiles.filter((f) => {
				// Remove package directory from path for matching
				const relativePath = f.replace(pkgDir, '');
				// Handle root-level files in package differently
				const pathToMatch = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
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
				if (!pkgFiles.some((f) => f.endsWith(required))) {
					pkgErrors.push(`Missing required file: ${required}`);
				}
			}

			// Check requireOneOf (support glob-style matches relative to package root)
			let hasOne = false;
			for (const oneOf of pyPatterns.requireOneOf) {
				if (
					pkgFiles.some((f) => {
						const rel = f.startsWith(pkgDir) ? f.slice(pkgDir.length) : f;
						return micromatch.isMatch(rel, oneOf, { dot: true });
					})
				) {
					hasOne = true;
					break;
				}
			}
			if (!hasOne) {
				pkgErrors.push(`Must have one of: ${pyPatterns.requireOneOf.join(', ')}`);
			}

			// Check allowed files
			const disallowed = pkgFiles.filter((f) => {
				// Remove package directory from path for matching
				const relativePath = f.replace(pkgDir, '');
				// Handle root-level files in package differently
				const pathToMatch = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
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
	const rootEntries = files
		.map((f) => f.split(path.sep).join(path.posix.sep))
		.filter((f) => !f.includes('/'));
	const disallowed = rootEntries.filter((f) => !policy.allowedRootEntries.includes(f));
	return disallowed;
}

// Add import validation function
// eslint-disable-next-line sonarjs/cognitive-complexity
async function validateImports(files: string[]): Promise<{ file: string; errors: string[] }[]> {
	const importErrors: { file: string; errors: string[] }[] = [];

	// Get all TypeScript files
	const tsFiles = files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

	// Process each TypeScript file
	for (const file of tsFiles) {
		try {
			const content = readFileSync(file, 'utf8');

			// Extract import statements
			const importRegex = /import\s+.*?from\s+['"](.*?)['"]|import\s+['"](.*?)['"]/g;
			const matches = Array.from(content.matchAll(importRegex));
			for (const match of matches) {
				const importPath = (match[1] as string | undefined) ?? (match[2] as string | undefined);

				if (importPath) {
					// Check banned patterns (regex or glob via micromatch)
					for (const bannedPattern of policy.importRules.bannedPatterns) {
						const regex = new RegExp(bannedPattern);
						if (
							regex.test(importPath) ||
							micromatch.isMatch(importPath, bannedPattern, { dot: true })
						) {
							const fileErrors = importErrors.find((e) => e.file === file)?.errors || [];
							if (!importErrors.find((e) => e.file === file)) {
								importErrors.push({
									file,
									errors: [...fileErrors, `Banned import pattern: ${importPath}`],
								});
							} else {
								importErrors
									.find((e) => e.file === file)
									?.errors.push(`Banned import pattern: ${importPath}`);
							}
						}
					}

					// Check for cross-package imports that aren't allowed
					if (file.startsWith('packages/') && importPath.startsWith('@cortex-os/')) {
						const currentPackage = file.split('/')[1];
						const importedPackage = importPath.split('/')[1];

						// If importing from a different package
						if (currentPackage !== importedPackage) {
							// Check if the import is in the allowed list
							const importScope = importPath.split('/').slice(0, 2).join('/');
							const allowed = policy.importRules.allowedCrossPkgImports.some((pattern) =>
								micromatch.isMatch(importScope, pattern, { dot: true }),
							);
							if (!allowed) {
								const fileErrors = importErrors.find((e) => e.file === file)?.errors || [];
								if (!importErrors.find((e) => e.file === file)) {
									importErrors.push({
										file,
										errors: [...fileErrors, `Cross-package import not allowed: ${importPath}`],
									});
								} else {
									importErrors
										.find((e) => e.file === file)
										?.errors.push(`Cross-package import not allowed: ${importPath}`);
								}
							}
						}
					}
				}
			}
		} catch (error) {
			// Skip files that can't be read
			console.warn(`Could not read file ${file} for import validation: ${error}`);
		}
	}

	return importErrors;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
async function main() {
	// Discover all files with excludes
	const files = await globby(
		[
			'**/*',
			'!**/node_modules/**',
			'!**/dist/**',
			'!**/.git/**',
			'!**/.turbo/**',
			'!**/.venv/**',
			'!**/venv/**',
			'!**/__pycache__/**',
			...excludeGlobs,
		],
		{ dot: true },
	);

	// Discover actual package directories (only dirs that contain a manifest at their root)
	const tsPackageManifests = await globby(
		[
			'packages/**/package.json',
			'!**/node_modules/**',
			'!**/.venv/**',
			'!**/venv/**',
			'!**/dist/**',
			'!**/.git/**',
			'!**/.turbo/**',
			...excludeGlobs,
		],
		{ dot: true },
	);
	const pyPackageManifests = await globby(
		[
			'packages/**/pyproject.toml',
			'!**/node_modules/**',
			'!**/.venv/**',
			'!**/venv/**',
			'!**/dist/**',
			'!**/.git/**',
			'!**/.turbo/**',
			...excludeGlobs,
		],
		{ dot: true },
	);
	const packageDirs = Array.from(
		new Set(
			[...tsPackageManifests, ...pyPackageManifests].map((p) => {
				const dir = path.posix.dirname(p);
				// Ensure posix-style with trailing slash for precise prefix matching
				return dir.endsWith('/') ? dir : `${dir}/`;
			}),
		),
	);

	// Filter out denied files first
	const deniedFiles = validateDeniedFiles(files);
	const filteredFiles = files.filter((f) => !deniedFiles.includes(f));
	console.log(`Filtered out ${deniedFiles.length} denied files`);

	// Run validations on filtered files
	const disallowedFiles = validateAllowedFiles(filteredFiles);
	const missingProtected = validateProtectedFiles(filteredFiles);
	const packageStructureErrors = validatePackageStructure(filteredFiles, packageDirs);
	const disallowedRootEntries = validateRootEntries(filteredFiles);
	// Run import validation
	const importErrors = await validateImports(filteredFiles);

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
		console.error("\nAuto-fix: Restore required files or adjust 'protectedFiles' in policy.json");
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

	if (importErrors.length > 0) {
		console.error('❌ Import validation errors:');
		for (const { file, errors } of importErrors) {
			console.error(`  ${file}:`);
			for (const e of errors) {
				console.error(`    - ${e}`);
			}
		}
		exitCode = Math.max(exitCode, 7);
	}

	if (exitCode === 0) {
		console.log('✅ All structure checks passed');
	}

	process.exitCode = exitCode;
}

// Invoke main without top-level await
main().catch((err) => {
	console.error('Structure guard failed:', err);
	const current = typeof process.exitCode === 'number' ? process.exitCode : 0;
	process.exitCode = Math.max(current, 1);
});

export {
	validateAllowedFiles,
	validateDeniedFiles,
	validateImports,
	validatePackageStructure,
	validateProtectedFiles,
	validateRootEntries,
};
