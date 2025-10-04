/**
 * brAInwav Quality Gate Enforcer
 * Enforces production-ready quality standards for Cortex-OS
 * Following CODESTYLE.md: functional-first, ≤40 lines per function, named exports
 */
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
export declare const loadQualityGateConfig: (configPath?: string) => QualityGateConfig;
export declare const validateCoverageThresholds: (
	metrics: QualityMetrics['coverage'],
	thresholds: QualityGateConfig['thresholds']['coverage'],
) => string[];
export declare const validateMutationScore: (
	metrics: QualityMetrics['mutation'],
	thresholds: QualityGateConfig['thresholds']['mutation'],
) => string[];
export declare const validateSecurityRequirements: (
	metrics: QualityMetrics['security'],
	thresholds: QualityGateConfig['thresholds']['security'],
) => string[];
export declare const calculateQualityScore: (metrics: QualityMetrics) => number;
export declare const runQualityGateEnforcement: (
	metrics: QualityMetrics,
	configPath?: string,
) => GateResult;
export declare const main: () => Promise<void>;
//# sourceMappingURL=quality-gate-enforcer.d.ts.map
