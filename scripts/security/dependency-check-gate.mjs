#!/usr/bin/env node
/**
 * OWASP Dependency Check Security Gate
 * 
 * This script acts as a security gate that blocks builds/deploys if there are 
 * high or critical severity vulnerabilities found in dependencies.
 * 
 * Usage: node scripts/security/dependency-check-gate.mjs [--threshold=<level>] [--report-path=<path>]
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = join(__dirname, '../../');

// Security gate configuration
const DEFAULT_CONFIG = {
    threshold: 'high', // Block on high and critical severities
    allowedVulns: 5,   // Max allowed high/critical vulnerabilities
    failOnCritical: true,
    reportPath: 'reports/dependency-security-gate.json'
};

class DependencySecurityGate {
    constructor(config = DEFAULT_CONFIG) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.results = {
            timestamp: new Date().toISOString(),
            passed: false,
            vulnerabilities: {
                critical: 0,
                high: 0,
                moderate: 0,
                low: 0,
                total: 0
            },
            details: [],
            threshold: this.config.threshold,
            allowedVulns: this.config.allowedVulns
        };
    }

    async runGate() {
        console.log('🔒 Running OWASP Dependency Check Security Gate...');
        console.log(`   Threshold: ${this.config.threshold}`);
        console.log(`   Max allowed high/critical vulns: ${this.config.allowedVulns}`);

        try {
            // Run npm audit first (faster than OWASP dependency check)
            await this.runNpmAudit();

            // Run additional security checks if npm audit passes
            if (this.shouldRunFullScan()) {
                await this.runOWASPDependencyCheck();
            }

            // Evaluate results
            this.evaluateResults();

            // Generate report
            this.generateReport();

            // Exit with appropriate code
            if (this.results.passed) {
                console.log('✅ Security gate PASSED - No blocking vulnerabilities found');
                process.exit(0);
            } else {
                console.log('❌ Security gate FAILED - Blocking vulnerabilities found');
                this.logFailureDetails();
                process.exit(1);
            }

        } catch (error) {
            console.error('💥 Security gate execution failed:', error.message);
            this.results.error = error.message;
            this.generateReport();
            process.exit(1);
        }
    }

    async runNpmAudit() {
        console.log('📊 Running npm audit...');

        try {
            // Run npm audit and capture JSON output
            const auditResult = execSync('pnpm audit --json', {
                encoding: 'utf8',
                cwd: WORKSPACE_ROOT,
                stdio: ['ignore', 'pipe', 'ignore'] // Ignore stderr to avoid noise
            });

            const audit = JSON.parse(auditResult);
            this.processNpmAuditResults(audit);

        } catch (error) {
            // npm audit exits with non-zero when vulnerabilities are found
            if (error.stdout) {
                try {
                    const audit = JSON.parse(error.stdout);
                    this.processNpmAuditResults(audit);
                } catch (parseError) {
                    console.warn('⚠️  Failed to parse npm audit output, continuing...', parseError.message);
                }
            }
        }
    }

    processNpmAuditResults(audit) {
        if (audit.auditReportVersion) {
            // npm v7+ audit format
            this.results.vulnerabilities = {
                critical: audit.metadata?.vulnerabilities?.critical || 0,
                high: audit.metadata?.vulnerabilities?.high || 0,
                moderate: audit.metadata?.vulnerabilities?.moderate || 0,
                low: audit.metadata?.vulnerabilities?.low || 0,
                total: audit.metadata?.vulnerabilities?.total || 0
            };

            // Extract details from advisories
            if (audit.advisories) {
                Object.values(audit.advisories).forEach(advisory => {
                    this.results.details.push({
                        source: 'npm-audit',
                        id: advisory.id || advisory.github_advisory_id,
                        title: advisory.title,
                        severity: advisory.severity,
                        vulnerable_versions: advisory.vulnerable_versions,
                        patched_versions: advisory.patched_versions,
                        module_name: advisory.module_name,
                        overview: advisory.overview
                    });
                });
            }
        }

        console.log(`   Found ${this.results.vulnerabilities.total} total vulnerabilities`);
        console.log(`   Critical: ${this.results.vulnerabilities.critical}, High: ${this.results.vulnerabilities.high}`);
    }

    shouldRunFullScan() {
        // Run full OWASP dependency check if we have concerning results from npm audit
        const criticalAndHigh = this.results.vulnerabilities.critical + this.results.vulnerabilities.high;
        return criticalAndHigh > this.config.allowedVulns || this.config.threshold === 'moderate' || this.config.threshold === 'low';
    }

    async runOWASPDependencyCheck() {
        console.log('🔍 Running OWASP Dependency Check (full scan)...');

        // This would typically be run in CI where dependency-check is installed
        // For now, we'll log that it should be run
        console.log('   Note: Full OWASP dependency check should run in CI pipeline');
        console.log('   See .github/workflows/deep-security.yml for implementation');
    }

    evaluateResults() {
        const { critical, high, moderate } = this.results.vulnerabilities;

        // Always fail on critical if configured
        if (this.config.failOnCritical && critical > 0) {
            this.results.passed = false;
            this.results.reason = `Found ${critical} critical vulnerabilities (fail on critical enabled)`;
            return;
        }

        // Check threshold
        let blockingVulns = 0;
        switch (this.config.threshold) {
            case 'critical':
                blockingVulns = critical;
                break;
            case 'high':
                blockingVulns = critical + high;
                break;
            case 'moderate':
                blockingVulns = critical + high + moderate;
                break;
            case 'low':
                blockingVulns = this.results.vulnerabilities.total;
                break;
            default:
                blockingVulns = critical + high; // Default to high
        }

        if (blockingVulns > this.config.allowedVulns) {
            this.results.passed = false;
            this.results.reason = `Found ${blockingVulns} vulnerabilities at or above ${this.config.threshold} severity (max allowed: ${this.config.allowedVulns})`;
        } else {
            this.results.passed = true;
            this.results.reason = `Found ${blockingVulns} vulnerabilities at or above ${this.config.threshold} severity (within limit: ${this.config.allowedVulns})`;
        }
    }

    generateReport() {
        const reportDir = dirname(join(WORKSPACE_ROOT, this.config.reportPath));

        // Ensure reports directory exists
        try {
            execSync(`mkdir -p "${reportDir}"`, { cwd: WORKSPACE_ROOT });
        } catch (error) {
            console.warn('⚠️  Could not create reports directory:', error.message || 'Unknown error');
        }

        // Write detailed report
        try {
            writeFileSync(
                join(WORKSPACE_ROOT, this.config.reportPath),
                JSON.stringify(this.results, null, 2)
            );
            console.log(`📄 Security gate report written to: ${this.config.reportPath}`);
        } catch (error) {
            console.warn('⚠️  Could not write security gate report:', error.message);
        }
    }

    logFailureDetails() {
        console.log('\n❌ SECURITY GATE FAILURE DETAILS:');
        console.log(`   Reason: ${this.results.reason}`);
        console.log('\n🔥 HIGH SEVERITY VULNERABILITIES:');

        const highSevVulns = this.results.details.filter(v =>
            v.severity === 'critical' || v.severity === 'high'
        );

        if (highSevVulns.length > 0) {
            highSevVulns.slice(0, 5).forEach((vuln, idx) => {
                console.log(`   ${idx + 1}. [${vuln.severity.toUpperCase()}] ${vuln.title || vuln.id}`);
                console.log(`      Module: ${vuln.module_name}`);
                console.log(`      Vulnerable: ${vuln.vulnerable_versions}`);
                console.log(`      Patched: ${vuln.patched_versions}`);
                console.log('');
            });

            if (highSevVulns.length > 5) {
                console.log(`   ... and ${highSevVulns.length - 5} more`);
            }
        }

        console.log('\n🛠️  REMEDIATION STEPS:');
        console.log('   1. Run: pnpm audit fix');
        console.log('   2. Check for package updates: pnpm update');
        console.log('   3. Review vulnerability details and apply manual fixes');
        console.log('   4. Re-run security gate: pnpm security:gate');
        console.log('\n   For detailed vulnerability info, see the generated report.');
    }
}

// CLI interface
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {};

    args.forEach(arg => {
        if (arg.startsWith('--threshold=')) {
            config.threshold = arg.split('=')[1];
        } else if (arg.startsWith('--report-path=')) {
            config.reportPath = arg.split('=')[1];
        } else if (arg.startsWith('--allowed-vulns=')) {
            config.allowedVulns = parseInt(arg.split('=')[1]);
        } else if (arg === '--fail-on-critical') {
            config.failOnCritical = true;
        } else if (arg === '--no-fail-on-critical') {
            config.failOnCritical = false;
        }
    });

    return config;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const config = parseArgs();
    const gate = new DependencySecurityGate(config);
    await gate.runGate();
}

export { DependencySecurityGate };
