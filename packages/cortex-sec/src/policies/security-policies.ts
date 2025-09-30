import { z } from 'zod';

export const SecurityStandardSchema = z.enum(['owasp-top10', 'cwe-25', 'nist', 'iso27001']);
export type SecurityStandard = z.infer<typeof SecurityStandardSchema>;

export interface SecurityPolicyThresholds {
	maxRiskScore: number;
	maxOutstandingViolations: number;
	scanCadenceHours: number;
	escalationThreshold: number;
}

export interface SecurityPolicy {
	standard: SecurityStandard;
	thresholds: SecurityPolicyThresholds;
	defaultTools: string[];
	remediationWindowHours: number;
}

const DEFAULT_THRESHOLDS: Record<SecurityStandard, SecurityPolicyThresholds> = {
	'owasp-top10': {
		maxRiskScore: 0.35,
		maxOutstandingViolations: 0,
		scanCadenceHours: 6,
		escalationThreshold: 0.55,
	},
	'cwe-25': {
		maxRiskScore: 0.4,
		maxOutstandingViolations: 1,
		scanCadenceHours: 12,
		escalationThreshold: 0.6,
	},
	nist: {
		maxRiskScore: 0.45,
		maxOutstandingViolations: 1,
		scanCadenceHours: 24,
		escalationThreshold: 0.65,
	},
	iso27001: {
		maxRiskScore: 0.4,
		maxOutstandingViolations: 0,
		scanCadenceHours: 24,
		escalationThreshold: 0.6,
	},
};

const DEFAULT_TOOLS: Record<SecurityStandard, string[]> = {
	'owasp-top10': ['security.run_semgrep_scan', 'security.analyze_vulnerabilities'],
	'cwe-25': ['security.run_semgrep_scan', 'security.validate_compliance'],
	nist: ['security.check_dependencies', 'security.validate_compliance'],
	iso27001: ['security.check_dependencies', 'security.get_security_policy'],
};

const DEFAULT_REMEDIATION_WINDOW: Record<SecurityStandard, number> = {
	'owasp-top10': 4,
	'cwe-25': 8,
	nist: 24,
	iso27001: 24,
};

export function getDefaultSecurityPolicies(): SecurityPolicy[] {
	return SecurityStandardSchema.options.map((standard) => ({
		standard,
		thresholds: DEFAULT_THRESHOLDS[standard],
		defaultTools: DEFAULT_TOOLS[standard],
		remediationWindowHours: DEFAULT_REMEDIATION_WINDOW[standard],
	}));
}

export function getSecurityPolicy(standard: SecurityStandard): SecurityPolicy {
	return {
		standard,
		thresholds: DEFAULT_THRESHOLDS[standard],
		defaultTools: DEFAULT_TOOLS[standard],
		remediationWindowHours: DEFAULT_REMEDIATION_WINDOW[standard],
	};
}

export interface ComplianceSignal {
	standard: SecurityStandard;
	lastScanAt?: Date | null;
	outstandingViolations?: number;
	riskScore?: number;
}

export interface RiskComputationInput {
	signals: ComplianceSignal[];
}

export interface RiskComputationResult {
	aggregateRisk: number;
	highestRiskStandard: SecurityStandard | null;
	signals: Array<ComplianceSignal & { policy: SecurityPolicy }>;
}

export function computeAggregateRisk(input: RiskComputationInput): RiskComputationResult {
	const policies = getDefaultSecurityPolicies();
	let aggregateRisk = 0;
	let highestRiskStandard: SecurityStandard | null = null;
	let highestRiskValue = -Infinity;

	const enrichedSignals = input.signals.map((signal) => {
		const policy = policies.find((candidate) => candidate.standard === signal.standard);
		if (!policy) {
			return { ...signal, policy: getSecurityPolicy(signal.standard) };
		}
		return { ...signal, policy };
	});

	for (const signal of enrichedSignals) {
		const policy = signal.policy;
		const riskScore = Math.min(Math.max(signal.riskScore ?? 0, 0), 1);
		const violationRatio =
			(signal.outstandingViolations ?? 0) /
			Math.max(1, policy.thresholds.maxOutstandingViolations || 1);
		const cadencePenalty = computeCadencePenalty(
			signal.lastScanAt,
			policy.thresholds.scanCadenceHours,
		);
		const compositeRisk = riskScore * 0.6 + violationRatio * 0.3 + cadencePenalty * 0.1;

		aggregateRisk += compositeRisk;

		if (compositeRisk > highestRiskValue) {
			highestRiskValue = compositeRisk;
			highestRiskStandard = signal.standard;
		}
	}

	const normalizedRisk = enrichedSignals.length > 0 ? aggregateRisk / enrichedSignals.length : 0;

	return {
		aggregateRisk: Math.min(1, normalizedRisk),
		highestRiskStandard,
		signals: enrichedSignals,
	};
}

function computeCadencePenalty(lastScanAt: Date | null | undefined, cadenceHours: number): number {
	if (!lastScanAt) {
		return 0.5;
	}

	const elapsedHours = Math.abs(Date.now() - lastScanAt.getTime()) / (1000 * 60 * 60);
	if (elapsedHours <= cadenceHours) {
		return 0;
	}

	if (elapsedHours >= cadenceHours * 4) {
		return 1;
	}

	return Math.min(1, (elapsedHours - cadenceHours) / (cadenceHours * 3));
}
