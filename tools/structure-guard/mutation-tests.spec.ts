import micromatch from 'micromatch';
import { describe, expect, it } from 'vitest';

describe('glob matcher mutation tests', () => {
	describe('basic pattern matching', () => {
		it('matches simple patterns', () => {
			expect(micromatch.isMatch('file.txt', '*.txt')).toBe(true);
			expect(micromatch.isMatch('file.js', '*.txt')).toBe(false);
		});

		it('matches exact file names', () => {
			expect(micromatch.isMatch('package.json', 'package.json')).toBe(true);
			expect(micromatch.isMatch('package-lock.json', 'package.json')).toBe(
				false,
			);
		});

		it('matches directory patterns', () => {
			expect(micromatch.isMatch('src/index.ts', 'src/**')).toBe(true);
			expect(micromatch.isMatch('tests/index.spec.ts', 'src/**')).toBe(false);
		});
	});

	describe('negation patterns', () => {
		it('excludes files with negation', () => {
			const patterns = ['**/*.js', '!**/*.spec.js'];
			expect(micromatch.isMatch('src/main.js', patterns)).toBe(true);
			expect(micromatch.isMatch('src/main.spec.js', patterns)).toBe(false);
		});

		it('handles multiple negations', () => {
			const patterns = [
				'**/*',
				'!**/node_modules/**',
				'!**/dist/**',
				'!**/*.secret',
			];
			expect(micromatch.isMatch('src/main.js', patterns)).toBe(true);
			expect(micromatch.isMatch('node_modules/pkg/index.js', patterns)).toBe(
				false,
			);
			expect(micromatch.isMatch('dist/bundle.js', patterns)).toBe(false);
			expect(micromatch.isMatch('config.secret', patterns)).toBe(false);
		});

		it('respects pattern order', () => {
			// Later patterns override earlier ones
			const patterns1 = ['**/*.js', '!**/test.js', '**/test.js'];
			expect(micromatch.isMatch('test.js', patterns1)).toBe(true);

			const patterns2 = ['**/*.js', '**/test.js', '!**/test.js'];
			expect(micromatch.isMatch('test.js', patterns2)).toBe(false);
		});
	});

	describe('complex patterns', () => {
		it('handles brace expansion', () => {
			const patterns = ['**/*.{js,ts,jsx,tsx}'];
			expect(micromatch.isMatch('src/main.js', patterns)).toBe(true);
			expect(micromatch.isMatch('src/main.ts', patterns)).toBe(true);
			expect(micromatch.isMatch('src/main.jsx', patterns)).toBe(true);
			expect(micromatch.isMatch('src/main.tsx', patterns)).toBe(true);
			expect(micromatch.isMatch('src/main.py', patterns)).toBe(false);
		});

		it('handles nested braces', () => {
			const patterns = ['packages/{memories,rag,simlab}/**/*'];
			expect(
				micromatch.isMatch('packages/memories/src/index.ts', patterns),
			).toBe(true);
			expect(micromatch.isMatch('packages/rag/src/index.ts', patterns)).toBe(
				true,
			);
			expect(micromatch.isMatch('packages/simlab/src/index.ts', patterns)).toBe(
				true,
			);
			expect(micromatch.isMatch('packages/other/src/index.ts', patterns)).toBe(
				false,
			);
		});

		it('handles extended glob patterns', () => {
			const patterns = ['**/+(index|main).*'];
			expect(micromatch.isMatch('src/index.ts', patterns)).toBe(true);
			expect(micromatch.isMatch('src/main.js', patterns)).toBe(true);
			expect(micromatch.isMatch('src/app.ts', patterns)).toBe(false);
		});
	});

	describe('dotfile handling', () => {
		it('matches dotfiles when dot option is enabled', () => {
			expect(micromatch.isMatch('.gitignore', '*', { dot: true })).toBe(true);
			expect(micromatch.isMatch('.gitignore', '*')).toBe(false);
		});

		it('matches dot directories', () => {
			expect(
				micromatch.isMatch('.github/workflows/ci.yml', '.github/**', {
					dot: true,
				}),
			).toBe(true);
			expect(micromatch.isMatch('.git/config', '.git/**', { dot: true })).toBe(
				true,
			);
		});
	});

	describe('path separator handling', () => {
		it('handles unix path separators', () => {
			expect(micromatch.isMatch('src/utils/helper.ts', 'src/**')).toBe(true);
			expect(micromatch.isMatch('src/utils/helper.ts', 'src/utils/*.ts')).toBe(
				true,
			);
		});

		it('handles windows path separators', () => {
			// micromatch normalizes path separators, so this should work
			expect(micromatch.isMatch('src\\utils\\helper.ts', 'src/**')).toBe(true);
			expect(
				micromatch.isMatch('src\\utils\\helper.ts', 'src/utils/*.ts'),
			).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('handles empty patterns', () => {
			expect(micromatch.isMatch('file.txt', [])).toBe(false);
		});

		it('handles empty file names', () => {
			expect(micromatch.isMatch('', '*.txt')).toBe(false);
		});

		it('handles special characters', () => {
			expect(micromatch.isMatch('file[1].txt', 'file\\[1\\].txt')).toBe(true);
			expect(micromatch.isMatch('file(1).txt', 'file\\(1\\).txt')).toBe(true);
		});

		it('handles unicode characters', () => {
			expect(micromatch.isMatch('文件.txt', '*.txt')).toBe(true);
			expect(micromatch.isMatch('файл.txt', '*.txt')).toBe(true);
		});

		it('handles very long file names', () => {
			const longName = `${'a'.repeat(255)}.txt`;
			expect(micromatch.isMatch(longName, '*.txt')).toBe(true);
		});

		it('handles very deep paths', () => {
			const deepPath = `${'a/'.repeat(100)}file.txt`;
			expect(micromatch.isMatch(deepPath, '**/*.txt')).toBe(true);
		});
	});

	describe('performance edge cases', () => {
		it('handles many patterns efficiently', () => {
			const patterns = Array(1000)
				.fill('')
				.map((_, i) => `file${i}.txt`);
			const start = Date.now();
			expect(micromatch.isMatch('file500.txt', patterns)).toBe(true);
			const end = Date.now();
			// Should complete in reasonable time (less than 100ms)
			expect(end - start).toBeLessThan(100);
		});

		it('handles complex patterns efficiently', () => {
			const complexPattern =
				'**/*.{js,jsx,ts,tsx,json,html,css,scss,sass,md,mdx,yml,yaml}';
			const start = Date.now();
			expect(
				micromatch.isMatch('src/components/Button/Button.tsx', complexPattern),
			).toBe(true);
			const end = Date.now();
			// Should complete in reasonable time (less than 50ms)
			expect(end - start).toBeLessThan(50);
		});
	});

	describe('fuzz testing', () => {
		it('handles random patterns without crashing', () => {
			const randomPatterns = [
				'**/*.{js,ts}',
				'!**/node_modules/**',
				'packages/!(node_modules)/**',
				'src/**/*.(ts|tsx)',
				'+(src|tests)/**',
			];

			// Test various file paths
			const testPaths = [
				'src/index.ts',
				'tests/index.spec.ts',
				'packages/memories/src/index.ts',
				'node_modules/pkg/index.js',
				'dist/bundle.js',
			];

			// None of these should crash
			testPaths.forEach((path) => {
				expect(() => micromatch.isMatch(path, randomPatterns)).not.toThrow();
			});
		});
	});
});

import fs from 'node:fs';
import path from 'node:path';
// Additional policy schema mutation tests
import { validatePolicy } from './policy-schema';

describe('policy schema mutation guards', () => {
	function loadBaseline() {
		const p = path.resolve(__dirname, 'policy.json');
		return JSON.parse(fs.readFileSync(p, 'utf8'));
	}

	it('rejects invalid regex in bannedPatterns', () => {
		const baseline = loadBaseline();
		const mutated = {
			...baseline,
			importRules: {
				...baseline.importRules,
				bannedPatterns: ['[unclosed'],
				allowedCrossPkgImports: baseline.importRules.allowedCrossPkgImports,
			},
		};
		expect(() => validatePolicy(mutated, { version: mutated.version })).toThrow(
			/Invalid regex pattern/,
		);
	});
});
