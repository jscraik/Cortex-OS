#!/usr/bin/env ts-node
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'out');
const COVERAGE_DIR = path.join(ROOT, 'coverage');
const MUTATION_DIR = path.join(ROOT, 'reports', 'mutation');
const COVERAGE_SUMMARY = path.join(COVERAGE_DIR, 'coverage-summary.json');
const COVERAGE_FALLBACK = path.join(COVERAGE_DIR, 'coverage-final.json');
const VITEST_RESULTS = path.join(OUT_DIR, 'vitest-results.json');
const MUTATION_REPORT = path.join(MUTATION_DIR, 'mutation-score-report.json');
const PACKAGE_AUDIT_OUTPUT = path.join(OUT_DIR, 'package-audit.json');
const FLAKE_METRICS_OUTPUT = path.join(OUT_DIR, 'flake-metrics.json');

async function prepareDirectories(): Promise<void> {
	await fs.mkdir(OUT_DIR, { recursive: true });
	await fs.rm(COVERAGE_DIR, { recursive: true, force: true });
	await fs.rm(MUTATION_DIR, { recursive: true, force: true });
}

function runCommand(
	command: string,
	args: string[],
	options: { env?: NodeJS.ProcessEnv } = {},
): void {
	execFileSync(command, args, {
		stdio: 'inherit',
		cwd: ROOT,
		...options,
	});
}

async function generateCoverageArtifacts(): Promise<void> {
	const env = {
		...process.env,
		COVERAGE_THRESHOLD_GLOBAL: '0',
		COVERAGE_THRESHOLD_LINES: '0',
		COVERAGE_THRESHOLD_BRANCHES: '0',
		COVERAGE_THRESHOLD_FUNCTIONS: '0',
		NODE_OPTIONS: ['--max-old-space-size=2048', process.env.NODE_OPTIONS ?? '']
			.filter(Boolean)
			.join(' '),
	};

	runCommand(
		'pnpm',
		[
			'vitest',
			'run',
			'--config',
			'vitest.basic.config.ts',
			'scripts/ci/__tests__/baseline-metrics.test.ts',
			'--coverage',
			'--reporter=json',
			'--reporter=default',
			'--outputFile',
			VITEST_RESULTS,
		],
		{ env },
	);

	if (await fileExists(COVERAGE_SUMMARY)) {
		await copyFile(COVERAGE_SUMMARY, path.join(OUT_DIR, 'coverage-summary.json'));
	} else if (await fileExists(COVERAGE_FALLBACK)) {
		await copyFile(COVERAGE_FALLBACK, path.join(OUT_DIR, 'coverage-summary.json'));
	} else {
		throw new Error(
			'Coverage summary not found. Expected coverage-summary.json or coverage-final.json',
		);
	}
}

async function runCodemap(): Promise<void> {
	runCommand('pnpm', ['codemap']);
}

async function runPackageAudit(): Promise<void> {
	const result = execFileSync('pnpm', ['audit', '--json'], {
		cwd: ROOT,
		encoding: 'utf8',
		stdio: ['inherit', 'pipe', 'inherit'],
	});
	await fs.writeFile(PACKAGE_AUDIT_OUTPUT, ensureTrailingNewline(result), 'utf8');
}

async function runMutationTesting(): Promise<void> {
	runCommand('pnpm', ['mutation:test']);
	if (!(await fileExists(MUTATION_REPORT))) {
		throw new Error('Expected mutation report at reports/mutation/mutation-score-report.json');
	}
	await copyFile(MUTATION_REPORT, path.join(OUT_DIR, 'mutation.json'));
}

async function deriveFlakeMetrics(): Promise<void> {
	if (!(await fileExists(VITEST_RESULTS))) {
		throw new Error('Vitest JSON results not found at out/vitest-results.json');
	}

	const raw = await fs.readFile(VITEST_RESULTS, 'utf8');
	const report = JSON.parse(raw) as VitestJsonReport;
	const totalTests = report.numTotalTests ?? 0;
	const failedTests = report.numFailedTests ?? 0;
	const durations = collectDurations(report);
	const averageDurationMs = durations.length > 0 ? sum(durations) / durations.length : null;

	const payload = {
		flakeRate: totalTests > 0 ? failedTests / totalTests : 0,
		averageDurationMs,
		testRuns: totalTests,
	};

	await fs.writeFile(FLAKE_METRICS_OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function copyFile(source: string, destination: string): Promise<void> {
	await fs.mkdir(path.dirname(destination), { recursive: true });
	await fs.copyFile(source, destination);
}

async function fileExists(target: string): Promise<boolean> {
	try {
		await fs.access(target);
		return true;
	} catch {
		return false;
	}
}

function ensureTrailingNewline(content: string): string {
	return content.endsWith('\n') ? content : `${content}\n`;
}

function collectDurations(report: VitestJsonReport): number[] {
	const results = report.testResults ?? [];
	const durations: number[] = [];
	for (const suite of results) {
		for (const assertion of suite.assertionResults ?? []) {
			if (typeof assertion.duration === 'number' && Number.isFinite(assertion.duration)) {
				durations.push(assertion.duration);
			}
		}
	}
	return durations;
}

function sum(values: number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

interface VitestJsonReport {
	numTotalTests?: number;
	numFailedTests?: number;
	testResults?: Array<{
		assertionResults?: Array<{
			duration?: number;
		}>;
	}>;
}

async function main(): Promise<void> {
	await prepareDirectories();
	await generateCoverageArtifacts();
	await runCodemap();
	await runMutationTesting();
	await runPackageAudit();
	await deriveFlakeMetrics();
	console.log('[brAInwav] Baseline prerequisites generated');
}

main().catch((error) => {
	console.error('[brAInwav] ❌ Baseline preparation failed');
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
