/**
 * brAInwav Quality Gate Enforcer
 * Comprehensive production readiness validation system
 * Enforces quality gates defined in quality_gate.json contract
 *
 * Co-authored-by: brAInwav Development Team
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface QualityContract {
	coverage: {
		line: number;
		branch: number;
		mutation_score: number;
		ratchet?: CoverageRatchetConfig;
	};
	security: {
		max_critical: number;
		max_high: number;
		secrets_scan_required: boolean;
		sbom_required: boolean;
	};
	ops_readiness_min: number;
	performance: {
		p95_latency_ms_max: number;
		error_rate_pct_max: number;
		throughput_min_rps: number;
	};
	reliability: {
		graceful_shutdown_max_seconds: number;
		circuit_breaker_required: boolean;
	};
}

export interface CoverageRatchetConfig {
	baseline_path: string;
	line_slack_percent?: number;
	branch_slack_percent?: number;
}

export interface BaselineCoverageSnapshot {
	line?: { percentage?: number } | number;
	branch?: { percentage?: number } | number;
	lines?: { percentage?: number };
	branches?: { percentage?: number };
}

export interface CoverageMetrics {
	total: number;
	covered: number;
	percentage: number;
	lines: {
		total: number;
		covered: number;
		percentage: number;
	};
	branches: {
		total: number;
		covered: number;
		percentage: number;
	};
	functions: {
		total: number;
		covered: number;
		percentage: number;
	};
}

export interface MutationMetrics {
	score: number;
	killed: number;
	survived: number;
	total: number;
	timeout: number;
}

export interface SecurityMetrics {
	critical: number;
	high: number;
	medium: number;
	low: number;
	info: number;
	secrets_clean: boolean;
	sbom_generated: boolean;
}

export interface OpsReadinessMetrics {
	percentage: number;
	score: number;
	max_score: number;
	criteria: Array<{
		name: string;
		status: 'pass' | 'fail';
	}>;
}

export interface PerformanceMetrics {
	p95_latency: number;
	error_rate: number;
	throughput: number;
}

export interface ReliabilityMetrics {
	graceful_shutdown_verified: boolean;
	graceful_shutdown_time: number;
	circuit_breaker_tested: boolean;
}

export interface QualityGateResult {
	passed: boolean;
	violations: string[];
	warnings: string[];
	report: QualityReport;
	summary: QualitySummary;
}

export interface QualityReport {
	timestamp: string;
	brainwav_quality_gate_version: string;
	gates_passed: boolean;
	violations_count: number;
	warnings_count: number;
	violations: string[];
	warnings: string[];
	contract_path: string;
	metrics_dir: string;
	brainwav_compliance: boolean;
}

export interface QualitySummary {
	gates_passed: boolean;
	violations_count: number;
	warnings_count: number;
	brainwav_standards_met: boolean;
	production_ready: boolean;
}

export class QualityGateEnforcer {
	private contractPath: string;
	private metricsDir: string;
	private contract: QualityContract | null = null;
	private violations: string[] = [];
	private warnings: string[] = [];

	constructor(contractPath: string, metricsDir: string) {
		this.contractPath = contractPath;
		this.metricsDir = metricsDir;
	}

	/**
	 * Load and validate the quality gate contract
	 */
	async loadContract(): Promise<void> {
		try {
			const contractContent = await fs.readFile(this.contractPath, 'utf8');
			this.contract = JSON.parse(contractContent) as QualityContract;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				throw new Error(`Quality gate contract not found: ${this.contractPath}`);
			}
			throw new Error(`Invalid quality gate contract: ${(error as Error).message}`);
		}
	}

	/**
	 * Load metrics file with error handling
	 */
	private async loadMetricsFile<T>(filename: string, required: boolean = true): Promise<T | null> {
		const filePath = path.join(this.metricsDir, filename);

		try {
			const content = await fs.readFile(filePath, 'utf8');
			return JSON.parse(content) as T;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				if (required) {
					this.violations.push(`Required metrics file missing: ${filename}`);
				} else {
					this.warnings.push(`Optional metrics file missing: ${filename}`);
				}
				return null;
			}
			this.violations.push(`Invalid JSON in metrics file ${filename}: ${(error as Error).message}`);
			return null;
		}
	}

	/**
	 * Ensure metrics directory exists
	 */
	private async ensureMetricsDirectory(): Promise<void> {
		try {
			await fs.access(this.metricsDir);
		} catch {
			await fs.mkdir(this.metricsDir, { recursive: true });
		}
	}

	/**
	 * Validate coverage metrics against thresholds
	 */
	private async validateCoverage(): Promise<void> {
		console.log('[brAInwav] Validating coverage metrics...');

		const coverage = await this.loadMetricsFile<CoverageMetrics>('coverage.json', true);
		if (!coverage) return;

		const mutation = await this.loadMetricsFile<MutationMetrics>('mutation.json', false);
		const mutationScore = mutation?.score || 0;

		const { coverage: coverageConfig } = this.contract!;

		await this.validateCoverageRatchet(coverage);

		// Validate line coverage
		if (coverage.lines.percentage < coverageConfig.line) {
			this.violations.push(
				`Line coverage ${coverage.lines.percentage.toFixed(1)}% < required ${coverageConfig.line}% (brAInwav standard)`,
			);
		}

		// Validate branch coverage
		if (coverage.branches.percentage < coverageConfig.branch) {
			this.violations.push(
				`Branch coverage ${coverage.branches.percentage.toFixed(1)}% < required ${coverageConfig.branch}% (brAInwav standard)`,
			);
		}

		// Validate mutation score
		if (mutationScore < coverageConfig.mutation_score) {
			this.violations.push(
				`Mutation score ${mutationScore.toFixed(1)}% < required ${coverageConfig.mutation_score}% (prevents vacuous tests)`,
			);
		}

		console.log(
			`[brAInwav] Coverage: ${coverage.lines.percentage.toFixed(1)}% line, ${coverage.branches.percentage.toFixed(1)}% branch, ${mutationScore.toFixed(1)}% mutation`,
		);
	}

	private async validateCoverageRatchet(coverage: CoverageMetrics): Promise<void> {
		const ratchet = this.contract?.coverage?.ratchet;
		if (!ratchet) {
			return;
		}

		const baselinePath = path.isAbsolute(ratchet.baseline_path)
			? ratchet.baseline_path
			: path.resolve(path.dirname(this.contractPath), ratchet.baseline_path);

		let snapshot: BaselineCoverageSnapshot;
		try {
			const raw = await fs.readFile(baselinePath, 'utf8');
			snapshot = JSON.parse(raw) as BaselineCoverageSnapshot;
		} catch (error) {
			this.violations.push(
				`Coverage ratchet baseline missing or invalid at ${baselinePath}: ${(error as Error).message}`,
			);
			return;
		}

		const baselineLine = this.extractBaselinePercentage(snapshot, 'line');
		const baselineBranch = this.extractBaselinePercentage(snapshot, 'branch');
		const allowedLineDrop = ratchet.line_slack_percent ?? 0;
		const allowedBranchDrop = ratchet.branch_slack_percent ?? 0;

		if (
			typeof baselineLine === 'number' &&
			coverage.lines.percentage < baselineLine - allowedLineDrop
		) {
			this.violations.push(
				`Line coverage ${coverage.lines.percentage.toFixed(1)}% < ratchet baseline ${baselineLine.toFixed(1)}% (allowable drop ${allowedLineDrop.toFixed(1)}%)`,
			);
		}

		if (
			typeof baselineBranch === 'number' &&
			coverage.branches.percentage < baselineBranch - allowedBranchDrop
		) {
			this.violations.push(
				`Branch coverage ${coverage.branches.percentage.toFixed(1)}% < ratchet baseline ${baselineBranch.toFixed(1)}% (allowable drop ${allowedBranchDrop.toFixed(1)}%)`,
			);
		}
	}

	private extractBaselinePercentage(
		snapshot: BaselineCoverageSnapshot,
		key: 'line' | 'branch',
	): number | null {
		const direct = snapshot[key];
		if (typeof direct === 'number') {
			return direct;
		}
		if (direct && typeof direct === 'object' && typeof direct.percentage === 'number') {
			return direct.percentage;
		}
		const alias = key === 'line' ? snapshot.lines : snapshot.branches;
		if (alias && typeof alias === 'object' && typeof alias.percentage === 'number') {
			return alias.percentage;
		}
		return null;
	}

	/**
	 * Validate security metrics against thresholds
	 */
	private async validateSecurity(): Promise<void> {
		console.log('[brAInwav] Validating security metrics...');

		const security = await this.loadMetricsFile<SecurityMetrics>('security.json', false);
		if (!security) {
			this.warnings.push('No security scan results found - run security audit');
			return;
		}

		const { security: securityConfig } = this.contract!;

		// Validate critical vulnerabilities
		if (security.critical > securityConfig.max_critical) {
			this.violations.push(
				`Critical vulnerabilities: ${security.critical} > allowed ${securityConfig.max_critical} (brAInwav zero-tolerance policy)`,
			);
		}

		// Validate high vulnerabilities
		if (security.high > securityConfig.max_high) {
			this.violations.push(
				`High vulnerabilities: ${security.high} > allowed ${securityConfig.max_high} (brAInwav zero-tolerance policy)`,
			);
		}

		// Validate secrets scan
		if (securityConfig.secrets_scan_required && !security.secrets_clean) {
			this.violations.push(
				'Secrets scan failed - hardcoded secrets detected (brAInwav security policy violation)',
			);
		}

		// Validate SBOM generation
		if (securityConfig.sbom_required && !security.sbom_generated) {
			this.violations.push(
				'SBOM generation required for supply chain security (brAInwav compliance requirement)',
			);
		}

		console.log(
			`[brAInwav] Security: ${security.critical} critical, ${security.high} high vulnerabilities`,
		);
	}

	/**
	 * Validate operational readiness
	 */
	private async validateOpsReadiness(): Promise<void> {
		console.log('[brAInwav] Validating operational readiness...');

		const ops = await this.loadMetricsFile<OpsReadinessMetrics>('ops-readiness.json', false);
		if (!ops) {
			this.violations.push('Operational readiness assessment required - run ops-readiness.sh');
			return;
		}

		const minScore = this.contract?.ops_readiness_min;
		const actualScore = ops.percentage / 100;

		if (actualScore < minScore) {
			this.violations.push(
				`Operational readiness ${ops.percentage.toFixed(1)}% < required ${(minScore * 100).toFixed(1)}% (brAInwav production standard)`,
			);

			// List failed criteria if available
			if (ops.criteria) {
				const failed = ops.criteria.filter((c) => c.status === 'fail');
				if (failed.length > 0) {
					this.violations.push(
						`Failed operational criteria: ${failed.map((c) => c.name).join(', ')}`,
					);
				}
			}
		}

		console.log(
			`[brAInwav] Operational readiness: ${ops.percentage.toFixed(1)}% (${ops.score}/${ops.max_score} criteria)`,
		);
	}

	/**
	 * Validate performance metrics
	 */
	private async validatePerformance(): Promise<void> {
		console.log('[brAInwav] Validating performance metrics...');

		const perf = await this.loadMetricsFile<PerformanceMetrics>('performance.json', false);
		if (!perf) {
			this.warnings.push('No performance test results found - run load tests before production');
			return;
		}

		const { performance: perfConfig } = this.contract!;

		// Validate P95 latency
		if (perf.p95_latency > perfConfig.p95_latency_ms_max) {
			this.violations.push(
				`P95 latency ${perf.p95_latency}ms > max ${perfConfig.p95_latency_ms_max}ms (brAInwav SLO violation)`,
			);
		}

		// Validate error rate
		if (perf.error_rate > perfConfig.error_rate_pct_max) {
			this.violations.push(
				`Error rate ${perf.error_rate}% > max ${perfConfig.error_rate_pct_max}% (brAInwav reliability standard)`,
			);
		}

		// Validate throughput
		if (perf.throughput < perfConfig.throughput_min_rps) {
			this.violations.push(
				`Throughput ${perf.throughput} RPS < min ${perfConfig.throughput_min_rps} RPS (brAInwav capacity requirement)`,
			);
		}

		console.log(
			`[brAInwav] Performance: ${perf.p95_latency}ms P95, ${perf.error_rate}% errors, ${perf.throughput} RPS`,
		);
	}

	/**
	 * Validate reliability metrics
	 */
	private async validateReliability(): Promise<void> {
		console.log('[brAInwav] Validating reliability metrics...');

		const reliability = await this.loadMetricsFile<ReliabilityMetrics>('reliability.json', false);
		if (!reliability) {
			this.warnings.push('No reliability test results found - fault injection testing recommended');
			return;
		}

		const { reliability: reliabilityConfig } = this.contract!;

		// Validate graceful shutdown time
		if (
			reliabilityConfig.graceful_shutdown_max_seconds &&
			reliability.graceful_shutdown_time > reliabilityConfig.graceful_shutdown_max_seconds
		) {
			this.violations.push(
				`Graceful shutdown time ${reliability.graceful_shutdown_time}s > max ${reliabilityConfig.graceful_shutdown_max_seconds}s`,
			);
		}

		// Validate circuit breaker
		if (reliabilityConfig.circuit_breaker_required && !reliability.circuit_breaker_tested) {
			this.violations.push(
				'Circuit breaker behavior not verified (brAInwav resilience requirement)',
			);
		}

		// Validate graceful shutdown verification
		if (!reliability.graceful_shutdown_verified) {
			this.violations.push('Graceful shutdown not verified (brAInwav operational requirement)');
		}

		console.log(
			`[brAInwav] Reliability: graceful shutdown ${reliability.graceful_shutdown_verified ? '✅' : '❌'}, circuit breaker ${reliability.circuit_breaker_tested ? '✅' : '❌'}`,
		);
	}

	/**
	 * Run all quality validations
	 */
	private async runValidations(): Promise<void> {
		await this.validateCoverage();
		await this.validateSecurity();
		await this.validateOpsReadiness();
		await this.validatePerformance();
		await this.validateReliability();
	}

	/**
	 * Generate quality report
	 */
	private generateReport(): QualityReport {
		return {
			timestamp: new Date().toISOString(),
			brainwav_quality_gate_version: '1.0.0',
			gates_passed: this.violations.length === 0,
			violations_count: this.violations.length,
			warnings_count: this.warnings.length,
			violations: [...this.violations],
			warnings: [...this.warnings],
			contract_path: this.contractPath,
			metrics_dir: this.metricsDir,
			brainwav_compliance: true,
		};
	}

	/**
	 * Generate quality summary
	 */
	private generateSummary(report: QualityReport): QualitySummary {
		return {
			gates_passed: report.gates_passed,
			violations_count: report.violations_count,
			warnings_count: report.warnings_count,
			brainwav_standards_met: report.gates_passed,
			production_ready: report.gates_passed,
		};
	}

	/**
	 * Write report files to metrics directory
	 */
	private async writeReports(report: QualityReport, summary: QualitySummary): Promise<void> {
		const reportPath = path.join(this.metricsDir, 'quality-gate-report.json');
		const summaryPath = path.join(this.metricsDir, 'quality-summary.json');

		await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
		await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

		console.log(`[brAInwav] Quality gate report generated: ${reportPath}`);
	}

	/**
	 * Log violations and warnings to console
	 */
	private logResults(): void {
		if (this.violations.length > 0) {
			console.error('\n[brAInwav] ❌ Quality gate violations detected:');
			for (const violation of this.violations) {
				console.error(`  🚫 ${violation}`);
			}
		}

		if (this.warnings.length > 0) {
			const prefix = this.violations.length > 0 ? '\n' : '';
			console.warn(`${prefix}[brAInwav] ⚠️  Quality gate warnings:`);
			for (const warning of this.warnings) {
				console.warn(`  ⚠️  ${warning}`);
			}
		}
	}

	/**
	 * Enforce quality gates and return results
	 */
	async enforce(): Promise<QualityGateResult> {
		console.log('[brAInwav] Quality Gate Enforcer - Production Readiness Validation');
		console.log(`[brAInwav] Contract: ${this.contractPath}`);
		console.log(`[brAInwav] Metrics: ${this.metricsDir}`);

		// Reset state
		this.violations = [];
		this.warnings = [];

		try {
			// Load contract
			await this.loadContract();

			// Ensure metrics directory exists
			await this.ensureMetricsDirectory();

			// Run all validations
			await this.runValidations();

			// Generate reports
			const report = this.generateReport();
			const summary = this.generateSummary(report);

			// Write reports to files
			await this.writeReports(report, summary);

			// Log results
			this.logResults();

			// Log final status
			if (this.violations.length === 0) {
				console.log('\n[brAInwav] ✅ All quality gates passed - production readiness validated');
				console.log('[brAInwav] 🚀 Ready for deployment with brAInwav standards compliance');
			} else {
				console.error(
					'\n[brAInwav] ❌ Quality gates failed - resolve violations before proceeding',
				);
				console.error('[brAInwav] 🚫 Production deployment blocked');
			}

			return {
				passed: this.violations.length === 0,
				violations: [...this.violations],
				warnings: [...this.warnings],
				report,
				summary,
			};
		} catch (error) {
			console.error(`[brAInwav] ❌ Quality gate enforcement failed: ${(error as Error).message}`);
			throw error;
		}
	}
}

