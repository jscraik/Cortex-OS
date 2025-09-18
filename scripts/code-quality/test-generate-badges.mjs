#!/usr/bin/env node
// Lightweight self-contained test for generate-badges.mjs without invoking Vitest.
// Exits non-zero if expectations fail.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function fail(msg) {
	console.error(`[badges-test] FAIL: ${msg}`);
	process.exit(1);
}

const SCRIPT = path.resolve('scripts/code-quality/generate-badges.mjs');
if (!fs.existsSync(SCRIPT)) fail('generate-badges.mjs not found');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'badges-test-'));
process.chdir(tmp);

// Fixtures
fs.mkdirSync('coverage', { recursive: true });
fs.writeFileSync(
	'coverage/coverage-summary.json',
	JSON.stringify({ total: { branches: { pct: 70.2 } } }),
);
fs.mkdirSync('reports/mutation', { recursive: true });
fs.writeFileSync(
	'reports/mutation/mutation.json',
	JSON.stringify({
		mutationScore: 82.4,
		files: {
			'src/file.ts': {
				mutants: [
					{ mutatorName: 'ArithmeticOperator', status: 'Killed' },
					{ mutatorName: 'ArithmeticOperator', status: 'Survived' },
					{ mutatorName: 'StringLiteral', status: 'Killed' },
					{ mutatorName: 'StringLiteral', status: 'NoCoverage' },
					{ mutatorName: 'StringLiteral', status: 'Timeout' },
				],
			},
		},
	}),
);

const run = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
if (run.status !== 0)
	fail(`script exited with code ${run.status}: ${run.stderr || run.stdout}`);

const outDir = path.resolve('reports/badges');
const needed = [
	'branch-coverage.svg',
	'mutation-score.svg',
	'quality-gate.svg',
	'metrics.json',
	'mutation-operators-summary.json',
];
for (const f of needed) {
	if (!fs.existsSync(path.join(outDir, f)))
		fail(`missing expected artifact ${f}`);
}

const metrics = JSON.parse(
	fs.readFileSync(path.join(outDir, 'metrics.json'), 'utf8'),
);
if (Math.abs(metrics.branchCoverage - 70.2) > 0.11)
	fail('branchCoverage mismatch');
if (Math.abs(metrics.mutationScore - 82.4) > 0.11)
	fail('mutationScore mismatch');
if (!metrics.qualityGate?.pass) fail('quality gate should pass with defaults');

const ops = JSON.parse(
	fs.readFileSync(path.join(outDir, 'mutation-operators-summary.json'), 'utf8'),
);
if (!ops.find((o) => o.mutator === 'ArithmeticOperator' && o.total === 2))
	fail('ArithmeticOperator summary missing');
if (!ops.find((o) => o.mutator === 'StringLiteral' && o.total === 3))
	fail('StringLiteral summary missing');

// Validate SVG structure (basic check)
const branchSvg = fs.readFileSync(
	path.join(outDir, 'branch-coverage.svg'),
	'utf8',
);
if (!branchSvg.includes('70.2%') || !branchSvg.includes('role="img"'))
	fail('branch coverage SVG malformed');

console.log('[badges-test] PASS all assertions');
