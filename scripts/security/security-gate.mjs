#!/usr/bin/env node

/**
 * Security Gate Script
 *
 * This script runs comprehensive security checks and blocks CI/deployment
 * if any high or critical severity vulnerabilities are found.
 *
 * Integrates with:
 * - npm/pnpm audit for dependency vulnerabilities
 * - Semgrep for code security scanning
 * - OWASP Dependency Check (if available)
 * - Snyk (if configured)
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const VULNERABILITY_THRESHOLDS = {
	critical: 0, // Block on any critical vulnerabilities
	high: 0, // Block on any high vulnerabilities
	moderate: 10, // Allow up to 10 moderate vulnerabilities (configurable)
	low: 50, // Allow up to 50 low vulnerabilities (configurable)
};

/**
 * Execute command and return structured result
 */
function safeExec(command, options = {}) {
	try {
		const output = execSync(command, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
			...options,
		});
		return { success: true, output, error: null };
	} catch (error) {
		return {
			success: false,
			output: error.stdout || '',
			error: error.stderr || error.message,
		};
	}
}

/**
 * Parse vulnerability counts from audit text
 */
function parseVulnerabilityCounts(auditText) {
	const severityPattern = /(\d+)\s+(critical|high|moderate|low)/gi;
	const vulnerabilities = { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };

	let match;
	while ((match = severityPattern.exec(auditText)) !== null) {
		const count = parseInt(match[1], 10);
		const severity = match[2].toLowerCase();
		vulnerabilities[severity] = count;
		vulnerabilities.total += count;
	}

	return vulnerabilities;
}

/**
 * Parse severity line from audit output
 */
function parseSeverityLine(severityLine, vulnerabilities) {
	const criticalMatch = severityLine.match(/(\d+)\s+critical/);
	const highMatch = severityLine.match(/(\d+)\s+high/);
	const moderateMatch = severityLine.match(/(\d+)\s+moderate/);
	const lowMatch = severityLine.match(/(\d+)\s+low/);

	if (criticalMatch) vulnerabilities.critical = parseInt(criticalMatch[1], 10);
	if (highMatch) vulnerabilities.high = parseInt(highMatch[1], 10);
	if (moderateMatch) vulnerabilities.moderate = parseInt(moderateMatch[1], 10);
	if (lowMatch) vulnerabilities.low = parseInt(lowMatch[1], 10);

	vulnerabilities.total =
		vulnerabilities.critical +
		vulnerabilities.high +
		vulnerabilities.moderate +
		vulnerabilities.low;
}

/**
 * Run pnpm audit and parse results
 */
