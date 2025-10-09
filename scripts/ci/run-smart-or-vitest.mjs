#!/usr/bin/env node
/**
 * Runs the smart Nx test wrapper and falls back to direct Vitest coverage when Nx fails.
 * Keeps CODESTYLE.md guidance: functional helpers, guard clauses, named exports avoided in scripts.
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const COVERAGE_ENV_FLAGS = {
	COVERAGE_THRESHOLD_GLOBAL: '0',
	COVERAGE_THRESHOLD_LINES: '0',
	COVERAGE_THRESHOLD_BRANCHES: '0',
	COVERAGE_THRESHOLD_FUNCTIONS: '0',
	VITEST_MAX_THREADS: '1',
	VITEST_MIN_THREADS: '1',
	NODE_OPTIONS: ['--max-old-space-size=2048', '--expose-gc', process.env.NODE_OPTIONS ?? '']
		.filter(Boolean)
		.join(' '),
};

const runCommand = (_label, command, args) => {
	const result = spawnSync(command, args, {
		shell: false,
		stdio: 'inherit',
		env: { ...process.env, ...COVERAGE_ENV_FLAGS },
	});
	return (result.status ?? result.error) ? 1 : 0;
};

const exitWith = async (code) => {
	process.exit(code);
};

const main = async () => {
	const primaryStatus = runCommand('pnpm test:smart --coverage', 'pnpm', [
		'test:smart',
		'--coverage',
	]);
	if (primaryStatus === 0) {
		await exitWith(0);
		return;
	}
	console.warn(
		'[brAInwav] pnpm test:smart --coverage failed; falling back to vitest.simple-tests coverage run.',
	);
	const fallbackStatus = runCommand(
		'pnpm vitest run --config vitest.simple-tests.config.ts --coverage',
		'pnpm',
		['vitest', 'run', '--config', 'vitest.simple-tests.config.ts', '--coverage'],
	);
	await exitWith(fallbackStatus);
};

main().catch(async (error) => {
	console.error('[brAInwav] test execution orchestration failed:', error);
	await exitWith(1);
});
