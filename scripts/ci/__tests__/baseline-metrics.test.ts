import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	BaselineSummary,
	collectCodemapBaseline,
	collectFlakeBaseline,
	collectPackageAuditBaseline,
	generateBaselineReport,
	getCoverageBaseline,
} from '../baseline-metrics';

const SAMPLE_COVERAGE = {
	total: {
		lines: { pct: 96.5, covered: 965, total: 1000 },
		branches: { pct: 91.2, covered: 912, total: 1000 },
	},
};

const SAMPLE_MUTATION = {
	score: 83.1,
};

const SAMPLE_CODEMAP = {
	nodeCount: 240,
	edgeCount: 420,
	files: [{ id: 'a.ts' }, { id: 'b.ts' }, { id: 'c.ts' }],
};

const SAMPLE_PACKAGE_AUDIT = {
	vulnerabilities: {
		critical: 0,
		high: 1,
		moderate: 4,
		low: 12,
	},
};

const SAMPLE_FLAKE_STATS = {
	flakeRate: 0.008,
	averageDurationMs: 325,
	testRuns: 240,
};

describe('baseline-metrics', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'baseline-metrics-'));
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	it('computes coverage metrics when coverage and mutation files exist', async () => {
		const metricsDir = path.join(tempDir, 'out');
		await fs.mkdir(metricsDir, { recursive: true });
		await fs.writeFile(
			path.join(metricsDir, 'coverage.json'),
			JSON.stringify(SAMPLE_COVERAGE, null, 2),
		);
		await fs.writeFile(
			path.join(metricsDir, 'mutation.json'),
			JSON.stringify(SAMPLE_MUTATION, null, 2),
		);

		const coverage = await getCoverageBaseline(metricsDir);

		expect(coverage.line.available).toBe(true);
		expect(coverage.line.percentage).toBeCloseTo(96.5);
		expect(coverage.branch.available).toBe(true);
		expect(coverage.branch.percentage).toBeCloseTo(91.2);
		expect(coverage.mutation.available).toBe(true);
		expect(coverage.mutation.percentage).toBeCloseTo(83.1);
	});

	it('marks unavailable metrics when coverage inputs are missing', async () => {
		const coverage = await getCoverageBaseline(path.join(tempDir, 'missing'));

		expect(coverage.line.available).toBe(false);
		expect(coverage.branch.available).toBe(false);
		expect(coverage.mutation.available).toBe(false);
	});

	it('aggregates codemap, audit, and flake metrics into the baseline report', async () => {
		const metricsDir = path.join(tempDir, 'metrics');
		const outputDir = path.join(tempDir, 'reports', 'baseline');
		await fs.mkdir(metricsDir, { recursive: true });

		await fs.writeFile(
			path.join(metricsDir, 'coverage-summary.json'),
			JSON.stringify(SAMPLE_COVERAGE, null, 2),
		);
		await fs.writeFile(
			path.join(metricsDir, 'mutation.json'),
			JSON.stringify(SAMPLE_MUTATION, null, 2),
		);
		await fs.writeFile(
			path.join(metricsDir, 'codemap.json'),
			JSON.stringify({ ...SAMPLE_CODEMAP, files: SAMPLE_CODEMAP.files }, null, 2),
		);
		await fs.writeFile(
			path.join(metricsDir, 'package-audit.json'),
			JSON.stringify(SAMPLE_PACKAGE_AUDIT, null, 2),
		);
		await fs.writeFile(
			path.join(metricsDir, 'flake-metrics.json'),
			JSON.stringify(SAMPLE_FLAKE_STATS, null, 2),
		);

		const summary: BaselineSummary = await generateBaselineReport({
			metricsDir,
			outputDir,
			codemapPath: path.join(metricsDir, 'codemap.json'),
			packageAuditPath: path.join(metricsDir, 'package-audit.json'),
			flakeStatsPath: path.join(metricsDir, 'flake-metrics.json'),
		});

		expect(summary.coverage.line.available).toBe(true);
		expect(summary.coverage.branch.available).toBe(true);
		expect(summary.coverage.mutation.available).toBe(true);
		expect(summary.codemap.available).toBe(true);
		expect(summary.codemap.nodes).toBe(240);
		expect(summary.packageAudit.high).toBe(1);
		expect(summary.flakes.flakeRate).toBeCloseTo(0.008);

		const summaryFile = await fs.readFile(path.join(outputDir, 'summary.json'), 'utf8');
		expect(JSON.parse(summaryFile).coverage.line.available).toBe(true);
	});

	it('returns unavailable codemap baseline when codemap file is absent', async () => {
		const baseline = await collectCodemapBaseline(path.join(tempDir, 'missing-codemap.json'));
		expect(baseline.available).toBe(false);
		expect(baseline.nodes).toBeNull();
	});

	it('returns unavailable audit baseline when audit file is absent', async () => {
		const baseline = await collectPackageAuditBaseline(path.join(tempDir, 'missing-audit.json'));
		expect(baseline.available).toBe(false);
		expect(baseline.critical).toBeNull();
	});

	it('returns unavailable flake baseline when flake metrics are absent', async () => {
		const baseline = await collectFlakeBaseline(path.join(tempDir, 'missing-flake.json'));
		expect(baseline.available).toBe(false);
		expect(baseline.flakeRate).toBeNull();
	});
});
