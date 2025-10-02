import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type QualityGateResult,
	runQualityGateEnforcement,
} from '../../scripts/ci/quality-gate-enforcer';

interface SeedOptions {
	coverage?: {
		lines: number;
		branches: number;
	};
	mutationScore?: number;
}

describe('Quality Gate Enforcement', () => {
	let tempDir: string;
	let contractPath: string;
	let metricsDir: string;
	let baselineCoveragePath: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-gates-'));
		contractPath = path.join(tempDir, 'quality_gate.json');
		metricsDir = path.join(tempDir, 'metrics');
		await fs.mkdir(metricsDir, { recursive: true });
		baselineCoveragePath = path.join(tempDir, 'coverage-baseline.json');

		const contract = {
			coverage: {
				line: 95,
				branch: 95,
				mutation_score: 80,
				ratchet: {
					baseline_path: baselineCoveragePath,
					line_slack_percent: 0.2,
					branch_slack_percent: 0.2,
				},
			},
			security: {
				max_critical: 0,
				max_high: 0,
				secrets_scan_required: true,
				sbom_required: true,
			},
			ops_readiness_min: 0.95,
			performance: {
				p95_latency_ms_max: 250,
				error_rate_pct_max: 0.5,
				throughput_min_rps: 100,
			},
			reliability: {
				graceful_shutdown_max_seconds: 30,
				circuit_breaker_required: true,
			},
		};

		await fs.writeFile(contractPath, JSON.stringify(contract, null, 2));
		const baselineCoverage = {
			line: { percentage: 96 },
			branch: { percentage: 95.5 },
		};
		await fs.writeFile(baselineCoveragePath, JSON.stringify(baselineCoverage, null, 2));

		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	async function seedMetrics(options: SeedOptions = {}): Promise<void> {
		const coveragePercentage = options.coverage?.lines ?? 97;
		const branchPercentage = options.coverage?.branches ?? 96;
		const mutationScore = options.mutationScore ?? 85;

		const coverageMetrics = {
			total: 1000,
			covered: Math.round((coveragePercentage / 100) * 1000),
			percentage: coveragePercentage,
			lines: {
				total: 1000,
				covered: Math.round((coveragePercentage / 100) * 1000),
				percentage: coveragePercentage,
			},
			branches: {
				total: 500,
				covered: Math.round((branchPercentage / 100) * 500),
				percentage: branchPercentage,
			},
			functions: {
				total: 200,
				covered: 200,
				percentage: 100,
			},
		};

		const mutationMetrics = {
			score: mutationScore,
			killed: Math.round((mutationScore / 100) * 200),
			survived: Math.max(0, 200 - Math.round((mutationScore / 100) * 200)),
			total: 200,
			timeout: 0,
		};

		const securityMetrics = {
			critical: 0,
			high: 0,
			medium: 1,
			low: 2,
			info: 5,
			secrets_clean: true,
			sbom_generated: true,
		};

		const opsReadinessMetrics = {
			percentage: 97,
			score: 19,
			max_score: 20,
			criteria: [
				{ name: 'Health checks', status: 'pass' },
				{ name: 'Circuit breakers', status: 'pass' },
			],
		};

		const performanceMetrics = {
			p95_latency: 200,
			error_rate: 0.4,
			throughput: 150,
		};

		const reliabilityMetrics = {
			graceful_shutdown_verified: true,
			graceful_shutdown_time: 15,
			circuit_breaker_tested: true,
		};

		await Promise.all([
			writeMetrics('coverage.json', coverageMetrics),
			writeMetrics('mutation.json', mutationMetrics),
			writeMetrics('security.json', securityMetrics),
			writeMetrics('ops-readiness.json', opsReadinessMetrics),
			writeMetrics('performance.json', performanceMetrics),
			writeMetrics('reliability.json', reliabilityMetrics),
		]);
	}

	function writeMetrics(filename: string, payload: unknown): Promise<void> {
		return fs.writeFile(path.join(metricsDir, filename), JSON.stringify(payload, null, 2));
	}

	it('should fail pull request when coverage dips below brAInwav threshold', async () => {
		await seedMetrics({ coverage: { lines: 94, branches: 97 } });

		const result: QualityGateResult = await runQualityGateEnforcement(contractPath, metricsDir);

		expect(result.passed).toBe(false);
		expect(
			result.violations.some(
				(message) => message.includes('Line coverage') && message.includes('94.0% < required 95%'),
			),
		).toBe(true);
		expect(result.violations.some((message) => message.includes('brAInwav standard'))).toBe(true);
	});

	it('should pass when all quality gates meet brAInwav policy', async () => {
		await seedMetrics();

		const result: QualityGateResult = await runQualityGateEnforcement(contractPath, metricsDir);

		expect(result.passed).toBe(true);
		expect(result.violations).toHaveLength(0);
		expect(result.summary.production_ready).toBe(true);
	});

	it('should enforce coverage ratchet thresholds via baseline metrics', async () => {
		await seedMetrics({ coverage: { lines: 95.5, branches: 95 } });

		const result: QualityGateResult = await runQualityGateEnforcement(contractPath, metricsDir);

		expect(result.passed).toBe(false);
		expect(result.violations.some((message) => message.includes('ratchet baseline'))).toBe(true);
	});
});
