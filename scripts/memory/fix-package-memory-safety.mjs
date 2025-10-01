#!/usr/bin/env node
/**
 * Update all package.json files to use memory-safe vitest wrapper
 * This prevents individual packages from bypassing memory constraints
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function log(level, message) {
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] [PACKAGE-UPDATER] [${level}] ${message}`);
}

function updatePackageJson(packagePath) {
	try {
		const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
		let modified = false;

		if (packageJson.scripts) {
			// Update unsafe vitest commands to use memory-safe wrapper
			const unsafePatterns = [
				{
					pattern: /^vitest run$/,
					replacement: 'node ../../scripts/vitest-safe.mjs run',
				},
				{
					pattern: /^vitest run --coverage$/,
					replacement: 'node ../../scripts/vitest-safe.mjs run --coverage',
				},
				{
					pattern: /^vitest run tests\/unit$/,
					replacement: 'node ../../scripts/vitest-safe.mjs run tests/unit',
				},
				{
					pattern: /^vitest run tests\/integration$/,
					replacement: 'node ../../scripts/vitest-safe.mjs run tests/integration',
				},
				{
					pattern: /^vitest run tests\/e2e$/,
					replacement: 'node ../../scripts/vitest-safe.mjs run tests/e2e',
				},
				{
					pattern: /^vitest run --coverage --reporter=verbose$/,
					replacement: 'node ../../scripts/vitest-safe.mjs run --coverage --reporter=verbose',
				},
				{
					pattern: /^vitest$/,
					replacement:
						'echo "DISABLED: vitest watch mode causes memory leaks. Use test:safe instead."',
				},
				{
					pattern: /^vitest --watch$/,
					replacement:
						'echo "DISABLED: vitest watch mode causes memory leaks. Use test:safe instead."',
				},
				{
					pattern: /^vitest watch$/,
					replacement:
						'echo "DISABLED: vitest watch mode causes memory leaks. Use test:safe instead."',
				},
			];

			for (const [scriptName, scriptCommand] of Object.entries(packageJson.scripts)) {
				if (typeof scriptCommand === 'string') {
					for (const { pattern, replacement } of unsafePatterns) {
						if (pattern.test(scriptCommand)) {
							log(
								'INFO',
								`Updating ${packagePath} script "${scriptName}": ${scriptCommand} -> ${replacement}`,
							);
							packageJson.scripts[scriptName] = replacement;
							modified = true;
							break;
						}
					}
				}
			}

			// Add memory-safe test script if not present
			if (!packageJson.scripts['test:safe']) {
				packageJson.scripts['test:safe'] = 'node ../../scripts/vitest-safe.mjs run';
				modified = true;
				log('INFO', `Added test:safe script to ${packagePath}`);
			}
		}

		if (modified) {
			writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\\n`);
			return true;
		}

		return false;
	} catch (error) {
		log('ERROR', `Failed to process ${packagePath}: ${error.message}`);
		return false;
	}
}

function main() {
	log('INFO', 'Starting package.json memory safety updates');

	// Find all package.json files in packages and apps directories
	const packageJsonFiles = [];

	try {
		// Find package.json files but exclude node_modules
		const findOutput = execSync(
			'find packages apps -name "package.json" -not -path "*/node_modules/*"',
			{ encoding: 'utf-8', cwd: rootDir },
		);

		const foundFiles = findOutput.trim().split('\\n').filter(Boolean);
		packageJsonFiles.push(...foundFiles);

		log('INFO', `Found ${foundFiles.length} package.json files to check`);
	} catch (error) {
		log('ERROR', `Failed to find package.json files: ${error.message}`);
		process.exit(1);
	}

	let updatedCount = 0;

	for (const packagePath of packageJsonFiles) {
		const fullPath = join(rootDir, packagePath);
		if (updatePackageJson(fullPath)) {
			updatedCount++;
		}
	}

	log('INFO', `Updated ${updatedCount} out of ${packageJsonFiles.length} package.json files`);

	if (updatedCount > 0) {
		log('INFO', 'Memory safety updates complete. All packages now use memory-safe vitest wrapper.');
		log('INFO', 'Recommendation: Run "pnpm install" to refresh dependencies');
	} else {
		log('INFO', 'No packages needed memory safety updates');
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
