/**
 * brAInwav Quality Gate Enforcer Tests
 * TDD implementation for comprehensive production readiness validation
 *
 * Co-authored-by: brAInwav Development Team
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { QualityGateEnforcer } from '../quality-gate-enforcer';

describe('brAInwav Quality Gate Enforcer', () => {
	const testDir = path.join(process.cwd(), 'test-temp');
	const contractPath = path.join(testDir, 'quality_gate.json');
	const metricsDir = path.join(testDir, 'metrics');

	beforeEach(async () => {
		// Clean up and setup test environment
		await fs.rm(testDir, { recursive: true, force: true });
		await fs.mkdir(testDir, { recursive: true });
		await fs.mkdir(metricsDir, { recursive: true });

		// Create default quality gate contract
		const defaultContract = {
			coverage: {
				line: 95,
				branch: 90,
				mutation_score: 80,
			},
			security: {
				max_critical: 0,
				max_high: 0,
				secrets_scan_required: true,
				sbom_required: true,
			},
			ops_readiness_min: 0.95,
			performance: {
				p95_latency_ms_max: 500,
				error_rate_pct_max: 0.5,
				throughput_min_rps: 50,
			},
			reliability: {
				graceful_shutdown_max_seconds: 30,
				circuit_breaker_required: true,
			},
		};

		await fs.writeFile(contractPath, JSON.stringify(defaultContract, null, 2));
	});

	describe('Coverage Gate Enforcement', () => {
		it('should fail when line coverage is below 95% threshold', async () => {
			// Arrange: Create coverage metrics below threshold
			const poorCoverage = {
				total: 1000,
				covered: 940, // 94% line coverage - below 95% threshold
				percentage: 94,
				functions: { total: 100, covered: 95, percentage: 95 },
				branches: { total: 200, covered: 180, percentage: 90 },
				lines: { total: 1000, covered: 940, percentage: 94 },
			};

			await fs.writeFile(path.join(metricsDir, 'coverage.json'), JSON.stringify(poorCoverage));

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should fail due to insufficient line coverage
			expect(result.passed).toBe(false);
			expect(result.violations).toContain(
				expect.stringMatching(/Line coverage.*94.*%.*< required 95.*%/),
			);
			expect(result.violations).toContain(expect.stringMatching(/brAInwav standard/));
		});

		it('should fail when branch coverage is below threshold', async () => {
			// Arrange: Create coverage metrics with poor branch coverage
			const poorBranchCoverage = {
				total: 1000,
				covered: 960, // 96% line coverage - above threshold
				percentage: 96,
				functions: { total: 100, covered: 98, percentage: 98 },
				branches: { total: 200, covered: 170, percentage: 85 }, // Below 90% threshold
				lines: { total: 1000, covered: 960, percentage: 96 },
			};

			await fs.writeFile(
				path.join(metricsDir, 'coverage.json'),
				JSON.stringify(poorBranchCoverage),
			);

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should fail due to insufficient branch coverage
			expect(result.passed).toBe(false);
			expect(result.violations).toContain(
				expect.stringMatching(/Branch coverage.*85.*%.*< required 90.*%/),
			);
		});

		it('should fail when mutation score is below threshold', async () => {
			// Arrange: Create good coverage but poor mutation score
			const goodCoverage = {
				total: 1000,
				covered: 960,
				percentage: 96,
				functions: { total: 100, covered: 98, percentage: 98 },
				branches: { total: 200, covered: 185, percentage: 92.5 },
				lines: { total: 1000, covered: 960, percentage: 96 },
			};

			const poorMutation = {
				score: 75, // Below 80% threshold
				killed: 150,
				survived: 50,
				total: 200,
				timeout: 0,
			};

			await fs.writeFile(path.join(metricsDir, 'coverage.json'), JSON.stringify(goodCoverage));
			await fs.writeFile(path.join(metricsDir, 'mutation.json'), JSON.stringify(poorMutation));

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should fail due to insufficient mutation score
			expect(result.passed).toBe(false);
			expect(result.violations).toContain(
				expect.stringMatching(/Mutation score.*75.*%.*< required 80.*%/),
			);
			expect(result.violations).toContain(expect.stringMatching(/prevents vacuous tests/));
		});
	});

	describe('Security Gate Enforcement', () => {
		it('should fail when critical vulnerabilities are detected', async () => {
			// Arrange: Create security scan results with critical vulnerabilities
			const securityIssues = {
				critical: 2, // Above 0 threshold
				high: 0,
				medium: 5,
				low: 10,
				info: 15,
				secrets_clean: true,
				sbom_generated: true,
			};

			await fs.writeFile(
				path.join(metricsDir, 'coverage.json'),
				JSON.stringify({
					lines: { percentage: 96 },
					branches: { percentage: 92 },
					total: 1000,
					covered: 960,
				}),
			);
			await fs.writeFile(path.join(metricsDir, 'security.json'), JSON.stringify(securityIssues));

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should fail due to critical vulnerabilities
			expect(result.passed).toBe(false);
			expect(result.violations).toContain(
				expect.stringMatching(/Critical vulnerabilities.*2.*> allowed 0/),
			);
			expect(result.violations).toContain(expect.stringMatching(/brAInwav zero-tolerance policy/));
		});

		it('should fail when high vulnerabilities are detected', async () => {
			// Arrange: Create security scan results with high vulnerabilities
			const securityIssues = {
				critical: 0,
				high: 3, // Above 0 threshold
				medium: 5,
				low: 10,
				info: 15,
				secrets_clean: true,
				sbom_generated: true,
			};

			await fs.writeFile(
				path.join(metricsDir, 'coverage.json'),
				JSON.stringify({
					lines: { percentage: 96 },
					branches: { percentage: 92 },
					total: 1000,
					covered: 960,
				}),
			);
			await fs.writeFile(path.join(metricsDir, 'security.json'), JSON.stringify(securityIssues));

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should fail due to high vulnerabilities
			expect(result.passed).toBe(false);
			expect(result.violations).toContain(
				expect.stringMatching(/High vulnerabilities.*3.*> allowed 0/),
			);
		});

		it('should fail when secrets scan is not clean', async () => {
			// Arrange: Create security scan results with unclean secrets
			const securityIssues = {
				critical: 0,
				high: 0,
				medium: 2,
				low: 5,
				info: 10,
				secrets_clean: false, // Secrets detected
				sbom_generated: true,
			};

			await fs.writeFile(
				path.join(metricsDir, 'coverage.json'),
				JSON.stringify({
					lines: { percentage: 96 },
					branches: { percentage: 92 },
					total: 1000,
					covered: 960,
				}),
			);
			await fs.writeFile(path.join(metricsDir, 'security.json'), JSON.stringify(securityIssues));

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should fail due to unclean secrets scan
			expect(result.passed).toBe(false);
			expect(result.violations).toContain(expect.stringMatching(/Secrets scan failed/));
			expect(result.violations).toContain(
				expect.stringMatching(/brAInwav security policy violation/),
			);
		});

		it('should fail when SBOM is not generated', async () => {
			// Arrange: Create security scan results without SBOM
			const securityIssues = {
				critical: 0,
				high: 0,
				medium: 1,
				low: 3,
				info: 8,
				secrets_clean: true,
				sbom_generated: false, // SBOM missing
			};

			await fs.writeFile(
				path.join(metricsDir, 'coverage.json'),
				JSON.stringify({
					lines: { percentage: 96 },
					branches: { percentage: 92 },
					total: 1000,
					covered: 960,
				}),
			);
			await fs.writeFile(path.join(metricsDir, 'security.json'), JSON.stringify(securityIssues));

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should fail due to missing SBOM
			expect(result.passed).toBe(false);
			expect(result.violations).toContain(expect.stringMatching(/SBOM generation required/));
			expect(result.violations).toContain(expect.stringMatching(/brAInwav compliance requirement/));
		});
	});

	describe('Comprehensive Quality Gate Success', () => {
		it('should pass when all quality gates are met', async () => {
			// Arrange: Create metrics that meet all thresholds
			const excellentCoverage = {
				total: 1000,
				covered: 970, // 97% line coverage - above 95% threshold
				percentage: 97,
				functions: { total: 100, covered: 99, percentage: 99 },
				branches: { total: 200, covered: 190, percentage: 95 }, // Above 90% threshold
				lines: { total: 1000, covered: 970, percentage: 97 },
			};

			const goodMutation = {
				score: 85, // Above 80% threshold
				killed: 170,
				survived: 30,
				total: 200,
				timeout: 0,
			};

			const cleanSecurity = {
				critical: 0, // Meets 0 threshold
				high: 0, // Meets 0 threshold
				medium: 2,
				low: 5,
				info: 12,
				secrets_clean: true,
				sbom_generated: true,
			};

			const goodOpsReadiness = {
				percentage: 98, // Above 95% threshold
				score: 19,
				max_score: 20,
				criteria: [
					{ name: 'Health checks', status: 'pass' },
					{ name: 'Graceful shutdown', status: 'pass' },
					{ name: 'Circuit breaker', status: 'pass' },
				],
			};

			const goodPerformance = {
				p95_latency: 350, // Below 500ms threshold
				error_rate: 0.2, // Below 0.5% threshold
				throughput: 75, // Above 50 RPS threshold
			};

			const goodReliability = {
				graceful_shutdown_verified: true,
				graceful_shutdown_time: 15, // Below 30s threshold
				circuit_breaker_tested: true,
			};

			// Write all metric files
			await fs.writeFile(path.join(metricsDir, 'coverage.json'), JSON.stringify(excellentCoverage));
			await fs.writeFile(path.join(metricsDir, 'mutation.json'), JSON.stringify(goodMutation));
			await fs.writeFile(path.join(metricsDir, 'security.json'), JSON.stringify(cleanSecurity));
			await fs.writeFile(
				path.join(metricsDir, 'ops-readiness.json'),
				JSON.stringify(goodOpsReadiness),
			);
			await fs.writeFile(
				path.join(metricsDir, 'performance.json'),
				JSON.stringify(goodPerformance),
			);
			await fs.writeFile(
				path.join(metricsDir, 'reliability.json'),
				JSON.stringify(goodReliability),
			);

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should pass all quality gates
			expect(result.passed).toBe(true);
			expect(result.violations).toHaveLength(0);
			expect(result.summary.brainwav_standards_met).toBe(true);
			expect(result.summary.production_ready).toBe(true);

			// Verify brAInwav branding in output
			expect(result.report.brainwav_compliance).toBe(true);
			expect(result.report.brainwav_quality_gate_version).toBeDefined();
		});
	});

	describe('Contract File Validation', () => {
		it('should fail gracefully when quality gate contract is missing', async () => {
			// Arrange: Remove the contract file
			await fs.unlink(contractPath);

			// Act & Assert: Should throw error for missing contract
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);

			await expect(enforcer.enforce()).rejects.toThrow(
				expect.stringMatching(/Quality gate contract not found/),
			);
		});

		it('should fail gracefully when quality gate contract is invalid JSON', async () => {
			// Arrange: Write invalid JSON contract
			await fs.writeFile(contractPath, '{ invalid json }');

			// Act & Assert: Should throw error for invalid contract
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);

			await expect(enforcer.enforce()).rejects.toThrow();
		});

		it('should fail when required metrics files are missing', async () => {
			// Arrange: Don't create coverage.json (required file)

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Should fail due to missing required metrics
			expect(result.passed).toBe(false);
			expect(result.violations).toContain(expect.stringMatching(/Coverage metrics required/));
		});
	});

	describe('Report Generation', () => {
		it('should generate comprehensive quality gate report', async () => {
			// Arrange: Create minimal passing metrics
			const passingCoverage = {
				total: 100,
				covered: 96,
				percentage: 96,
				functions: { total: 10, covered: 10, percentage: 100 },
				branches: { total: 20, covered: 19, percentage: 95 },
				lines: { total: 100, covered: 96, percentage: 96 },
			};

			await fs.writeFile(path.join(metricsDir, 'coverage.json'), JSON.stringify(passingCoverage));

			// Act: Run quality gate enforcement
			const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
			const result = await enforcer.enforce();

			// Assert: Verify report structure
			expect(result.report).toMatchObject({
				timestamp: expect.any(String),
				brainwav_quality_gate_version: expect.any(String),
				gates_passed: expect.any(Boolean),
				violations_count: expect.any(Number),
				warnings_count: expect.any(Number),
				violations: expect.any(Array),
				warnings: expect.any(Array),
				contract_path: contractPath,
				metrics_dir: metricsDir,
				brainwav_compliance: true,
			});

			// Verify summary structure
			expect(result.summary).toMatchObject({
				gates_passed: expect.any(Boolean),
				violations_count: expect.any(Number),
				warnings_count: expect.any(Number),
				brainwav_standards_met: expect.any(Boolean),
				production_ready: expect.any(Boolean),
			});

			// Verify report files are created
			const reportFile = path.join(metricsDir, 'quality-gate-report.json');
			const summaryFile = path.join(metricsDir, 'quality-summary.json');

			expect(await fs.access(reportFile)).not.toThrow();
			expect(await fs.access(summaryFile)).not.toThrow();
		});
	});
});
