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
	'simple-tests/no-memories-import.test.ts',
]);

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
	it('fails when active code imports legacy memories package', () => {
		const files = collectTsFiles(repoRoot);
		const offenders: string[] = [];
		for (const file of files) {
			const content = readFileSync(file, 'utf-8');
			if (
				content.includes("from '@cortex-os/memories'") ||
				content.includes("require('@cortex-os/memories')")
			) {
				offenders.push(relative(repoRoot, file));
			}
		}
		expect(offenders, `Legacy memories imports found: ${offenders.join(', ') || 'none'}`).toEqual(
			[],
		);
	});
});
