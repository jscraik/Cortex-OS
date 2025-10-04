/**
 * brAInwav Quality Gate Enforcer
 * Enforces production-ready quality standards for Cortex-OS
 * Following CODESTYLE.md: functional-first, ≤40 lines per function, named exports
 */

import { existsSync, readFileSync } from 'fs';
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
