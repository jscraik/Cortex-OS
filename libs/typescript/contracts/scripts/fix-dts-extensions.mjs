#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fixDeclarationExtensions() {
	const indexPath = join(__dirname, '..', 'dist', 'index.d.ts');

	try {
		try {
			let content = await fs.readFile(indexPath, 'utf-8');

			// First fix any double .js.js extensions that may have been created
			content = content.replace(/\.js\.js'/g, ".js'");

			// Then add .js to any exports that don't already have it
			content = content.replace(/export \* from '\.\/([^']+)';/g, (match, filename) => {
				if (filename.endsWith('.js')) {
					return match; // Already has .js extension, leave it alone
				}
				return `export * from './${filename}.js';`;
			});

			await fs.writeFile(indexPath, content, 'utf-8');
			console.log('Fixed .d.ts file extensions');
		} catch (readError) {
			// If the index.d.ts file does not exist, skip the fix step instead of failing the build.
			if (readError.code === 'ENOENT') {
				console.warn(
					`Index declaration file not found (${indexPath}), skipping .d.ts extension fix.`,
				);
				process.exit(0);
			}
			// Other errors should still fail the script
			console.error('Error fixing .d.ts extensions:', readError);
			process.exit(1);
		}
	} catch (error) {
		console.error('Error fixing .d.ts extensions:', error);
		process.exit(1);
	}
}

await fixDeclarationExtensions();
