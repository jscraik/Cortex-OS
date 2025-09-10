import { readFileSync } from 'node:fs';
import { globby } from 'globby';
import micromatch from 'micromatch';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('protected globs', () => {
	const patterns = [
		'pnpm-workspace.yaml',
		'tools/structure-guard/**/*',
		'docs/architecture/decisions/*.md',
		'.github/CODEOWNERS',
	];

	it('matches exact files', () => {
		expect(micromatch.isMatch('pnpm-workspace.yaml', patterns)).toBe(true);
		expect(micromatch.isMatch('random.yaml', patterns)).toBe(false);
	});

	it('matches recursive dir globs', () => {
		expect(
			micromatch.isMatch('tools/structure-guard/policy.json', patterns),
		).toBe(true);
		expect(
			micromatch.isMatch('tools/structure-guard/nested/file.ts', patterns),
		).toBe(true);
		expect(micromatch.isMatch('tools/scripts/generate-sbom.ts', patterns)).toBe(
			false,
		);
	});

	it('matches leaf globs', () => {
		expect(
			micromatch.isMatch('docs/architecture/decisions/001-adr.md', patterns),
		).toBe(true);
		expect(
			micromatch.isMatch('docs/architecture/decisions/deep/002.md', patterns),
		).toBe(false);
	});

	it('matches dotfiles', () => {
		expect(
			micromatch.isMatch('.github/CODEOWNERS', patterns, {
				dot: true,
			} as unknown),
		).toBe(true);
	});
});

const policySchema = z.object({
	protectedFiles: z.array(z.string()),
	allowedGlobs: z.array(z.string()),
	deniedGlobs: z.array(z.string()).default([]),
});
const policy = policySchema.parse(
	JSON.parse(readFileSync('tools/structure-guard/policy.json', 'utf8')),
);

describe('path policy', () => {
	it('allows and denies paths', () => {
		expect(micromatch.isMatch('apps/demo/index.ts', policy.allowedGlobs)).toBe(
			true,
		);
		expect(micromatch.isMatch('unknown/file.ts', policy.allowedGlobs)).toBe(
			false,
		);
		expect(micromatch.isMatch('secrets/cred.secret', policy.deniedGlobs)).toBe(
			true,
		);
	});

	it('handles negated patterns', () => {
		const patterns = ['**/*.ts', '!**/*.spec.ts'];
		expect(micromatch.isMatch('src/main.ts', patterns)).toBe(true);
		expect(micromatch.isMatch('src/main.spec.ts', patterns)).toBe(false);
	});
});

describe('globby ignores', () => {
	it('skips node_modules and dist', async () => {
		const files = await globby(
			['**/*', '!**/node_modules/**', '!**/dist/**', '!**/.git/**'],
			{
				dot: true,
			},
		);
		expect(files.some((f) => f.includes('node_modules'))).toBe(false);
	});
});
