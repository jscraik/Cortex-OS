#!/usr/bin/env node
/**
 * brAInwav Traversal Violation Fixer
 * Fixes excessive parent directory traversal imports
 * Part of brAInwav Cross-Repository Build Fix TDD Implementation
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

class BrainwavTraversalFixer {
	constructor() {
		this.fixedCount = 0;
		this.processedFiles = 0;
		this.errors = [];
	}

	/**
	 * Fix excessive parent directory traversal by converting to absolute imports
	 */
	async fixTraversalViolations() {
		console.log('🔧 brAInwav Traversal Violation Fixer');
		console.log('Starting excessive traversal fixes...\n');

		// Priority fixes for most common traversal violations
		const traversalFixes = [
			{
				pattern: /import.*from ['"]\.\.\/\.\.\/\.\.\/app\/components\/chat\/Chat['"];?/g,
				replacement: "import Chat from '~/components/chat/Chat';",
				description: 'Fix Chat component traversal',
				targetDirs: ['apps/cortex-webui'],
			},
			{
				pattern: /import.*from ['"]\.\.\/\.\.\/\.\.\/utils\/api-client['"];?/g,
				replacement: "import { apiClient } from '~/utils/api-client';",
				description: 'Fix api-client traversal',
				targetDirs: ['apps/cortex-webui'],
			},
			{
				pattern: /import.*from ['"]\.\.\/\.\.\/\.\.\/utils\/chat-store['"];?/g,
				replacement: "import { chatStore } from '~/utils/chat-store';",
				description: 'Fix chat-store traversal',
				targetDirs: ['apps/cortex-webui'],
			},
			{
				pattern: /import.*from ['"]\.\.\/\.\.\/\.\.\/utils\/id['"];?/g,
				replacement: "import { generateId } from '~/utils/id';",
				description: 'Fix id utils traversal',
				targetDirs: ['apps/cortex-webui'],
			},
			{
				pattern: /import.*from ['"]\.\.\/\.\.\/\.\.\/src\/tokens['"];?/g,
				replacement: "import { tokens } from '~/tokens';",
				description: 'Fix tokens traversal',
				targetDirs: ['apps/cortex-webui'],
			},
			{
				pattern: /import.*from ['"]\.\.\/\.\.\/\.\.\/\.\.\/shared\/types\/chat['"];?/g,
				replacement: "import { ChatTypes } from '~/shared/types/chat';",
				description: 'Fix chat types traversal',
				targetDirs: ['apps/cortex-webui'],
			},
			{
				pattern: /import.*from ['"]\.\.\/\.\.\/\.\.\/\.\.\/utils\/validation['"];?/g,
				replacement: "import { validation } from '~/utils/validation';",
				description: 'Fix validation utils traversal',
				targetDirs: ['apps/cortex-webui'],
			},
			{
				pattern: /import.*from ['"]\.\.\/\.\.\/\.\.\/tools\/structure-guard\/policy-schema['"];?/g,
				replacement: "import { PolicySchema } from '@cortex-os/contracts';",
				description: 'Fix policy schema traversal',
				targetDirs: ['contracts'],
			},
		];

		for (const fix of traversalFixes) {
			await this.applyFixToDirectories(fix);
		}

		console.log('\n📊 brAInwav Traversal Fix Summary');
		console.log('='.repeat(50));
		console.log(`📁 Files processed: ${this.processedFiles}`);
		console.log(`✅ Traversals fixed: ${this.fixedCount}`);
		console.log(`❌ Errors encountered: ${this.errors.length}`);

		if (this.errors.length > 0) {
			console.log('\n❌ Errors:');
			this.errors.forEach((error) => console.log(`  ${error}`));
		}

		if (this.fixedCount > 0) {
			console.log('\n✅ brAInwav Traversal Fixes: SUCCESS');
			console.log('🎯 Excessive traversal violations have been addressed');
			console.log('\n🔄 Next steps:');
			console.log('1. Update tsconfig.json to support ~ path mapping');
			console.log('2. Test component builds to verify fixes');
			console.log('3. Run import violation scanner to check progress');
		} else {
			console.log('\n📋 brAInwav Traversal Fixes: NO CHANGES NEEDED');
			console.log('🎯 No matching violations found in target directories');
		}
	}

	async applyFixToDirectories(fix) {
		console.log(`🔍 Processing: ${fix.description}`);

		for (const targetDir of fix.targetDirs) {
			const fullPath = path.join(workspaceRoot, targetDir);

			if (await this.directoryExists(fullPath)) {
				await this.processDirectory(fullPath, fix);
			} else {
				console.log(`  ⚠️  Directory not found: ${targetDir}`);
			}
		}
	}

	async processDirectory(dirPath, fix) {
		try {
			const files = await this.findTypeScriptFiles(dirPath);

			for (const filePath of files) {
				await this.processFile(filePath, fix);
			}
		} catch (error) {
			this.errors.push(`Directory processing error: ${dirPath} - ${error.message}`);
		}
	}

	async processFile(filePath, fix) {
		try {
			const content = await fs.readFile(filePath, 'utf-8');
			const originalContent = content;

			const updatedContent = content.replace(fix.pattern, (_match) => {
				this.fixedCount++;
				console.log(`  ✅ Fixed traversal in: ${path.relative(workspaceRoot, filePath)}`);
				return fix.replacement;
			});

			if (updatedContent !== originalContent) {
				await fs.writeFile(filePath, updatedContent, 'utf-8');
				this.processedFiles++;
			}
		} catch (error) {
			this.errors.push(`File processing error: ${filePath} - ${error.message}`);
		}
	}

	async findTypeScriptFiles(dirPath) {
		const files = [];

		async function traverse(currentPath) {
			const entries = await fs.readdir(currentPath, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(currentPath, entry.name);

				if (
					entry.isDirectory() &&
					!entry.name.startsWith('.') &&
					!['node_modules', 'dist', 'build', '.next', '.nx'].includes(entry.name)
				) {
					await traverse(fullPath);
				} else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
					files.push(fullPath);
				}
			}
		}

		await traverse(dirPath);
		return files;
	}

	async directoryExists(dirPath) {
		try {
			const stat = await fs.stat(dirPath);
			return stat.isDirectory();
		} catch {
			return false;
		}
	}
}

// Run fixer if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	const fixer = new BrainwavTraversalFixer();
	await fixer.fixTraversalViolations();
}

export default BrainwavTraversalFixer;
