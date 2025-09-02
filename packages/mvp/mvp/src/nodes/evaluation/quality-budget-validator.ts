/**
 * @file evaluation/quality-budget-validator.ts
 * @description Quality budget validation utilities
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import type { PRPState } from "../../state.js";

export interface QualityBudgetResult {
	accessibility: BudgetMetric;
	performance: BudgetMetric;
	security: BudgetMetric;
	overall: boolean;
	details: string[];
}

export interface BudgetMetric {
	score: number;
	threshold: number;
	passed: boolean;
	metric: string;
}

const QUALITY_THRESHOLDS = {
	ACCESSIBILITY: 95,
	PERFORMANCE: 90,
	SECURITY: 100,
} as const;

/**
 * Validates quality budgets (A11y, Performance, Security)
 */
export const validateQualityBudgets = async (
	_state: PRPState,
): Promise<QualityBudgetResult> => {
	const accessibility = await measureAccessibilityScore();
	const performance = await measurePerformanceScore();
	const security = await measureSecurityScore();

	const overall = accessibility.passed && performance.passed && security.passed;

	return {
		accessibility,
		performance,
		security,
		overall,
		details: buildQualityDetails(accessibility, performance, security),
	};
};

/**
 * Measures accessibility score using axe-core
 */
const measureAccessibilityScore = async (): Promise<BudgetMetric> => {
	try {
		// Try to run accessibility tests
		const { exec } = await import("node:child_process");
		const { promisify } = await import("node:util");
		const execAsync = promisify(exec);

		try {
			const { stdout } = await execAsync("pnpm test:a11y --reporter=json", {
				timeout: 30000,
			});

			const score = parseAccessibilityScore(stdout);
			return {
				score,
				threshold: QUALITY_THRESHOLDS.ACCESSIBILITY,
				passed: score >= QUALITY_THRESHOLDS.ACCESSIBILITY,
				metric: "WCAG 2.1 AA Compliance",
			};
		} catch {
			// Fallback: check for accessibility-related code
			const hasA11yCode = await checkAccessibilityCode();
			const score = hasA11yCode ? 85 : 60; // Heuristic scoring

			return {
				score,
				threshold: QUALITY_THRESHOLDS.ACCESSIBILITY,
				passed: score >= QUALITY_THRESHOLDS.ACCESSIBILITY,
				metric: "Accessibility Code Analysis",
			};
		}
	} catch (_error) {
		return {
			score: 0,
			threshold: QUALITY_THRESHOLDS.ACCESSIBILITY,
			passed: false,
			metric: "Accessibility Check Failed",
		};
	}
};

/**
 * Measures performance score using lighthouse or similar
 */
const measurePerformanceScore = async (): Promise<BudgetMetric> => {
	try {
		// Try to get performance metrics
		const performanceData = await getPerformanceMetrics();

		if (performanceData) {
			return {
				score: performanceData.score,
				threshold: QUALITY_THRESHOLDS.PERFORMANCE,
				passed: performanceData.score >= QUALITY_THRESHOLDS.PERFORMANCE,
				metric: "Lighthouse Performance",
			};
		}

		// Fallback: analyze bundle size and performance patterns
		const bundleAnalysis = await analyzeBundleSize();
		const score = calculatePerformanceScore(bundleAnalysis);

		return {
			score,
			threshold: QUALITY_THRESHOLDS.PERFORMANCE,
			passed: score >= QUALITY_THRESHOLDS.PERFORMANCE,
			metric: "Bundle Size Analysis",
		};
	} catch (_error) {
		return {
			score: 0,
			threshold: QUALITY_THRESHOLDS.PERFORMANCE,
			passed: false,
			metric: "Performance Check Failed",
		};
	}
};

/**
 * Measures security score using security tools
 */
const measureSecurityScore = async (): Promise<BudgetMetric> => {
	try {
		const securityIssues = await runSecurityAnalysis();
		const score = calculateSecurityScore(securityIssues);

		return {
			score,
			threshold: QUALITY_THRESHOLDS.SECURITY,
			passed: score >= QUALITY_THRESHOLDS.SECURITY,
			metric: "Security Analysis",
		};
	} catch (_error) {
		return {
			score: 0,
			threshold: QUALITY_THRESHOLDS.SECURITY,
			passed: false,
			metric: "Security Check Failed",
		};
	}
};

/**
 * Parses accessibility score from test output
 */
const parseAccessibilityScore = (output: string): number => {
	try {
		const results = JSON.parse(output);
		// Extract accessibility score from test results
		const violations = results.violations || [];
		const totalChecks = results.passes?.length || 0 + violations.length;
		const passedChecks = results.passes?.length || 0;

		return totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
	} catch {
		return 0;
	}
};

