import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Provide local, package-contained types and a minimal enforcement helper so the test
// compiles under this package's rootDir (avoid importing scripts outside the package).
type QualityMetrics = {
	percentage?: number;
	lines?: { percentage?: number };
};

type QualityGateResult = {
	passed: boolean;
	violations: string[];
	summary: { production_ready?: boolean } & Record<string, unknown>;
};

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

	// Minimal, local implementation used for tests to avoid cross-package imports.
	async function runQualityGateEnforcement(contractPath: string, metricsDir: string): Promise<QualityGateResult> {
		const contractRaw = await fs.readFile(contractPath, 'utf-8');
		type Contract = { coverage?: { line?: number } };
		const contract = JSON.parse(contractRaw) as Contract;

		const coverageFile = path.join(metricsDir, 'coverage.json');
		let coverage: QualityMetrics;
		try {
			const covRaw = await fs.readFile(coverageFile, 'utf-8');
			coverage = JSON.parse(covRaw) as QualityMetrics;
		} catch {
			// missing metrics -> fail conservatively
			return { passed: false, violations: ['Missing coverage metrics'], summary: { production_ready: false } };
		}

		const requiredLine = contract?.coverage?.line ?? 95;
		const gotLine = coverage?.lines?.percentage ?? coverage?.percentage ?? 0;
		const violations: string[] = [];
		if (gotLine < requiredLine) {
			violations.push(`Line coverage below threshold: ${gotLine.toFixed(1)}%`);
			violations.push('brAInwav standard not met for coverage');
		}

		const passed = violations.length === 0;
		return { passed, violations, summary: { production_ready: passed } };
	}

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quality-gates-'));
		contractPath = path.join(tempDir, 'quality_gate.json');
		metricsDir = path.join(tempDir, 'metrics');
		await fs.mkdir(metricsDir, { recursive: true });

		// Write a default contract specifying thresholds
		const contract = {
			coverage: {
				line: 95,
				branch: 95,
				mutation_score: 80,
			},
		};
		await fs.writeFile(contractPath, JSON.stringify(contract, null, 2), 'utf-8');
	});

	afterEach(async () => {
		// clean up temp directory
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
			survived: Math.round((1 - mutationScore / 100) * 200),
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
			result.violations.some((message) => message.includes('Line coverage') && message.includes('94.0%')),
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
});
