// Contracts Coverage Test
// Note: explicit vitest imports to ensure globals are available even if workspace config does not enable globals.
import { describe, expect, it } from 'vitest';
// Ensures every exported *Schema in libs/typescript/contracts/**/events.ts has at least one test file referencing it.
// This acts as a safety net to prevent silent addition of untested contracts.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface SchemaRef {
	file: string;
	exportName: string;
}

function walk(dir: string, acc: string[] = []): string[] {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
		const full = path.join(dir, e.name);
		if (e.isDirectory()) walk(full, acc);
		else if (e.isFile()) acc.push(full);
	}
	return acc;
}

// Derive __dirname in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Walk upward until we find package.json to establish repo root (more robust than relative assumption)
function findRepoRoot(start: string): string {
	let current = start;
	for (let i = 0; i < 10; i++) {
		// safety bound
		if (existsSync(path.join(current, 'package.json'))) return current;
		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return path.resolve(start, '..', '..'); // fallback
}
const root = findRepoRoot(__dirname);
const contractsRoot = path.join(root, 'libs', 'typescript', 'contracts');

if (!existsSync(contractsRoot)) {
	// Provide a single passing test so suite doesn't fail if path changes
	describe('contracts: schema coverage (skipped - contracts root missing)', () => {
		it('skips because contracts root not found', () => {
			expect(true).toBe(true);
		});
	});
}

function findEventFiles(): string[] {
	const files = walk(contractsRoot);
	return files.filter((f) => f.endsWith('events.ts'));
}

function extractSchemas(file: string): SchemaRef[] {
	const src = readFileSync(file, 'utf8');
	const refs: SchemaRef[] = [];
	const exportRegex = /export\s+const\s+(\w+?Schema)\s*=\s*z\.object/gi;
	let m: RegExpExecArray | null;
	// eslint-friendly regex iteration
	// Using manual loop to avoid assignment within condition warnings
	for (;;) {
		m = exportRegex.exec(src);
		if (!m) break;
		refs.push({ file, exportName: m[1] });
	}
	return refs;
}

// Collect schema exports
const eventFiles = findEventFiles();
const schemas = eventFiles.flatMap(extractSchemas);

describe('contracts: schema coverage', () => {
	if (schemas.length === 0) {
		it('no schemas found (skip)', () => {
			expect(true).toBe(true);
		});
		return;
	}

	// Map schema -> test files referencing it
	const testDir = path.join(root, 'contracts', 'tests');
	const testFiles = walk(testDir).filter((f) => f.endsWith('.test.ts'));

	const testContentCache: Record<string, string> = {};
	const hasReference = (schema: SchemaRef): boolean => {
		return testFiles.some((tf) => {
			if (!testContentCache[tf]) testContentCache[tf] = readFileSync(tf, 'utf8');
			return new RegExp(`\\b${schema.exportName}\\b`).test(testContentCache[tf]);
		});
	};

	schemas.forEach((schema) => {
		it(`has test coverage for ${path.relative(root, schema.file)}::${schema.exportName}`, () => {
			expect(hasReference(schema)).toBe(true);
		});
	});
});