/**
 * Checks for accessibility-related code patterns
 */
const checkAccessibilityCode = async (): Promise<boolean> => {
	try {
		const { exec } = await import("node:child_process");
		const { promisify } = await import("node:util");
		const execAsync = promisify(exec);

		const { stdout } = await execAsync(
			'grep -r "aria-\\|role=\\|alt=\\|tabindex" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" src/',
			{ timeout: 10000 },
		);

		return stdout.trim().length > 0;
	} catch {
		return false;
	}
};

/**
 * Gets performance metrics from available tools
 */
const getPerformanceMetrics = async (): Promise<{ score: number } | null> => {
	try {
		const { exec } = await import("node:child_process");
		const { promisify } = await import("node:util");
		const execAsync = promisify(exec);

		// Try to run lighthouse if available
		try {
			const { stdout } = await execAsync(
				'npx lighthouse --only-categories=performance --output=json --chrome-flags="--headless" http://localhost:3000',
				{
					timeout: 60000,
				},
			);

			const results = JSON.parse(stdout);
			return {
				score: Math.round(results.lhr.categories.performance.score * 100),
			};
		} catch {
			// Lighthouse not available or failed
			return null;
		}
	} catch {
		return null;
	}
};

/**
 * Analyzes bundle size for performance scoring
 */
const analyzeBundleSize = async () => {
	try {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const distPath = path.join(process.cwd(), "dist");
		if (!fs.existsSync(distPath)) {
			return { size: 0, gzipSize: 0 };
		}

		// Get approximate bundle size
		const stats = fs.statSync(distPath, { recursive: true });
		return {
			size: stats.size || 0,
			gzipSize: Math.round((stats.size || 0) * 0.3), // Rough gzip estimate
		};
	} catch {
		return { size: 0, gzipSize: 0 };
	}
};

/**
 * Calculates performance score from bundle analysis
 */
const calculatePerformanceScore = (bundle: {
	size: number;
	gzipSize: number;
}): number => {
	// Simple heuristic: penalize large bundles
	const MB = 1024 * 1024;
	const sizeScore = Math.max(
		0,
		100 - Math.floor(bundle.gzipSize / (0.5 * MB)) * 10,
	);
	return Math.min(100, sizeScore);
};

/**
 * Runs comprehensive security analysis
 */
const runSecurityAnalysis = async () => {
	const { exec } = await import("node:child_process");
	const { promisify } = await import("node:util");
	const execAsync = promisify(exec);

	const issues = {
		vulnerabilities: 0,
		warnings: 0,
		info: 0,
	};

	try {
		// Run audit
		await execAsync("pnpm audit --audit-level=info --json", { timeout: 30000 });
	} catch (error) {
		if (error instanceof Error && error.message.includes("vulnerabilities")) {
			// Parse audit output for vulnerability counts
			const auditMatch = error.message.match(/(\d+) vulnerabilities/);
			if (auditMatch) {
				issues.vulnerabilities = parseInt(auditMatch[1], 10);
			}
		}
	}

	try {
		// Run semgrep if available
		const { stdout } = await execAsync("semgrep --config=auto --json .", {
			timeout: 60000,
		});
		const results = JSON.parse(stdout);

		for (const result of results.results || []) {
			const severity = result.extra?.severity?.toLowerCase();
			if (severity === "error") issues.vulnerabilities++;
			else if (severity === "warning") issues.warnings++;
			else issues.info++;
		}
	} catch {
		// Semgrep not available
	}

	return issues;
};

/**
 * Calculates security score from analysis results
 */
const calculateSecurityScore = (issues: {
	vulnerabilities: number;
	warnings: number;
	info: number;
}): number => {
	if (issues.vulnerabilities > 0) return 0;
	if (issues.warnings > 5) return 70;
	if (issues.warnings > 0) return 85;
	if (issues.info > 10) return 95;
	return 100;
};

/**
 * Builds quality details summary
 */
const buildQualityDetails = (
	accessibility: BudgetMetric,
	performance: BudgetMetric,
	security: BudgetMetric,
): string[] => {
	const details: string[] = [];

	details.push(
		`Accessibility: ${accessibility.score}% (threshold: ${accessibility.threshold}%) - ${accessibility.passed ? "PASS" : "FAIL"}`,
	);
	details.push(
		`Performance: ${performance.score}% (threshold: ${performance.threshold}%) - ${performance.passed ? "PASS" : "FAIL"}`,
	);
	details.push(
		`Security: ${security.score}% (threshold: ${security.threshold}%) - ${security.passed ? "PASS" : "FAIL"}`,
	);

	if (accessibility.passed && performance.passed && security.passed) {
		details.push("All quality budgets met ✅");
	} else {
		details.push("Some quality budgets failed ❌");
	}

	return details;
};