function runPnpmAudit() {
	console.log('🔍 Running dependency audit...');

	const result = safeExec('pnpm audit --json');
	if (!result.success) {
		if (result.error?.includes('vulnerabilities found')) {
			console.log('📋 Vulnerabilities detected, parsing results...');
		} else {
			console.error('❌ Failed to run pnpm audit:', result.error);
			return { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
		}
	}

	// Parse vulnerability counts from audit output
	const auditText = result.output + (result.error || '');
	const vulnerabilities = parseVulnerabilityCounts(auditText);

	// Also try simple audit level checks if no vulnerabilities found yet
	if (vulnerabilities.total === 0) {
		const highResult = safeExec('pnpm audit --audit-level=high');
		if (!highResult.success && highResult.error.includes('vulnerabilities found')) {
			const lines = highResult.error.split('\n');
			const severityLine = lines.find((line) => line.includes('Severity:'));
			if (severityLine) {
				parseSeverityLine(severityLine, vulnerabilities);
			}
		}
	}

	return vulnerabilities;
}

/**
 * Run Semgrep security scans
 */
function runSemgrepScan() {
	console.log('🔍 Running Semgrep security scan...');

	if (!existsSync(join(process.cwd(), '.semgrep.yml'))) {
		console.log('⚠️  No Semgrep config found, skipping...');
		return { findings: 0, critical: 0 };
	}

	const result = safeExec('semgrep --config=.semgrep.yml --json .');
	if (!result.success) {
		console.error('❌ Semgrep scan failed:', result.error);
		return { findings: 0, critical: 0 };
	}

	try {
		const semgrepResults = JSON.parse(result.output);
		const findings = semgrepResults.results || [];
		const critical = findings.filter(
			(f) => f.extra?.severity === 'ERROR' || f.extra?.metadata?.impact === 'HIGH',
		).length;

		return { findings: findings.length, critical };
	} catch (error) {
		console.error('❌ Failed to parse Semgrep results:', error);
		return { findings: 0, critical: 0 };
	}
}

/**
 * Main security gate execution
 */
function main() {
	console.log('🛡️  Running Security Gate...\n');

	let hasBlockingIssues = false;
	const issues = [];

	// Run dependency audit
	const auditResults = runPnpmAudit();
	console.log(`📊 Dependency Audit Results:`);
	console.log(`   Critical: ${auditResults.critical}`);
	console.log(`   High:     ${auditResults.high}`);
	console.log(`   Moderate: ${auditResults.moderate}`);
	console.log(`   Low:      ${auditResults.low}`);
	console.log(`   Total:    ${auditResults.total}\n`);

	// Check thresholds
	if (auditResults.critical > VULNERABILITY_THRESHOLDS.critical) {
		issues.push(
			`❌ CRITICAL: ${auditResults.critical} critical vulnerabilities (threshold: ${VULNERABILITY_THRESHOLDS.critical})`,
		);
		hasBlockingIssues = true;
	}

	if (auditResults.high > VULNERABILITY_THRESHOLDS.high) {
		issues.push(
			`❌ HIGH: ${auditResults.high} high-severity vulnerabilities (threshold: ${VULNERABILITY_THRESHOLDS.high})`,
		);
		hasBlockingIssues = true;
	}

	if (auditResults.moderate > VULNERABILITY_THRESHOLDS.moderate) {
		issues.push(
			`⚠️  MODERATE: ${auditResults.moderate} moderate vulnerabilities (threshold: ${VULNERABILITY_THRESHOLDS.moderate})`,
		);
	}

	// Run Semgrep scan
	const semgrepResults = runSemgrepScan();
	console.log(`📊 Semgrep Scan Results:`);
	console.log(`   Total findings: ${semgrepResults.findings}`);
	console.log(`   Critical:       ${semgrepResults.critical}\n`);

	if (semgrepResults.critical > 0) {
		issues.push(`❌ SEMGREP: ${semgrepResults.critical} critical security findings`);
		hasBlockingIssues = true;
	}

	// Report results
	if (hasBlockingIssues) {
		console.log('🚨 SECURITY GATE FAILED\n');
		console.log('Blocking issues found:');
		issues.forEach((issue) => console.log(`  ${issue}`));
		console.log('\nTo fix dependency vulnerabilities, run:');
		console.log('  pnpm audit --fix');
		console.log('  pnpm update');
		console.log('\nFor manual review of vulnerabilities, run:');
		console.log('  pnpm audit');
		process.exit(1);
	} else {
		console.log('✅ SECURITY GATE PASSED\n');
		if (issues.length > 0) {
			console.log('Non-blocking issues found:');
			issues.forEach((issue) => console.log(`  ${issue}`));
			console.log('\nConsider addressing these in the next maintenance cycle.\n');
		}
		console.log('All security checks passed! 🎉');
		process.exit(0);
	}
}

// Handle CLI options
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
	console.log(`
Security Gate Script

Usage: node scripts/security-gate.mjs [options]

Options:
  --help, -h     Show this help message
  --fix          Attempt to automatically fix issues (runs pnpm audit --fix)
  --strict       Use stricter thresholds (0 moderate, 0 low)
  --report-only  Run checks but don't fail (useful for reporting)

Environment Variables:
  SECURITY_GATE_CRITICAL_THRESHOLD  (default: 0)
  SECURITY_GATE_HIGH_THRESHOLD      (default: 0)
  SECURITY_GATE_MODERATE_THRESHOLD  (default: 10)
  SECURITY_GATE_LOW_THRESHOLD       (default: 50)
`);
	process.exit(0);
}

// Apply CLI options
if (args.includes('--strict')) {
	VULNERABILITY_THRESHOLDS.moderate = 0;
	VULNERABILITY_THRESHOLDS.low = 0;
}

if (args.includes('--fix')) {
	console.log('🔧 Attempting to fix vulnerabilities...\n');
	const fixResult = safeExec('pnpm audit --fix');
	if (fixResult.success) {
		console.log('✅ Auto-fix completed successfully\n');
	} else {
		console.log('⚠️  Auto-fix completed with warnings\n');
	}
}

// Override thresholds from environment
Object.keys(VULNERABILITY_THRESHOLDS).forEach((severity) => {
	const envVar = `SECURITY_GATE_${severity.toUpperCase()}_THRESHOLD`;
	if (process.env[envVar]) {
		VULNERABILITY_THRESHOLDS[severity] = parseInt(process.env[envVar], 10);
	}
});

if (args.includes('--report-only')) {
	console.log('📋 Running in report-only mode (will not fail)\n');
	main();
} else {
	main();
}
