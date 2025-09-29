#!/usr/bin/env node
/**
 * brAInwav Quality Gate Enforcement Script
 * Enforces comprehensive production readiness gates as defined in .eng/quality_gate.json
 * 
 * Co-authored-by: brAInwav Development Team
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACT_FILE = path.resolve('.eng/quality_gate.json');
const DEFAULT_METRICS_DIR = path.resolve('out');

/**
 * @typedef {Object} QualityContract
 * @property {Object} coverage
 * @property {Object} security
 * @property {number} ops_readiness_min
 */

/**
 * @typedef {Object} MetricsData
 * @property {number} line
 * @property {number} branch
 * @property {number} score
 */

class BrAInwavQualityGateEnforcer {
    /**
     * @param {string} contractPath
     * @param {string} metricsDir
     */
    constructor(contractPath = CONTRACT_FILE, metricsDir = DEFAULT_METRICS_DIR) {
        this.contractPath = contractPath;
        this.metricsDir = metricsDir;
        this.violations = [];
        this.warnings = [];
        this.contract = null;

        console.log('[brAInwav] Quality Gate Enforcer - Production Readiness Validation');
    }

    /**
     * @returns {Promise<boolean>}
     */
    async loadContract() {
        if (!fs.existsSync(this.contractPath)) {
            throw new Error(`Quality gate contract not found: ${this.contractPath}`);
        }

        try {
            this.contract = JSON.parse(fs.readFileSync(this.contractPath, 'utf8'));
            console.log('[brAInwav] ✅ Quality gate contract loaded successfully');
            return true;
        } catch (error) {
            console.error(`[brAInwav] ❌ Failed to load quality gate contract: ${error.message}`);
            return false;
        }
    }

