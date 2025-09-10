#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { globby } from 'globby';
import micromatch from 'micromatch';
import { z } from 'zod';

type Policy = {
	protectedFiles: string[];
	allowedGlobs: string[];
	deniedGlobs: string[];
};
const policySchema = z.object({
	protectedFiles: z.array(z.string()),
	allowedGlobs: z.array(z.string()),
	deniedGlobs: z.array(z.string()).default([]),
});
const policy: Policy = policySchema.parse(
	JSON.parse(readFileSync('tools/structure-guard/policy.json', 'utf8')),
);

await (async () => {
	const files = await globby(
		['**/*', '!**/node_modules/**', '!**/dist/**', '!**/.git/**'],
		{
			dot: true,
		},
	);

	const denied = files.filter((f) =>
		micromatch.isMatch(f, policy.deniedGlobs, { dot: true }),
	);
	if (denied.length) {
		console.error(`Denied paths:
		${denied.join('\n')}`);
		console.error(
			"Auto-fix: remove or relocate these files, or update 'deniedGlobs'.",
		);
		process.exitCode = 4;
	}

	const bad = files.filter(
		(f) => !micromatch.isMatch(f, policy.allowedGlobs, { dot: true }),
	);
	if (bad.length) {
		console.error(`Disallowed paths:
		${bad.join('\n')}`);
		console.error(
			"Auto-fix: move files to allowed locations or extend 'allowedGlobs'.",
		);
		process.exitCode = 2;
	}

	const missing = policy.protectedFiles.filter(
		(p) => !files.some((f) => micromatch.isMatch(f, p, { dot: true })),
	);
	if (missing.length) {
		console.error(`Missing protected paths:
		${missing.join('\n')}`);
		console.error(
			"Auto-fix: restore required files or adjust 'protectedFiles'.",
		);
		process.exitCode = 3;
	}
})();