/**
 * Run quality gate enforcement with provided paths
 */
export const runQualityGateEnforcement = async (
	contractPath: string,
	metricsDir: string,
): Promise<QualityGateResult> => {
	const enforcer = new QualityGateEnforcer(contractPath, metricsDir);
	return await enforcer.enforce();
};

/**
 * brAInwav Quality Gate Enforcer
 * Enforces production-ready quality standards for Cortex-OS
 * Following CODESTYLE.md: functional-first, ≤40 lines per function, named exports
 */

import { readFileSync, existsSync } from 'fs';
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
  thresholds: QualityGateConfig['thresholds']['coverage']
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
    violations.push(`brAInwav: Statement coverage ${metrics.statement}% < ${thresholds.statement}%`);
  }
  
  return violations;
};

// Functional utility: Validate mutation score
export const validateMutationScore = (
  metrics: QualityMetrics['mutation'],
  thresholds: QualityGateConfig['thresholds']['mutation']
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
  thresholds: QualityGateConfig['thresholds']['security']
): string[] => {
  if (!metrics) {
    return ['brAInwav: Security scan metrics not available'];
  }
  
  const violations: string[] = [];
  
  if (metrics.criticalVulnerabilities > thresholds.criticalVulnerabilities) {
    violations.push(`brAInwav: ${metrics.criticalVulnerabilities} critical vulnerabilities found (max: ${thresholds.criticalVulnerabilities})`);
  }
  
  if (metrics.highVulnerabilities > thresholds.highVulnerabilities) {
    violations.push(`brAInwav: ${metrics.highVulnerabilities} high vulnerabilities found (max: ${thresholds.highVulnerabilities})`);
  }
  
  return violations;
};

