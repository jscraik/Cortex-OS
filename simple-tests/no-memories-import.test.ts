import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const IGNORED_DIR_SEGMENTS = new Set([
	'node_modules',
	'.git',
	'.turbo',
	'.next',
	'.cache',
	'.cortex',
	'.semgrep',
	'dist',
	'coverage',
	'website',
	'packages/memories',
	'packages/rag',
	'simple-tests/no-memories-import.test',
]);

interface ForbiddenPattern {
	id: string;
	test: (content: string) => boolean;
}

const FORBIDDEN_IMPORT_PATTERNS: ForbiddenPattern[] = [
	{
		id: '@cortex-os/memories',
		test: (content: string) =>
			/\b(from|require\s*\(|import\s*\()[^'"`]*['"]@cortex-os\/memories/.test(content),
	},
	{
		id: 'packages/memories (relative)',
		test: (content: string) =>
			/\b(from|require\s*\(|import\s*\()[^'"`]*['"`][^'"`]*packages\/memories/.test(content),
	},
	{
		id: 'packages/rag (relative)',
		test: (content: string) =>
			/\b(from|require\s*\(|import\s*\()[^'"`]*['"`][^'"`]*packages\/rag/.test(content),
	},
];

function shouldSkipPath(path: string): boolean {
	const normalized = path.replace(/\\/g, '/');
	for (const segment of IGNORED_DIR_SEGMENTS) {
		if (normalized.includes(`${segment}/`) || normalized.endsWith(segment)) {
			return true;
		}
	}
	return false;
}

function collectTsFiles(dir: string, files: string[] = []): string[] {
	if (shouldSkipPath(relative(repoRoot, dir))) return files;
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const rel = relative(repoRoot, fullPath).replace(/\\/g, '/');
		if (shouldSkipPath(rel)) continue;
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			collectTsFiles(fullPath, files);
			continue;
		}
		if (stats.isFile() && /\.(ts|tsx|mts|cts)$/.test(entry)) {
			files.push(fullPath);
		}
	}
	return files;
}

describe('Repository does not import @cortex-os/memories', () => {
	it('fails when active code imports legacy memories package', { timeout: 30000 }, () => {
		const files = collectTsFiles(repoRoot);
		const offenders: string[] = [];
		for (const file of files) {
			const content = readFileSync(file, 'utf-8');
			const relPath = relative(repoRoot, file).replace(/\\/g, '/');

			const hits = FORBIDDEN_IMPORT_PATTERNS.filter((pattern) => pattern.test(content));
			if (hits.length > 0) {
				offenders.push(`${relPath} → ${hits.map((hit) => hit.id).join(', ')}`);
			}
		}
		expect(
			offenders,
			`Legacy memories/rag imports found: ${offenders.join(', ') || 'none'}`,
		).toEqual([]);
	});
});
