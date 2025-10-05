#!/usr/bin/env node
/**
 * Test Suite Monitor - Tracks test suite status for dependency upgrade readiness
 *
 * This script monitors the live test suite and determines when it's safe to begin
 * major dependency upgrade work. It tracks test results, failure patterns, and
 * establishes green baseline criteria.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const REPORTS_DIR = './reports';
const STATUS_FILE = join(REPORTS_DIR, 'test-suite-status.json');
const HISTORY_FILE = join(REPORTS_DIR, 'test-suite-history.jsonl');

class TestSuiteMonitor {
    ensureReportsDir() {
        if (!existsSync(REPORTS_DIR)) {
            mkdirSync(REPORTS_DIR, { recursive: true });
        }
    }

    runTests() {
        console.log('🔍 Running live test suite...');

        const startTime = Date.now();
        let output = '';
        const errors = [];

        try {
            // Run the live test suite (excluding RED tests)
            output = execSync('pnpm vitest run --testNamePattern="^(?!\\\\[RED\\\\])" --reporter=json', {
                encoding: 'utf8',
                timeout: 300000, // 5 minute timeout
                stdio: ['pipe', 'pipe', 'pipe'],
            });
        } catch (error) {
            // Vitest returns non-zero exit code when tests fail, but we still get JSON output
            output = error.stdout || '';
            if (error.stderr) {
                errors.push(error.stderr);
            }
        }

        const duration = Date.now() - startTime;

        // Parse vitest JSON output
        const testResults = { passed: 0, failed: 0, skipped: 0, total: 0 };
        let failurePatterns = [];

        try {
            const jsonOutput = JSON.parse(output);
            if (jsonOutput.testResults) {
                testResults.passed = jsonOutput.numPassedTests || 0;
                testResults.failed = jsonOutput.numFailedTests || 0;
                testResults.skipped = jsonOutput.numPendingTests || 0;
                testResults.total = jsonOutput.numTotalTests || 0;

                // Extract failure patterns
                if (jsonOutput.testResults) {
                    failurePatterns = jsonOutput.testResults
                        .filter((test) => test.status === 'failed')
                        .map((test) => test.ancestorTitles?.join(' > ') || test.title)
                        .slice(0, 10); // Limit to top 10 failure patterns
                }
            }
        } catch (parseError) {
            // Fallback parsing for different output formats
            console.warn('⚠️  Could not parse JSON output, using fallback parsing');

            const lines = output.split('\n');
            for (const line of lines) {
                if (line.includes('Test Files') && line.includes('passed')) {
                    const match = line.match(/(\d+)\s+failed.*?(\d+)\s+passed.*?\((\d+)\)/);
                    if (match) {
                        testResults.failed = parseInt(match[1]) || 0;
                        testResults.passed = parseInt(match[2]) || 0;
                        testResults.total = parseInt(match[3]) || 0;
                    }
                }
                if (line.includes('Tests') && line.includes('passed')) {
                    const match = line.match(/(\d+)\s+failed.*?(\d+)\s+passed.*?\((\d+)\)/);
                    if (match) {
                        testResults.failed = parseInt(match[1]) || 0;
                        testResults.passed = parseInt(match[2]) || 0;
                        testResults.total = parseInt(match[3]) || 0;
                    }
                }
            }
        }

        const passRate = testResults.total > 0 ? (testResults.passed / testResults.total) * 100 : 0;

        let status = 'red';
        if (passRate >= 95) status = 'green';
        else if (passRate >= 85) status = 'yellow';

        return {
            timestamp: new Date().toISOString(),
            passed: testResults.passed,
            failed: testResults.failed,
            skipped: testResults.skipped,
            total: testResults.total,
            duration,
            passRate,
            status,
            failurePatterns,
            errors,
        };
    }

    getRecentHistory(days = 7) {
        if (!existsSync(HISTORY_FILE)) {
            return [];
        }

        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const lines = readFileSync(HISTORY_FILE, 'utf8').trim().split('\n');

        return lines
            .filter((line) => line.trim())
            .map((line) => JSON.parse(line))
            .filter((result) => new Date(result.timestamp) > cutoff);
    }

    assessUpgradeReadiness(current, history) {
        // Criteria for upgrade readiness
        const PASS_RATE_THRESHOLD = 90; // 90% pass rate required
        const STABILITY_THRESHOLD = 3; // At least 3 consecutive good runs
        const KNOWN_ISSUES_THRESHOLD = 5; // Max 5 known failing tests

        // Check pass rate
        const passRateMet = current.passRate >= PASS_RATE_THRESHOLD;

        // Check stability (recent runs should be consistent)
        const recentRuns = history.slice(-5);
        const stableRuns = recentRuns.filter((run) => run.passRate >= PASS_RATE_THRESHOLD).length;
        const stabilityMet = stableRuns >= STABILITY_THRESHOLD;

        // Check known issues (failing tests that are consistently failing)
        const knownIssuesMet = current.failed <= KNOWN_ISSUES_THRESHOLD;

        const isReady = passRateMet && stabilityMet && knownIssuesMet;

        // Identify blockers
        const blockers = [];
        if (!passRateMet) {
            blockers.push(
                `Pass rate ${current.passRate.toFixed(1)}% below threshold ${PASS_RATE_THRESHOLD}%`,
            );
        }
        if (!stabilityMet) {
            blockers.push(`Only ${stableRuns}/${STABILITY_THRESHOLD} recent runs were stable`);
        }
        if (!knownIssuesMet) {
            blockers.push(
                `${current.failed} failing tests exceed threshold of ${KNOWN_ISSUES_THRESHOLD}`,
            );
        }

        // Generate recommendation
        let recommendation = '';
        if (isReady) {
            recommendation = '✅ Test suite is stable and ready for dependency upgrades';
        } else if (current.passRate >= 80) {
            recommendation = '⚠️ Test suite needs stabilization before dependency upgrades';
        } else {
            recommendation = '❌ Test suite requires significant fixes before dependency upgrades';
        }

        return {
            isReady,
            criteria: {
                passRate: { value: current.passRate, threshold: PASS_RATE_THRESHOLD, met: passRateMet },
                stability: { value: stableRuns, threshold: STABILITY_THRESHOLD, met: stabilityMet },
                knownIssues: {
                    value: current.failed,
                    threshold: KNOWN_ISSUES_THRESHOLD,
                    met: knownIssuesMet,
                },
            },
            blockers,
            recommendation,
        };
    }

    saveResults(result, readiness) {
        // Save current status
        const status = {
            lastUpdate: result.timestamp,
            current: result,
            upgradeReadiness: readiness,
            nextCheck: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Next hour
        };

        writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));

        // Append to history
        writeFileSync(HISTORY_FILE, JSON.stringify(result) + '\n', { flag: 'a' });

        console.log(`📊 Results saved to ${STATUS_FILE}`);
    }

    printReport(result, readiness) {
        console.log('\n' + '='.repeat(60));
        console.log('📋 TEST SUITE STATUS REPORT');
        console.log('='.repeat(60));

        console.log(`\n📈 Current Status: ${result.status.toUpperCase()}`);
        console.log(`   Passed: ${result.passed}`);
        console.log(`   Failed: ${result.failed}`);
        console.log(`   Skipped: ${result.skipped}`);
        console.log(`   Total: ${result.total}`);
        console.log(`   Pass Rate: ${result.passRate.toFixed(1)}%`);
        console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);

        if (result.failurePatterns.length > 0) {
            console.log(`\n❌ Top Failure Patterns:`);
            result.failurePatterns.forEach((pattern, i) => {
                console.log(`   ${i + 1}. ${pattern}`);
            });
        }

        console.log(
            `\n🎯 Dependency Upgrade Readiness: ${readiness.isReady ? '✅ READY' : '❌ NOT READY'}`,
        );
        console.log(`   ${readiness.recommendation}`);

        if (readiness.blockers.length > 0) {
            console.log(`\n🚫 Blockers:`);
            readiness.blockers.forEach((blocker) => {
                console.log(`   • ${blocker}`);
            });
        }

        console.log(`\n📋 Criteria:`);
        Object.entries(readiness.criteria).forEach(([key, criterion]) => {
            const status = criterion.met ? '✅' : '❌';
            console.log(`   ${status} ${key}: ${criterion.value} (threshold: ${criterion.threshold})`);
        });

        if (readiness.isReady) {
            console.log(`\n🚀 Next Steps:`);
            console.log(`   1. Begin Phase 1 of dependency upgrade schedule`);
            console.log(`   2. Review docs/dependency-upgrade-assessment.md`);
            console.log(`   3. Create feature branch for UUID 13.x upgrade`);
        } else {
            console.log(`\n🔧 Recommended Actions:`);
            console.log(`   1. Fix failing tests to improve pass rate`);
            console.log(`   2. Investigate failure patterns for root causes`);
            console.log(`   3. Re-run monitor when issues are resolved`);
        }

        console.log('\n' + '='.repeat(60));
    }

    async run() {
        console.log('🎯 Cortex-OS Test Suite Monitor');
        console.log('Evaluating readiness for major dependency upgrades...\n');

        this.ensureReportsDir();

        // Run tests and analyze results
        const result = this.runTests();
        const history = this.getRecentHistory();
        const readiness = this.assessUpgradeReadiness(result, history);

        // Save and report
        this.saveResults(result, readiness);
        this.printReport(result, readiness);

        // Exit with appropriate code
        process.exit(readiness.isReady ? 0 : 1);
    }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitor = new TestSuiteMonitor();
    monitor.run().catch((error) => {
        console.error('❌ Test suite monitor failed:', error);
        process.exit(1);
    });
}

export { TestSuiteMonitor };