// Functional utility: Calculate quality score
export const calculateQualityScore = (metrics: QualityMetrics): number => {
  const weights = {
    coverage: 0.4,
    mutation: 0.3,
    security: 0.3
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  if (metrics.coverage) {
    const coverageScore = (
      metrics.coverage.line + 
      metrics.coverage.branch + 
      metrics.coverage.function + 
      metrics.coverage.statement
    ) / 4;
    totalScore += coverageScore * weights.coverage;
    totalWeight += weights.coverage;
  }
  
  if (metrics.mutation) {
    totalScore += metrics.mutation.score * weights.mutation;
    totalWeight += weights.mutation;
  }
  
  if (metrics.security) {
    // Security score: 100 if no vulnerabilities, decreases with findings
    const securityScore = Math.max(0, 100 - (metrics.security.criticalVulnerabilities * 20 + metrics.security.highVulnerabilities * 10));
    totalScore += securityScore * weights.security;
    totalWeight += weights.security;
  }
  
  return totalWeight > 0 ? totalScore / totalWeight : 0;
};

// Main enforcement function following functional composition
export const runQualityGateEnforcement = (metrics: QualityMetrics, configPath?: string): GateResult => {
  const config = loadQualityGateConfig(configPath);
  
  const violations: string[] = [
    ...validateCoverageThresholds(metrics.coverage, config.thresholds.coverage),
    ...validateMutationScore(metrics.mutation, config.thresholds.mutation),
    ...validateSecurityRequirements(metrics.security, config.thresholds.security)
  ];
  
  const score = calculateQualityScore(metrics);
  const passed = violations.length === 0;
  
  return {
    passed,
    violations,
    score,
    branding: config.branding.brandingMessage
  };
};

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
    
    console.log(`\\n🏁 brAInwav Quality Gate Results`);
    console.log(`Score: ${result.score.toFixed(1)}%`);
    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Branding: ${result.branding}\\n`);
    
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
