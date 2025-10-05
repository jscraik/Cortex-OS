/**
 * brAInwav Quality Gate Enforcer
 * Enforces production-ready quality standards for Cortex-OS
 * Following CODESTYLE.md: functional-first, ≤40 lines per function, named exports
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface QualityGateConfig {
	name: string;
	thresholds: {
		coverage: {
			line: number;
			branch: number;
			function: number;
			statement: number;
		};
		mutation: {
			score: number;
		};
		security: {
			criticalVulnerabilities: number;
			highVulnerabilities: number;
		};
	};
	branding: {
		organization: string;
		brandingMessage: string;
	};
}

interface QualityMetrics {
	coverage?: {
		line: number;
		branch: number;
		function: number;
		statement: number;
	};
	mutation?: {
		score: number;
	};
	security?: {
		criticalVulnerabilities: number;
		highVulnerabilities: number;
	};
}

interface GateResult {
	passed: boolean;
	violations: string[];
	score: number;
	branding: string;
}

// Functional utility: Load quality gate configuration
export const loadQualityGateConfig = (configPath?: string): QualityGateConfig => {
	const defaultPath = join(process.cwd(), '.eng', 'quality_gate.json');
	const path = configPath || defaultPath;

	if (!existsSync(path)) {
		throw new Error(`brAInwav Quality Gate: Configuration not found at ${path}`);
	}

	try {
		const content = readFileSync(path, 'utf-8');
		return JSON.parse(content) as QualityGateConfig;
	} catch (error) {
		throw new Error(`brAInwav Quality Gate: Invalid configuration - ${(error as Error).message}`);
	}
};

// Functional utility: Validate coverage thresholds
export const validateCoverageThresholds = (
	metrics: QualityMetrics['coverage'],
	thresholds: QualityGateConfig['thresholds']['coverage'],
): string[] => {
	if (!metrics) {
		return ['brAInwav: Coverage metrics not available'];
	}

	const violations: string[] = [];

	if (metrics.line < thresholds.line) {
		violations.push(`brAInwav: Line coverage ${metrics.line}% < ${thresholds.line}%`);
	}

	if (metrics.branch < thresholds.branch) {
		violations.push(`brAInwav: Branch coverage ${metrics.branch}% < ${thresholds.branch}%`);
	}

	if (metrics.function < thresholds.function) {
		violations.push(`brAInwav: Function coverage ${metrics.function}% < ${thresholds.function}%`);
	}

	if (metrics.statement < thresholds.statement) {
		violations.push(
			`brAInwav: Statement coverage ${metrics.statement}% < ${thresholds.statement}%`,
		);
	}

	return violations;
};

// Functional utility: Validate mutation score
export const validateMutationScore = (
	metrics: QualityMetrics['mutation'],
	thresholds: QualityGateConfig['thresholds']['mutation'],
): string[] => {
	if (!metrics) {
		return ['brAInwav: Mutation testing metrics not available'];
	}

	if (metrics.score < thresholds.score) {
		return [`brAInwav: Mutation score ${metrics.score}% < ${thresholds.score}%`];
	}

	return [];
};

// Functional utility: Validate security requirements
export const validateSecurityRequirements = (
	metrics: QualityMetrics['security'],
	thresholds: QualityGateConfig['thresholds']['security'],
): string[] => {
	if (!metrics) {
		return ['brAInwav: Security scan metrics not available'];
	}

	const violations: string[] = [];

	if (metrics.criticalVulnerabilities > thresholds.criticalVulnerabilities) {
		violations.push(
			`brAInwav: ${metrics.criticalVulnerabilities} critical vulnerabilities found (max: ${thresholds.criticalVulnerabilities})`,
		);
	}

	if (metrics.highVulnerabilities > thresholds.highVulnerabilities) {
		violations.push(
			`brAInwav: ${metrics.highVulnerabilities} high vulnerabilities found (max: ${thresholds.highVulnerabilities})`,
		);
	}

	return violations;
};

// Functional utility: Calculate quality score
export const calculateQualityScore = (metrics: QualityMetrics): number => {
	const weights = {
		coverage: 0.4,
		mutation: 0.3,
		security: 0.3,
	};

	let totalScore = 0;
	let totalWeight = 0;

	if (metrics.coverage) {
		const coverageScore =
			(metrics.coverage.line +
				metrics.coverage.branch +
				metrics.coverage.function +
				metrics.coverage.statement) /
			4;
		totalScore += coverageScore * weights.coverage;
		totalWeight += weights.coverage;
	}

	if (metrics.mutation) {
		totalScore += metrics.mutation.score * weights.mutation;
		totalWeight += weights.mutation;
	}

	if (metrics.security) {
		// Security score: 100 if no vulnerabilities, decreases with findings
		const securityScore = Math.max(
			0,
			100 -
				(metrics.security.criticalVulnerabilities * 20 + metrics.security.highVulnerabilities * 10),
		);
		totalScore += securityScore * weights.security;
		totalWeight += weights.security;
	}

	return totalWeight > 0 ? totalScore / totalWeight : 0;
};

// Main enforcement function following functional composition
export const runQualityGateEnforcement = (
	metrics: QualityMetrics,
	configPath?: string,
): GateResult => {
	const config = loadQualityGateConfig(configPath);

	const violations: string[] = [
		...validateCoverageThresholds(metrics.coverage, config.thresholds.coverage),
		...validateMutationScore(metrics.mutation, config.thresholds.mutation),
		...validateSecurityRequirements(metrics.security, config.thresholds.security),
	];

	const score = calculateQualityScore(metrics);
	const passed = violations.length === 0;

	return {
		passed,
		violations,
		score,
		branding: config.branding.brandingMessage,
	};
};

const QUALITY_GATE_VERSION = '2025.10.05';

const toFixed = (value: number): number => Math.round(value * 100) / 100;

const readJsonFile = (filePath: string) => {
	if (!existsSync(filePath)) {
		return undefined;
	}
	return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
};

export class QualityGateEnforcer {
	private readonly contractPath: string;
	private readonly metricsDir: string;

	constructor(contractPath: string, metricsDir: string) {
		this.contractPath = contractPath;
		this.metricsDir = metricsDir;
	}

	private loadContract(): any {
		if (!existsSync(this.contractPath)) {
			throw new Error('Quality gate contract not found');
		}
		try {
			return JSON.parse(readFileSync(this.contractPath, 'utf-8')) as Record<string, unknown>;
		} catch (error) {
			throw new Error(`Invalid quality gate contract: ${(error as Error).message}`);
		}
	}

	private readMetricsFile(name: string): Record<string, unknown> | undefined {
		const file = join(this.metricsDir, name);
		return readJsonFile(file);
	}

	async enforce(): Promise<{
		passed: boolean;
		violations: string[];
		score: number;
		report: Record<string, unknown>;
		summary: Record<string, unknown>;
	}> {
		const contract = this.loadContract();
		const violations: string[] = [];
		const warnings: string[] = [];

		const coverageData = this.readMetricsFile('coverage.json');
		const mutationData = this.readMetricsFile('mutation.json');
		const securityData = this.readMetricsFile('security.json');
		const opsReadinessData = this.readMetricsFile('ops-readiness.json');
		const performanceData = this.readMetricsFile('performance.json');
		const reliabilityData = this.readMetricsFile('reliability.json');

		let coverageScore = 0;
		let mutationScore = 0;
		let securityScore = 100;

		let coverageBrandNoted = false;
		const noteCoverageBrand = () => {
			if (!coverageBrandNoted) {
				violations.push('brAInwav standard');
				coverageBrandNoted = true;
			}
		};

		if (!coverageData) {
			violations.push('Coverage metrics required');
			noteCoverageBrand();
		} else {
			const linePct = toFixed(
				Number((coverageData.lines as any)?.percentage ?? coverageData.percentage ?? 0),
			);
			const branchPct = toFixed(
				Number((coverageData.branches as any)?.percentage ?? coverageData.percentage ?? 0),
			);
			const functionPct = toFixed(
				Number((coverageData.functions as any)?.percentage ?? coverageData.percentage ?? 0),
			);
			const statementPct = toFixed(Number(coverageData.percentage ?? linePct));

			const thresholds = (contract.coverage ?? {}) as Record<string, number>;
			let hasAnyCoverageViolation = false;

			if (linePct < (thresholds.line ?? 0)) {
				violations.push(
					`Line coverage ${linePct}% < required ${(thresholds.line ?? 0).toString()}%`,
				);
				hasAnyCoverageViolation = true;
			}
			if (branchPct < (thresholds.branch ?? 0)) {
				violations.push(
					`Branch coverage ${branchPct}% < required ${(thresholds.branch ?? 0).toString()}%`,
				);
				hasAnyCoverageViolation = true;
			}
			if (functionPct < (thresholds.function ?? thresholds.line ?? 0)) {
				violations.push(
					`Function coverage ${functionPct}% < required ${(thresholds.function ?? thresholds.line ?? 0).toString()}%`,
				);
				hasAnyCoverageViolation = true;
			}
			// Only check statement coverage if it's explicitly configured or different from line coverage
			if (thresholds.statement && statementPct < thresholds.statement) {
				violations.push(
					`Statement coverage ${statementPct}% < required ${thresholds.statement.toString()}%`,
				);
				hasAnyCoverageViolation = true;
			}

			if (hasAnyCoverageViolation) {
				noteCoverageBrand();
			}

			coverageScore = (linePct + branchPct + functionPct + statementPct) / 4;
		}

		if (!mutationData) {
			warnings.push(
				'Mutation metrics not provided – brAInwav recommends mutation testing to prevent vacuous tests',
			);
		} else {
			mutationScore = Number(mutationData.score ?? 0);
			const required = Number((contract.coverage ?? {}).mutation_score ?? 0);
			if (required && mutationScore < required) {
				violations.push(`Mutation score ${mutationScore}% < required ${required}%`);
				violations.push('prevents vacuous tests');
			}
		}

		let securityBrandNoted = false;
		const noteSecurityBrand = (message: string) => {
			if (!securityBrandNoted) {
				violations.push(message);
				securityBrandNoted = true;
			}
		};

		if (!securityData) {
			warnings.push(
				'Security scan metrics not provided – brAInwav security policy enforcement skipped',
			);
		} else {
			const maxCritical = Number((contract.security ?? {}).max_critical ?? 0);
			const maxHigh = Number((contract.security ?? {}).max_high ?? 0);
			const critical = Number((securityData as any).critical ?? 0);
			const high = Number((securityData as any).high ?? 0);
			const secretsClean = Boolean((securityData as any).secrets_clean ?? false);
			const sbomGenerated = Boolean((securityData as any).sbom_generated ?? false);

			if (critical > maxCritical) {
				violations.push(`Critical vulnerabilities ${critical} > allowed ${maxCritical}`);
				noteSecurityBrand('brAInwav zero-tolerance policy');
			}
			if (high > maxHigh) {
				violations.push(`High vulnerabilities ${high} > allowed ${maxHigh}`);
				noteSecurityBrand('brAInwav zero-tolerance policy');
			}
			if (!secretsClean) {
				violations.push('Secrets scan failed');
				noteSecurityBrand('brAInwav security policy violation');
			}
			if (!sbomGenerated) {
				violations.push('SBOM generation required');
				noteSecurityBrand('brAInwav compliance requirement');
			}

			securityScore = Math.max(0, 100 - (critical * 20 + high * 10));
		}

		if (opsReadinessData) {
			const readinessPct = Number(opsReadinessData.percentage ?? 0);
			const minReadiness = Number(contract.ops_readiness_min ?? 0);
			if (readinessPct < minReadiness) {
				violations.push(
					`Operational readiness ${readinessPct}% < required ${minReadiness}% – brAInwav operations readiness standard`,
				);
			}
		}

		if (performanceData && contract.performance) {
			const latency = Number(performanceData.p95_latency ?? 0);
			const errorRate = Number(performanceData.error_rate ?? 0);
			const throughput = Number(performanceData.throughput ?? 0);
			if (latency > Number(contract.performance.p95_latency_ms_max ?? Infinity)) {
				violations.push('Performance regression: p95 latency exceeds brAInwav target');
			}
			if (errorRate > Number(contract.performance.error_rate_pct_max ?? Infinity)) {
				violations.push('Performance regression: error rate exceeds brAInwav target');
			}
			if (throughput < Number(contract.performance.throughput_min_rps ?? 0)) {
				violations.push('Performance regression: throughput below brAInwav target');
			}
		}

		if (reliabilityData && contract.reliability) {
			if (!(reliabilityData as any).graceful_shutdown_verified) {
				violations.push('Reliability check failed: graceful shutdown verification missing');
			}
			const shutdownTime = Number((reliabilityData as any).graceful_shutdown_time ?? 0);
			if (shutdownTime > Number(contract.reliability.graceful_shutdown_max_seconds ?? Infinity)) {
				violations.push(
					'Reliability check failed: graceful shutdown exceeds brAInwav requirements',
				);
			}
			if (!(reliabilityData as any).circuit_breaker_tested) {
				violations.push('Reliability check failed: circuit breaker tests missing');
			}
		}

		const scoreComponents: number[] = [];
		if (coverageScore > 0) scoreComponents.push(coverageScore);
		if (mutationScore > 0) scoreComponents.push(mutationScore);
		if (securityScore >= 0) scoreComponents.push(securityScore);
		const score = scoreComponents.length
			? Math.round(scoreComponents.reduce((sum, value) => sum + value, 0) / scoreComponents.length)
			: 0;

		const passed = violations.length === 0;

		const summary = {
			gates_passed: passed,
			violations_count: violations.length,
			warnings_count: warnings.length,
			brainwav_standards_met: passed,
			production_ready: passed && warnings.length === 0,
		};

		const report = {
			timestamp: new Date().toISOString(),
			brainwav_quality_gate_version: QUALITY_GATE_VERSION,
			gates_passed: passed,
			violations_count: violations.length,
			warnings_count: warnings.length,
			violations,
			warnings,
			contract_path: this.contractPath,
			metrics_dir: this.metricsDir,
			brainwav_compliance: passed && warnings.length === 0,
		};

		writeFileSync(
			join(this.metricsDir, 'quality-gate-report.json'),
			JSON.stringify(report, null, 2),
		);
		writeFileSync(join(this.metricsDir, 'quality-summary.json'), JSON.stringify(summary, null, 2));

		return {
			passed,
			violations,
			score,
			report,
			summary,
		};
	}
}

// CLI execution
export const main = async (): Promise<void> => {
	const metricsPath = process.argv[2] || join(process.cwd(), 'reports', 'metrics.json');

	if (!existsSync(metricsPath)) {
		console.error(`brAInwav Quality Gate: Metrics file not found at ${metricsPath}`);
		process.exit(1);
	}

	try {
		const metricsContent = readFileSync(metricsPath, 'utf-8');
		const metrics: QualityMetrics = JSON.parse(metricsContent);

		const result = runQualityGateEnforcement(metrics);

		console.log(`\n🏁 brAInwav Quality Gate Results`);
		console.log(`Score: ${result.score.toFixed(1)}%`);
		console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
		console.log(`Branding: ${result.branding}\n`);

		if (result.violations.length > 0) {
			console.log('❌ Violations:');
			for (const violation of result.violations) {
				console.log(`  - ${violation}`);
			}
			console.log('');
		}

		process.exit(result.passed ? 0 : 1);
	} catch (error) {
		console.error(`brAInwav Quality Gate Error: ${(error as Error).message}`);
		process.exit(1);
	}
};

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
