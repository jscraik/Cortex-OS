#!/usr/bin/env node
// Run RAG package coverage and verify against thresholds before readiness gating.
// Usage:
//   node tools/readiness/precheck-rag-coverage.mjs
// Env:
//   RAG_COVERAGE_AUTO_RAISE=1  → auto-raise thresholds to current coverage
//   RAG_COVERAGE_DRY_RUN=1     → preview threshold changes (with auto-raise)

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const ragDir = resolve(repoRoot, 'packages/rag');
const verifier = resolve(ragDir, 'scripts/verify-coverage.mjs');

function run(cmd, args, opts = {}) {
	const res = spawnSync(cmd, args, {
		stdio: 'inherit',
		env: process.env,
		...opts,
	});
	if (res.status !== 0) {
		const joined = [cmd, ...args].join(' ');
		console.error(
			`[precheck-rag-coverage] Command failed (${res.status}): ${joined}`,
		);
		process.exit(res.status || 1);
	}
}

if (!existsSync(ragDir)) {
	console.error(`[precheck-rag-coverage] Missing directory: ${ragDir}`);
	process.exit(1);
}
if (!existsSync(verifier)) {
	console.error(`[precheck-rag-coverage] Missing verifier script: ${verifier}`);
	console.error('Run bootstrap and ensure RAG package scripts are present.');
	process.exit(1);
}

console.log('[precheck-rag-coverage] Running RAG package coverage...');
run('pnpm', ['-C', 'packages/rag', 'test:coverage']);

const autoRaise = process.env.RAG_COVERAGE_AUTO_RAISE === '1';
const dryRun = process.env.RAG_COVERAGE_DRY_RUN === '1';

console.log('[precheck-rag-coverage] Verifying coverage thresholds...');
if (autoRaise && dryRun) {
	run('pnpm', ['-C', 'packages/rag', 'verify:coverage:dry']);
} else if (autoRaise) {
	run('pnpm', ['-C', 'packages/rag', 'verify:coverage:auto']);
} else {
	run('pnpm', ['-C', 'packages/rag', 'verify:coverage']);
}

console.log(
	'[precheck-rag-coverage] RAG coverage precheck completed successfully.',
);
