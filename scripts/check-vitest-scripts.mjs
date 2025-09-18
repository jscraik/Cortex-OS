#!/usr/bin/env node
/**
 * Guard script: ensures no package.json reintroduces raw `vitest run` or watch/ui forms.
 * Exits non-zero if violations found.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function listPackageJson() {
	const out = execSync(
		"find packages apps -name package.json -not -path '*/node_modules/*'",
		{ encoding: 'utf-8' },
	);
	return out.split(/\n/).filter(Boolean);
}

const VIOLATION_REGEX =
	/"(test|test:[^"]+)"\s*:\s*"(?:(?:npx |pnpm |NODE_OPTIONS=[^"]* )*)vitest(?!-safe).*?(run|watch|--watch|--ui)/;

const violations = [];
for (const file of listPackageJson()) {
	const content = readFileSync(file, 'utf-8');
	if (VIOLATION_REGEX.test(content)) {
		violations.push(file);
	}
}

if (violations.length) {
	console.error('Memory Safety Guard FAILED. Raw vitest usage detected in:');
	violations.forEach((v) => console.error(` - ${v}`));
	console.error(
		'Replace with memory-safe wrapper: node <rel>/scripts/vitest-safe.mjs run',
	);
	process.exit(1);
} else {
	console.log('Memory Safety Guard PASS: no raw vitest usage detected.');
}
