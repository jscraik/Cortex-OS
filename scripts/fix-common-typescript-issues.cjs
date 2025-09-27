#!/usr/bin/env node

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, readdirSync, existsSync } = require('fs');
const { join } = require('path');

console.log('🔧 Fixing common TypeScript issues...\n');

// Get TypeScript compiler errors
function getTsErrors() {
	try {
		const output = execSync('npx tsc --noEmit --skipLibCheck', {
			encoding: 'utf8',
			stdio: 'pipe',
		});
		return [];
	} catch (error) {
		const output = error.stdout || error.stderr || '';
		return output
			.split('\n')
			.filter((line) => line.includes('.ts(') && line.includes('error TS'))
			.map((line) => {
				const match = line.match(/^(.+\.ts)\((\d+),(\d+)\):\s+(error TS\d+:\s+.+)$/);
				if (match) {
					const [, file, line, col, message] = match;
					return {
						file,
						line: parseInt(line),
						col: parseInt(col),
						message: message.replace('error TS\\d+:\\s+', ''),
					};
				}
				return null;
			})
			.filter(Boolean);
	}
}

// Read file content
function readFile(filePath) {
	try {
		return readFileSync(filePath, 'utf8');
	} catch {
		return null;
	}
}

// Write file content
function writeFile(filePath, content) {
	writeFileSync(filePath, content);
}

// Fix specific error patterns
function fixError(filePath, error) {
	const content = readFile(filePath);
	if (!content) return false;

	const lines = content.split('\n');
	const errorLine = lines[error.line - 1];

	let newContent = content;
	let fixed = false;

	// Fix: Cannot find module 'js-yaml'
	if (error.message.includes("Cannot find a declaration file for module 'js-yaml'")) {
		if (!content.includes("declare module 'js-yaml';")) {
			// Add declaration at the top if not exists
			newContent = `declare module 'js-yaml' {\n  const exports: any;\n  export = exports;\n}\n\n${content}`;
			fixed = true;
			console.log(`  Added js-yaml declaration to ${filePath}`);
		}
	}

	// Fix: Cannot find module '@cortex-os/mcp-registry'
	if (error.message.includes("Cannot find module '@cortex-os/mcp-registry'")) {
		// Replace with existing registry package
		newContent = newContent.replace(
			/from\s+['"]@cortex-os\/mcp-registry['"]/g,
			"from '@cortex-os/registry'",
		);
		fixed = true;
		console.log(`  Fixed mcp-registry import in ${filePath}`);
	}

	// Fix: Default exports are not supported
	if (error.message.includes('Default exports are not supported')) {
		newContent = newContent
			.replace(/export default class (\w+)/g, 'export const $1 = class $1')
			.replace(/export default function (\w+)/g, 'export const $1 = function $1');
		fixed = true;
		console.log(`  Fixed default export in ${filePath}`);
	}

	// Fix: Property 'x' has no initializer and is not definitely assigned
	if (error.message.includes('has no initializer and is not definitely assigned')) {
		const varMatch = error.message.match(/'([^']+)'/);
		if (varMatch) {
			const varName = varMatch[1];
			// Add definite assignment assertion
			newContent = newContent.replace(
				new RegExp(`(let|const)\\s+${varName}(:[^=]+);`),
				`$1 ${varName}$2!;`,
			);
			fixed = true;
			console.log(`  Added definite assignment to ${varName} in ${filePath}`);
		}
	}

	if (fixed && newContent !== content) {
		writeFile(filePath, newContent);
		return true;
	}

	return false;
}

// Main function
function main() {
	console.log('1. Getting TypeScript errors...');
	const errors = getTsErrors();

	if (errors.length === 0) {
		console.log('✅ No TypeScript errors found!');
		return;
	}

	console.log(`Found ${errors.length} errors\n`);

	// Group errors by file
	const errorsByFile = {};
	for (const error of errors) {
		if (!errorsByFile[error.file]) {
			errorsByFile[error.file] = [];
		}
		errorsByFile[error.file].push(error);
	}

	console.log(`2. Fixing errors in ${Object.keys(errorsByFile).length} files...\n`);

	let totalFixed = 0;
	const fixedFiles = [];

	for (const [file, fileErrors] of Object.entries(errorsByFile)) {
		console.log(`🔧 ${file}`);
		let fileFixed = false;

		for (const error of fileErrors) {
			if (fixError(file, error)) {
				fileFixed = true;
				totalFixed++;
			}
		}

		if (fileFixed) {
			fixedFiles.push(file);
		}
	}

	console.log(`\n3. Summary:`);
	console.log(`- Total errors found: ${errors.length}`);
	console.log(`- Errors fixed: ${totalFixed}`);

	if (totalFixed > 0) {
		console.log(`\n4. Checking remaining errors...`);
		const remainingErrors = getTsErrors();

		if (remainingErrors.length > 0) {
			console.log(`⚠️ ${remainingErrors.length} errors remain:`);

			const remainingByFile = {};
			for (const error of remainingErrors) {
				if (!remainingByFile[error.file]) {
					remainingByFile[error.file] = 0;
				}
				remainingByFile[error.file]++;
			}

			for (const [file, count] of Object.entries(remainingByFile)) {
				console.log(`  ${file}: ${count} errors`);
			}

			console.log('\n📝 Manual fixes needed for:');
			remainingErrors.slice(0, 10).forEach((error) => {
				console.log(`  ${error.file}:${error.line} - ${error.message}`);
			});
			if (remainingErrors.length > 10) {
				console.log(`  ... and ${remainingErrors.length - 10} more`);
			}
		} else {
			console.log('\n🎉 All errors have been fixed!');
		}
	}
}

main();
