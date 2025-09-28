#!/usr/bin/env node

const { execSync } = require('node:child_process');
const { readFileSync, writeFileSync, readdirSync, existsSync } = require('node:fs');
const { join } = require('node:path');

console.log('🔧 Fixing TypeScript errors across the repository...\n');

// Common fixes mapping
const ERROR_FIXES = {
	// Missing imports
	"Cannot find name 'createId'": {
		fix: (content) => {
			if (!content.includes('import { createId }')) {
				return `import { createId } from '@cortex-os/a2a-core';\n${content}`;
			}
			return content;
		},
		description: 'Added createId import',
	},
	"Cannot find name 'Database'": {
		fix: (content) => {
			if (!content.includes('import type { Database }')) {
				return `import type { Database } from '@cortex-os/database-types';\n${content}`;
			}
			return content;
		},
		description: 'Added Database type import',
	},
	"Property 'createId' does not exist on type 'typeof import": {
		fix: (content) => {
			if (!content.includes('import { createId }')) {
				return `import { createId } from '@cortex-os/a2a-core';\n${content}`;
			}
			return content;
		},
		description: 'Added createId import for typeof import',
	},
	// Module resolution fixes
	'Cannot find module': {
		fix: (content, error) => {
			const moduleMatch = error.match(/Cannot find module '([^']+)'/);
			if (moduleMatch) {
				const module = moduleMatch[1];
				if (module.endsWith('.js')) {
					return content.replace(
						new RegExp(`from '${module}'`, 'g'),
						`from '${module.replace('.js', '')}'`,
					);
				}
			}
			return content;
		},
		description: 'Fixed .js extension in import',
	},
	// Type fixes
	'has no initializer and is not definitely assigned': {
		fix: (content, error) => {
			const varMatch = error.match(/'([^']+)'/);
			if (varMatch) {
				const varName = varMatch[1];
				return content.replace(
					new RegExp(`(let|const)\\s+${varName}(:[^=]+);`),
					`$1 ${varName}$2 = undefined;`,
				);
			}
			return content;
		},
		description: 'Added undefined initializer',
	},
	// Export fixes
	'Default exports are not supported in monorepo': {
		fix: (content) => {
			return content
				.replace(/export default class (\w+)/g, 'export const $1 = class $1')
				.replace(/export default function (\w+)/g, 'export const $1 = function $1')
				.replace(/export default (\w+)/g, 'export { $1 as default }');
		},
		description: 'Converted default export to named export',
	},
	// Promise chain fixes
	"Property 'then' does not exist on type": {
		fix: (content, _error) => {
			// This is a simplified fix - complex cases need manual review
			return content.replace(/(\w+)\.then\((\w+) => (.+?)\)/g, 'const $2 = await $1;\n$3');
		},
		description: 'Converted .then() to async/await (simplified)',
	},
};

function getTsErrors() {
	try {
		const _output = execSync('npx tsc --noEmit --skipLibCheck', {
			encoding: 'utf8',
			stdio: 'pipe',
		});
		return '';
	} catch (error) {
		return error.stdout || error.stderr || '';
	}
}

function parseErrors(output) {
	const errors = [];
	const lines = output.split('\n');

	for (const line of lines) {
		if (line.includes('.ts(') && line.includes('error TS')) {
			const match = line.match(/^(.+\.ts)\((\d+),(\d+)\):\s+(.+)$/);
			if (match) {
				const [, file, line, col, message] = match;
				errors.push({
					file,
					line: parseInt(line, 10),
					col: parseInt(col, 10),
					message: message.replace('error TS\\d+: ', ''),
				});
			}
		}
	}

	return errors;
}

function fixFile(filePath, errors) {
	if (!existsSync(filePath)) return { fixed: 0, fixes: [] };

	let content = readFileSync(filePath, 'utf8');
	let originalContent = content;
	const fixes = [];

	// Group errors by line
	const errorsByLine = {};
	for (const error of errors) {
		if (!errorsByLine[error.line]) {
			errorsByLine[error.line] = [];
		}
		errorsByLine[error.line].push(error);
	}

	// Apply fixes from bottom to top to preserve line numbers
	const sortedLines = Object.keys(errorsByLine)
		.map(Number)
		.sort((a, b) => b - a);

	for (const lineNum of sortedLines) {
		const lineErrors = errorsByLine[lineNum];

		for (const error of lineErrors) {
			for (const [errorPattern, fixInfo] of Object.entries(ERROR_FIXES)) {
				if (error.message.includes(errorPattern)) {
					content = fixInfo.fix(content, error.message);
					if (content !== originalContent) {
						fixes.push({
							line: lineNum,
							message: error.message,
							fix: fixInfo.description,
						});
						originalContent = content;
					}
				}
			}
		}
	}

	// Write back if changed
	if (content !== readFileSync(filePath, 'utf8')) {
		writeFileSync(filePath, content);
	}

	return { fixed: fixes.length, fixes };
}

function main() {
	console.log('1. Getting TypeScript errors...');
	const errorOutput = getTsErrors();

	if (!errorOutput) {
		console.log('✅ No TypeScript errors found!');
		return;
	}

	const errors = parseErrors(errorOutput);
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
	const allFixes = [];

	for (const [file, fileErrors] of Object.entries(errorsByFile)) {
		console.log(`🔧 ${file}`);
		const result = fixFile(file, fileErrors);

		if (result.fixed > 0) {
			console.log(`   Fixed ${result.fixed} error(s)`);
			totalFixed += result.fixed;
			allFixes.push(...result.fixes);
		} else {
			console.log('   No automatic fixes applied');
		}
	}

	console.log(`\n3. Summary:`);
	console.log(`- Total errors found: ${errors.length}`);
	console.log(`- Errors fixed: ${totalFixed}`);
	console.log(`- Errors remaining: ${errors.length - totalFixed}`);

	if (totalFixed > 0) {
		console.log('\n📋 Fixes applied:');
		allFixes.forEach((fix) => {
			console.log(`  ${fix.file}:${fix.line} - ${fix.fix}`);
		});
	}

	// Check remaining errors
	console.log('\n4. Checking remaining errors...');
	const remainingOutput = getTsErrors();
	const remainingErrors = remainingOutput ? parseErrors(remainingOutput) : [];

	if (remainingErrors.length > 0) {
		console.log(`\n⚠️ ${remainingErrors.length} errors remain (manual review needed):`);
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
	} else {
		console.log('\n🎉 All errors have been fixed!');
	}
}

main();
