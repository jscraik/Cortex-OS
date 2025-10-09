#!/usr/bin/env node

// brAInwav NodeNext module alignment script v2
// This script adds "module": "NodeNext" to tsconfig files that have "moduleResolution": "NodeNext"
// but are missing the "module" field, following CODESTYLE.md patterns

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function fixTsconfigFile(filePath) {
	try {
		let content = fs.readFileSync(filePath, 'utf8');

		// Skip files that don't look like valid JSON (avoid cache files)
		if (!content.trim().startsWith('{')) {
			return false;
		}

		// Parse the original content to check if module needs to be added
		let needsModule = false;
		let hasModuleResolution = false;

		try {
			// Strip comments for parsing
			const strippedContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

			const data = JSON.parse(strippedContent);

			if (data.compilerOptions) {
				hasModuleResolution = data.compilerOptions.moduleResolution === 'NodeNext';
				needsModule = hasModuleResolution && data.compilerOptions.module !== 'NodeNext';
			}
		} catch (parseError) {
			console.warn(`⚠️ Skipping ${path.relative(repoRoot, filePath)}: ${parseError.message}`);
			return false;
		}

		if (!needsModule) {
			return false;
		}

		// Add module field after moduleResolution
		const moduleResolutionRegex = /("moduleResolution"\s*:\s*"NodeNext")/g;
		const replacement = '$1,\n\t\t"module": "NodeNext"';

		if (moduleResolutionRegex.test(content)) {
			content = content.replace(moduleResolutionRegex, replacement);

			// Write back to file
			fs.writeFileSync(filePath, content);
			console.log(`✅ Fixed: ${path.relative(repoRoot, filePath)}`);
			return true;
		}

		return false;
	} catch (error) {
		console.warn(`⚠️ Skipping ${path.relative(repoRoot, filePath)}: ${error.message}`);
		return false;
	}
}

function main() {
	console.log('🔧 brAInwav NodeNext module alignment v2 starting...\n');

	// Get list of files from the discovery results
	const discoveryFile = path.join(repoRoot, 'reports/planning/node-next-tsconfigs.txt');

	if (!fs.existsSync(discoveryFile)) {
		console.error('❌ Discovery file not found. Run discovery first:');
		console.error(
			'   rg "\\"moduleResolution\\":s*\\"NodeNext\\"" -g \'tsconfig*.json\' -n > reports/planning/node-next-tsconfigs.txt',
		);
		process.exit(1);
	}

	const discoveryContent = fs.readFileSync(discoveryFile, 'utf8');
	const files = discoveryContent
		.split('\n')
		.filter((line) => line.trim())
		.map((line) => line.split(':')[0]);

	console.log(`📁 Processing ${files.length} tsconfig files\n`);

	let fixedCount = 0;

	for (const file of files) {
		const fullPath = path.resolve(repoRoot, file);
		if (fs.existsSync(fullPath)) {
			if (fixTsconfigFile(fullPath)) {
				fixedCount++;
			}
		}
	}

	console.log(`\n✨ Complete! Fixed ${fixedCount} files`);

	if (fixedCount > 0) {
		console.log('\n📋 Summary of changes:');
		console.log('  - Added "module": "NodeNext" after "moduleResolution": "NodeNext"');
		console.log('  - Preserved existing formatting and comments');
		console.log('  - Updated relative to repository root');
		console.log('\n🎯 brAInwav NodeNext alignment complete!');
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