    /**
     * @param {string} filename
     * @param {boolean} required
     * @returns {Object|null}
     */
    loadMetricsFile(filename, required = true) {
        const filePath = path.join(this.metricsDir, filename);

        if (!fs.existsSync(filePath)) {
            if (required) {
                this.violations.push(`Required metrics file missing: ${filename}`);
            } else {
                this.warnings.push(`Optional metrics file missing: ${filename}`);
            }
            return null;
        }

        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            this.violations.push(`Invalid JSON in metrics file ${filename}: ${error.message}`);
            return null;
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async setupMetricsDirectory() {
        if (!fs.existsSync(this.metricsDir)) {
            fs.mkdirSync(this.metricsDir, { recursive: true });
            console.log(`[brAInwav] Created metrics directory: ${this.metricsDir}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async runAllQualityChecks() {
        await this.checkCoverage();
        await this.checkSecurity();
        await this.checkPerformance();
        await this.checkOpsReadiness();
        await this.checkReliability();
        await this.checkBrAInwavCompliance();
    }

    /**
     * @returns {void}
     */
    logViolationsAndWarnings() {
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
     * @returns {void}
     */
    determineExitStatus() {
        if (this.violations.length > 0) {
            console.error('\n[brAInwav] Production deployment blocked - resolve violations before proceeding');
            process.exit(1);
        }

        console.log('\n[brAInwav] ✅ All quality gates passed - production readiness validated');
        console.log('[brAInwav] 🚀 Ready for deployment with brAInwav standards compliance');
    }

    /**
     * @returns {Promise<void>}
     */
    async enforce() {
        console.log('[brAInwav] Enforcing production readiness quality gates...');

        if (!(await this.loadContract())) {
            process.exit(1);
        }

        await this.setupMetricsDirectory();
        await this.runAllQualityChecks();
        await this.generateReport();

        this.logViolationsAndWarnings();
        this.determineExitStatus();
    }

    /**
     * @returns {Object|null}
     */
    loadCoverageMetrics() {
        const coverage = this.loadMetricsFile('coverage.json', true);
        if (!coverage) {
            this.violations.push('Coverage metrics required - generate coverage.json');
            return null;
        }
        return coverage;
    }

    /**
     * @returns {Object|null}
     */
    loadMutationMetrics() {
        const mutation = this.loadMetricsFile('mutation.json', false);
        if (!mutation) {
            this.warnings.push('No mutation testing data found');
            return { score: 0 };
        }
        return mutation;
    }

    /**
     * @param {Object} coverage
     * @param {Object} mutation
     * @returns {void}
     */
    validateCoverageThresholds(coverage, mutation) {
        const { coverage: coverageConfig } = this.contract;

        if (coverage.line < coverageConfig.line) {
            this.violations.push(
                `Line coverage ${coverage.line.toFixed(1)}% < required ${coverageConfig.line}% (brAInwav standard)`
            );
        }

        if (coverage.branch < coverageConfig.branch) {
            this.violations.push(
                `Branch coverage ${coverage.branch.toFixed(1)}% < required ${coverageConfig.branch}% (brAInwav standard)`
            );
        }

        if (mutation.score < coverageConfig.mutation_score) {
            this.violations.push(
                `Mutation score ${mutation.score.toFixed(1)}% < required ${coverageConfig.mutation_score}% (prevents vacuous tests)`
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async checkCoverage() {
        console.log('[brAInwav] Checking coverage requirements...');

        const coverage = this.loadCoverageMetrics();
        if (!coverage) return;

        const mutation = this.loadMutationMetrics();
        this.validateCoverageThresholds(coverage, mutation);

        console.log(`[brAInwav] Coverage: ${coverage.line.toFixed(1)}% line, ${coverage.branch.toFixed(1)}% branch, ${mutation.score.toFixed(1)}% mutation`);
    }

    /**
     * @returns {Promise<void>}
     */
    async checkSecurity() {
        console.log('[brAInwav] Checking security requirements...');

        const security = this.loadMetricsFile('security.json', false);
        if (!security) {
            this.warnings.push('No security scan results found - run security audit');
            return;
        }

        this.validateSecurityThresholds(security);
        console.log(`[brAInwav] Security: ${security.critical || 0} critical, ${security.high || 0} high vulnerabilities`);
    }

    /**
     * @param {Object} security
     * @returns {void}
     */
    validateSecurityThresholds(security) {
        const { security: securityConfig } = this.contract;

        if (security.critical > securityConfig.max_critical) {
            this.violations.push(
                `Critical vulnerabilities: ${security.critical} > allowed ${securityConfig.max_critical} (brAInwav zero-tolerance policy)`
            );
        }

        if (security.high > securityConfig.max_high) {
            this.violations.push(
                `High vulnerabilities: ${security.high} > allowed ${securityConfig.max_high} (brAInwav zero-tolerance policy)`
            );
        }

        if (securityConfig.secrets_scan_required && !security.secrets_clean) {
            this.violations.push('Secrets scan failed - hardcoded secrets detected (brAInwav security policy violation)');
        }

        if (securityConfig.sbom_required && !security.sbom_generated) {
            this.violations.push('SBOM generation required for supply chain security (brAInwav compliance requirement)');
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async checkPerformance() {
        console.log('[brAInwav] Checking performance requirements...');

        const perf = this.loadMetricsFile('performance.json', false);
        if (!perf) {
            this.warnings.push('No performance test results found - run load tests before production');
            return;
        }

        this.validatePerformanceThresholds(perf);
        console.log(`[brAInwav] Performance: ${perf.p95_latency || 'N/A'}ms P95, ${perf.error_rate || 'N/A'}% errors, ${perf.throughput || 'N/A'} RPS`);
    }

    /**
     * @param {Object} perf
     * @returns {void}
     */
    validatePerformanceThresholds(perf) {
        const { performance: perfConfig } = this.contract;

        if (perf.p95_latency > perfConfig.p95_latency_ms_max) {
            this.violations.push(
                `P95 latency ${perf.p95_latency}ms > max ${perfConfig.p95_latency_ms_max}ms (brAInwav SLO violation)`
            );
        }

        if (perf.error_rate > perfConfig.error_rate_pct_max) {
            this.violations.push(
                `Error rate ${perf.error_rate}% > max ${perfConfig.error_rate_pct_max}% (brAInwav reliability standard)`
            );
        }

        if (perf.throughput < perfConfig.throughput_min_rps) {
            this.violations.push(
                `Throughput ${perf.throughput} RPS < min ${perfConfig.throughput_min_rps} RPS (brAInwav capacity requirement)`
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async checkOpsReadiness() {
        console.log('[brAInwav] Checking operational readiness...');

        const ops = this.loadMetricsFile('ops-readiness.json', false);
        if (!ops) {
            this.violations.push('Operational readiness assessment required - run ops-readiness.sh');
            return;
        }

        this.validateOpsReadinessScore(ops);
        const actualScore = ops.percentage / 100;
        console.log(`[brAInwav] Operational readiness: ${(actualScore * 100).toFixed(1)}% (${ops.score || 0}/${ops.max_score || 20} criteria)`);
    }

    /**
     * @param {Object} ops
     * @returns {void}
     */
    validateOpsReadinessScore(ops) {
        const minScore = this.contract.ops_readiness_min;
        const actualScore = ops.percentage / 100;

        if (actualScore < minScore) {
            this.violations.push(
                `Operational readiness ${(actualScore * 100).toFixed(1)}% < required ${(minScore * 100).toFixed(1)}% (brAInwav production standard)`
            );

            if (ops.criteria) {
                const failed = ops.criteria.filter(c => c.status === 'fail');
                if (failed.length > 0) {
                    this.violations.push(`Failed operational criteria: ${failed.map(c => c.name).join(', ')}`);
                }
            }
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async checkReliability() {
        console.log('[brAInwav] Checking reliability requirements...');

        const reliability = this.loadMetricsFile('reliability.json', false);
        if (!reliability) {
            this.warnings.push('No reliability test results found - fault injection testing recommended');
            return;
        }

        this.validateReliabilityRequirements(reliability);
        console.log(`[brAInwav] Reliability: graceful shutdown ${reliability.graceful_shutdown_verified ? '✅' : '❌'}, circuit breaker ${reliability.circuit_breaker_tested ? '✅' : '❌'}`);
    }

    /**
     * @param {Object} reliability
     * @returns {void}
     */
    validateReliabilityRequirements(reliability) {
        const { reliability: reliabilityConfig } = this.contract;

        if (reliabilityConfig.graceful_shutdown_max_seconds &&
            reliability.graceful_shutdown_time > reliabilityConfig.graceful_shutdown_max_seconds) {
            this.violations.push(
                `Graceful shutdown time ${reliability.graceful_shutdown_time}s > max ${reliabilityConfig.graceful_shutdown_max_seconds}s`
            );
        }

        if (reliabilityConfig.circuit_breaker_required && !reliability.circuit_breaker_tested) {
            this.violations.push('Circuit breaker behavior not verified (brAInwav resilience requirement)');
        }

        if (!reliability.graceful_shutdown_verified) {
            this.violations.push('Graceful shutdown not verified (brAInwav operational requirement)');
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async checkBrAInwavCompliance() {
        console.log('[brAInwav] Checking brAInwav brand compliance...');

        const branding = this.contract.brainwav || {};
        this.validateBrandCompliance(branding);

        console.log('[brAInwav] Brand compliance verification completed');
    }

    /**
     * @param {Object} branding
     * @returns {void}
     */
    validateBrandCompliance(branding) {
        if (branding.brand_compliance_required) {
            const brandingCheck = this.loadMetricsFile('branding.json', false);
            if (brandingCheck && brandingCheck.violations > 0) {
                this.violations.push(`Brand compliance violations detected: ${brandingCheck.violations} instances`);
            }
        }

        if (branding.system_log_branding) {
            this.warnings.push('Verify all system logs include brAInwav branding for observability compliance');
        }
    }

    /**
     * @returns {Object}
     */
    createQualityReport() {
        return {
            timestamp: new Date().toISOString(),
            brainwav_quality_gate_version: '1.0.0',
            gates_passed: this.violations.length === 0,
            violations_count: this.violations.length,
            warnings_count: this.warnings.length,
            violations: this.violations,
            warnings: this.warnings,
            contract_path: this.contractPath,
            metrics_dir: this.metricsDir,
            brainwav_compliance: true
        };
    }

    /**
     * @param {Object} report
     * @returns {Object}
     */
    createQualitySummary(report) {
        return {
            gates_passed: report.gates_passed,
            violations_count: report.violations_count,
            warnings_count: report.warnings_count,
            brainwav_standards_met: report.gates_passed,
            production_ready: report.gates_passed
        };
    }

    /**
     * @param {Object} report
     * @param {Object} summary
     * @returns {void}
     */
    writeReportFiles(report, summary) {
        const reportPath = path.join(this.metricsDir, 'quality-gate-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        const summaryPath = path.join(this.metricsDir, 'quality-summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

        console.log(`[brAInwav] Quality gate report generated: ${reportPath}`);
    }

    /**
     * @returns {Promise<void>}
     */
    async generateReport() {
        const report = this.createQualityReport();
        const summary = this.createQualitySummary(report);
        this.writeReportFiles(report, summary);
    }
}

/**
 * @param {string} contractPath
 * @param {string} metricsDir
 * @returns {Promise<void>}
 */
export const runQualityGateEnforcement = async (contractPath = CONTRACT_FILE, metricsDir = DEFAULT_METRICS_DIR) => {
    const enforcer = new BrAInwavQualityGateEnforcer(contractPath, metricsDir);
    await enforcer.enforce();
};

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const contractPath = process.argv[2] || CONTRACT_FILE;
    const metricsDir = process.argv[3] || DEFAULT_METRICS_DIR;

    runQualityGateEnforcement(contractPath, metricsDir).catch(err => {
        console.error('[brAInwav] ❌ Quality gate enforcement failed:', err.message);
        process.exit(1);
    });
}

export { BrAInwavQualityGateEnforcer };
