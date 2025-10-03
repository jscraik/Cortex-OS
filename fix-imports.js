#!/usr/bin/env node

// Fix import paths in test files - change .js to .ts extensions
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';

const testDir = './apps/cortex-webui/backend';
const testFiles = globSync(`${testDir}/**/*.{test,spec}.ts`);

console.log(`Found ${testFiles.length} test files to check...`);

let fixedCount = 0;

for (const filePath of testFiles) {
	const content = readFileSync(filePath, 'utf-8');

	// Fix import statements - change .js to .ts for relative imports
	const fixedContent = content.replace(
		/from\s+['"](\.\.[^'"]*)\.js['"];?/g,
		(match, importPath) => {
			// Don't fix if the import is already a .ts file
			if (importPath.endsWith('.ts')) {
				return match;
			}
			return `from '${importPath}.ts';`;
		},
	);

	// Fix mock paths as well
	const fixedContent2 = fixedContent.replace(
		/mock\(['"](\.\.[^'"]*)\.js['"]\)/g,
		(_match, mockPath) => {
			return `mock('${mockPath}.ts')`;
		},
	);

	// Also fix static imports in mock() calls
	const fixedContent3 = fixedContent2.replace(
		/vi\.mock\(['"](\.\.[^'"]*)\.js['"]/g,
		(_match, mockPath) => {
			return `vi.mock('${mockPath}.ts'`;
		},
	);

	if (content !== fixedContent3) {
		writeFileSync(filePath, fixedContent3);
		console.log(`✓ Fixed imports in ${path.relative(process.cwd(), filePath)}`);
		fixedCount++;
	}
}

console.log(`\n✅ Fixed import extensions in ${fixedCount} files`);
