#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(here, '../dist/index.js');
const srcEntry = resolve(here, '../src/index.ts');

async function main() {
	const target = existsSync(distEntry) ? distEntry : srcEntry;
	await import(pathToFileURL(target).href);
}

main().catch((error) => {
	console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
	process.exit(1);
});
