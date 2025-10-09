#!/usr/bin/env node

// brAInwav NodeNext module alignment script
// This script adds "module": "NodeNext" to tsconfig files that have "moduleResolution": "NodeNext"
// but are missing the "module" field, following CODESTYLE.md patterns

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

function findTsconfigFiles(dir) {
	const files = [];

	function walk(currentDir) {
		try {
			const items = fs.readdirSync(currentDir);

			for (const item of items) {
				const fullPath = path.join(currentDir, item);
				const stat = fs.statSync(fullPath);

				if (stat.isDirectory()) {
					// Skip node_modules, dist, .uv-cache, and other ignored directories
					if (
						!['node_modules', 'dist', '.nx', '.turbo', 'coverage', '.uv-cache', '.git'].includes(
							item,
						)
					) {
						walk(fullPath);
					}
				} else if (item.startsWith('tsconfig') && item.endsWith('.json')) {
					files.push(fullPath);
				}
			}
		} catch (error) {
			// Skip directories we can't read
			console.warn(`⚠️ Skipping directory ${currentDir}: ${error.message}`);
		}
	}

	walk(dir);
	return files;
}

function fixTsconfigFile(filePath) {
	try {
		let content = fs.readFileSync(filePath, 'utf8');

		// Skip files that don't look like valid JSON (avoid cache files)
		if (!content.trim().startsWith('{')) {
			return false;
		}

		// Strip JSON comments to allow parsing
		content = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

		const data = JSON.parse(content);

		// Check if moduleResolution is NodeNext but module is missing or not NodeNext
		if (
			data.compilerOptions &&
			data.compilerOptions.moduleResolution === 'NodeNext' &&
			data.compilerOptions.module !== 'NodeNext'
		) {
			// Add or update module field
			data.compilerOptions.module = 'NodeNext';

			// Ensure ignoreDeprecations is set to "5.0" if present
			if (data.compilerOptions.ignoreDeprecations === '6.0') {
				data.compilerOptions.ignoreDeprecations = '5.0';
			}

			// Write back with proper formatting (tabs for Biome compatibility)
			const updatedContent = JSON.stringify(data, null, '\t');
			fs.writeFileSync(filePath, `${updatedContent}\n`);
			console.log(`✅ Fixed: ${path.relative(repoRoot, filePath)}`);
			return true;
		}

		return false;
	} catch (error) {
		// Silently skip files that can't be parsed (likely cache files)
		if (!filePath.includes('.uv-cache') && !filePath.includes('.git')) {
			console.warn(`⚠️ Skipping ${path.relative(repoRoot, filePath)}: ${error.message}`);
		}
		return false;
	}
}

function main() {
	console.log('🔧 brAInwav NodeNext module alignment starting...\n');

	const tsconfigFiles = findTsconfigFiles(repoRoot);
	console.log(`📁 Found ${tsconfigFiles.length} tsconfig files\n`);

	let fixedCount = 0;

	for (const file of tsconfigFiles) {
		if (fixTsconfigFile(file)) {
			fixedCount++;
		}
	}

	console.log(`\n✨ Complete! Fixed ${fixedCount} files`);

	if (fixedCount > 0) {
		console.log('\n📋 Summary of changes:');
		console.log('  - Added "module": "NodeNext" where missing');
		console.log('  - Fixed "ignoreDeprecations": "6.0" to "5.0" where present');
		console.log('  - Applied Biome formatting (tabs, no trailing commas)');
		console.log('\n🎯 brAInwav NodeNext alignment complete!');
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
