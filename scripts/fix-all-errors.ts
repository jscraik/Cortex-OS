#!/usr/bin/env node

/**
 * Systematic Error Fixing Script
 * Uses agent-toolkit to fix all TypeScript errors across the repository
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface ErrorSummary {
	file: string;
	errors: string[];
	fixes: string[];
}

async function main() {
	console.log('🔧 Starting systematic error fixing...\n');

	// const toolkit = await createAgentToolkit();
	const results: ErrorSummary[] = [];

	// Step 1: Get all TypeScript errors
	console.log('1. Analyzing TypeScript errors...');
	try {
		const tscOutput = execSync('npx tsc --noEmit --skipLibCheck', {
			encoding: 'utf8',
			cwd: process.cwd(),
		});

		if (tscOutput) {
			console.log('TypeScript compilation successful!');
			return;
		}
	} catch (error: unknown) {
		const errorOutput =
			(error as { stdout?: string; stderr?: string }).stdout ||
			(error as { stdout?: string; stderr?: string }).stderr ||
			'';
		console.log(
			`Found TypeScript errors in ${errorOutput.split('\n').filter((line) => line.includes('.ts')).length} files\n`,
		);

		// Parse errors and organize by file
		const errorsByFile = parseTsErrors(errorOutput);

		// Step 2: Fix each file's errors
		for (const [file, errors] of Object.entries(errorsByFile)) {
			console.log(`\n🔍 Processing: ${file}`);
			const fixResult = await fixFileErrors(null, file, errors);
			results.push(fixResult);

			if (fixResult.fixes.length > 0) {
				console.log(`Applied ${fixResult.fixes.length} fixes`);
			}
		}
	}

	// Step 3: Apply global fixes
	console.log('\n2. Applying global fixes...');
	await applyGlobalFixes(null);

	// Step 4: Clean up unused imports
	console.log('\n3. Cleaning up unused imports...');
	await cleanupUnusedImports(null);

	// Step 5: Final validation
	console.log('\n4. Running final validation...');
	const finalErrors = await validateFixes();

	// Summary
	console.log('\n📊 Summary:');
	console.log(`- Processed ${results.length} files`);
	console.log(`- Applied fixes: ${results.reduce((sum, r) => sum + r.fixes.length, 0)}`);
	console.log(`- Remaining errors: ${finalErrors}`);

	if (finalErrors === 0) {
		console.log('\n🎉 All errors fixed successfully!');
	} else {
		console.log('\n⚠️ Some errors remain. Manual review needed.');
	}
}

function parseTsErrors(output: string): Record<string, string[]> {
	const errorsByFile: Record<string, string[]> = {};

	const lines = output.split('\n');
	for (const line of lines) {
		const match = line.match(/^(.+\.ts)\((\d+),(\d+)\):\s+(error TS\d+:\s+.+)$/);
		if (match) {
			const [, file, , , error] = match;
			if (!errorsByFile[file]) {
				errorsByFile[file] = [];
			}
			errorsByFile[file].push(error);
		}
	}

	return errorsByFile;
}

async function fixFileErrors(_toolkit: any, file: string, errors: string[]): Promise<ErrorSummary> {
	const result: ErrorSummary = {
		file,
		errors: [...errors],
		fixes: [],
	};

	const content = readFileSync(file, 'utf8');
	let newContent = content;

	// Fix missing imports
	for (const error of errors) {
		if (error.includes("Cannot find name 'createId'")) {
			if (!newContent.includes('import { createId }')) {
				newContent = `import { createId } from '@cortex-os/a2a-core';\n${newContent}`;
				result.fixes.push('Added createId import');
			}
		}

		if (error.includes("Cannot find name 'Database'")) {
			if (!newContent.includes('import type { Database }')) {
				newContent = `import type { Database } from '@cortex-os/database-types';\n${newContent}`;
				result.fixes.push('Added Database type import');
			}
		}

		if (error.includes('Cannot find module')) {
			const moduleMatch = error.match(/Cannot find module '([^']+)'/);
			if (moduleMatch) {
				const module = moduleMatch[1];
				// Try to fix common module resolution issues
				if (module.includes('.js')) {
					newContent = newContent.replace(
						new RegExp(`from '${module}'`, 'g'),
						`from '${module.replace('.js', '')}'`,
					);
					result.fixes.push(`Fixed .js extension in import: ${module}`);
				}
			}
		}
	}

	// Write fixes back to file
	if (newContent !== content) {
		writeFileSync(file, newContent);
	}

	return result;
}

async function applyGlobalFixes(_toolkit: any) {
	// Fix default exports across the project
	console.log('⚠️ Skipping global fixes - toolkit not available');
}

async function cleanupUnusedImports(_toolkit: any) {
	try {
		// Get all TypeScript files
		const files: string[] = [];
		const searchPackages = ['packages', 'apps'];

		for (const pkg of searchPackages) {
			const pkgDir = join(process.cwd(), pkg);
			if (existsSync(pkgDir)) {
				findTsFiles(pkgDir, files);
			}
		}

		console.log(`Found ${files.length} TypeScript files`);
		console.log('⚠️ Skipping import cleanup - toolkit not available');
	} catch (error) {
		console.log('⚠️ Import cleanup failed:', (error as Error).message);
	}
}

function findTsFiles(dir: string, files: string[]) {
	const entries = readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory() && !['node_modules', 'dist', '.git'].includes(entry.name)) {
			findTsFiles(fullPath, files);
		} else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
			files.push(fullPath);
		}
	}
}

async function validateFixes(): Promise<number> {
	try {
		execSync('npx tsc --noEmit --skipLibCheck', {
			stdio: 'pipe',
			encoding: 'utf8',
		});
		return 0;
	} catch (error: unknown) {
		const output =
			(error as { stdout?: string; stderr?: string }).stdout ||
			(error as { stdout?: string; stderr?: string }).stderr ||
			'';
		return output.split('\n').filter((line) => line.includes('error TS')).length;
	}
}

main().catch(console.error);
