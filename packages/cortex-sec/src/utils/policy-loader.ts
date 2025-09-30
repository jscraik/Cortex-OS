/**
 * Policy Loader Utilities
 * @description Loads security policies from .semgrep/policies/ directory
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

export const SecurityStandardSchema = z.enum([
	'owasp-top10-2025',
	'cwe-top-25',
	'nist-ai-rmf',
	'iso27001',
]);

export type SecurityStandard = z.infer<typeof SecurityStandardSchema>;

export interface PolicyThresholds {
	maxRiskScore: number;
	maxOutstandingViolations: number;
	scanCadenceHours: number;
	escalationThreshold: number;
}

export interface SecurityPolicyConfig {
	name: string;
	standard: SecurityStandard;
	version: string;
	description: string;
	thresholds: PolicyThresholds;
	tools: string[];
	remediation: {
		windowHours: number;
		autoEscalate: boolean;
		blockMergeOnCritical: boolean;
	};
	rulesetMapping: Record<string, string[]>;
	riskWeights: Record<string, number>;
	exemptions: Array<{
		patterns: string[];
		reason: string;
	}>;
}

const PolicyConfigSchema = z.object({
	policy: z.object({
		name: z.string(),
		standard: z.string(),
		version: z.string(),
		description: z.string(),
	}),
	thresholds: z.object({
		max_risk_score: z.number(),
		max_outstanding_violations: z.number(),
		scan_cadence_hours: z.number(),
		escalation_threshold: z.number(),
	}),
	tools: z.array(z.string()),
	remediation: z.object({
		window_hours: z.number(),
		auto_escalate: z.boolean(),
		block_merge_on_critical: z.boolean(),
	}),
	ruleset_mapping: z.record(z.array(z.string())),
	risk_weights: z.record(z.number()),
	exemptions: z.array(
		z.object({
			patterns: z.array(z.string()),
			reason: z.string(),
		}),
	),
});

/**
 * Load security policies from .semgrep/policies/ directory
 */
export async function loadSecurityPolicies(
	policyPath: string = '.semgrep/policies/',
): Promise<Map<SecurityStandard, SecurityPolicyConfig>> {
	const policies = new Map<SecurityStandard, SecurityPolicyConfig>();

	try {
		const files = await readdir(policyPath);
		const policyFiles = files.filter((file) => file.endsWith('-policies.yaml'));

		for (const file of policyFiles) {
			const content = await readFile(join(policyPath, file), 'utf-8');
			const parsed = YAML.parse(content);

			const validated = PolicyConfigSchema.parse(parsed);
			const standard = SecurityStandardSchema.parse(validated.policy.standard);

			policies.set(standard, {
				name: validated.policy.name,
				standard,
				version: validated.policy.version,
				description: validated.policy.description,
				thresholds: {
					maxRiskScore: validated.thresholds.max_risk_score,
					maxOutstandingViolations: validated.thresholds.max_outstanding_violations,
					scanCadenceHours: validated.thresholds.scan_cadence_hours,
					escalationThreshold: validated.thresholds.escalation_threshold,
				},
				tools: validated.tools,
				remediation: {
					windowHours: validated.remediation.window_hours,
					autoEscalate: validated.remediation.auto_escalate,
					blockMergeOnCritical: validated.remediation.block_merge_on_critical,
				},
				rulesetMapping: validated.ruleset_mapping,
				riskWeights: validated.risk_weights,
				exemptions: validated.exemptions,
			});
		}
	} catch (error) {
		console.error('Failed to load security policies:', error);
		throw new Error(`Policy loading failed: ${error}`);
	}

	return policies;
}

/**
 * Get policy thresholds for a specific security standard
 */
export async function getPolicyThresholds(
	standard: SecurityStandard,
	policyPath: string = '.semgrep/policies/',
): Promise<PolicyThresholds> {
	const policies = await loadSecurityPolicies(policyPath);
	const policy = policies.get(standard);

	if (!policy) {
		throw new Error(`No policy found for standard: ${standard}`);
	}

	return policy.thresholds;
}

/**
 * Compute aggregate risk across multiple security standards
 */
export interface RiskSignal {
	standard: SecurityStandard;
	riskScore: number;
	outstandingViolations: number;
	lastScanAt?: Date;
}

export interface AggregateRiskResult {
	aggregateRisk: number;
	highestRiskStandard: SecurityStandard | null;
	standardScores: Map<SecurityStandard, number>;
	complianceStatus: Record<SecurityStandard, 'compliant' | 'non-compliant' | 'warning'>;
}

export async function computeAggregateRisk(
	signals: RiskSignal[],
	policyPath: string = '.semgrep/policies/',
): Promise<AggregateRiskResult> {
	const policies = await loadSecurityPolicies(policyPath);
	const standardScores = new Map<SecurityStandard, number>();
	const complianceStatus: Record<SecurityStandard, 'compliant' | 'non-compliant' | 'warning'> =
		{} as any;

	let aggregateRisk = 0;
	let highestRiskStandard: SecurityStandard | null = null;
	let highestRiskValue = -Infinity;

	for (const signal of signals) {
		const policy = policies.get(signal.standard);
		if (!policy) {
			throw new Error(`No policy found for standard: ${signal.standard}`);
		}

		const threshold = policy.thresholds;

		// Compute composite risk score
		const riskComponent = Math.min(Math.max(signal.riskScore, 0), 1);
		const violationComponent = Math.min(
			signal.outstandingViolations / Math.max(1, threshold.maxOutstandingViolations),
			1,
		);

		// Add cadence penalty
		let cadencePenalty = 0;
		if (signal.lastScanAt) {
			const elapsedHours = (Date.now() - signal.lastScanAt.getTime()) / (1000 * 60 * 60);
			if (elapsedHours > threshold.scanCadenceHours) {
				cadencePenalty = Math.min(
					1,
					(elapsedHours - threshold.scanCadenceHours) / threshold.scanCadenceHours,
				);
			}
		} else {
			cadencePenalty = 0.5; // No scan yet
		}

		const compositeRisk = riskComponent * 0.6 + violationComponent * 0.3 + cadencePenalty * 0.1;

		standardScores.set(signal.standard, compositeRisk);

		// Determine compliance status
		if (compositeRisk > threshold.escalationThreshold) {
			complianceStatus[signal.standard] = 'non-compliant';
		} else if (compositeRisk > threshold.maxRiskScore) {
			complianceStatus[signal.standard] = 'warning';
		} else {
			complianceStatus[signal.standard] = 'compliant';
		}

		aggregateRisk += compositeRisk;

		if (compositeRisk > highestRiskValue) {
			highestRiskValue = compositeRisk;
			highestRiskStandard = signal.standard;
		}
	}

	const normalizedRisk = signals.length > 0 ? aggregateRisk / signals.length : 0;

	return {
		aggregateRisk: Math.min(1, normalizedRisk),
		highestRiskStandard,
		standardScores,
		complianceStatus,
	};
}

// YAML parser fallback (simple implementation for basic YAML)
const YAML = {
	parse(content: string): any {
		// Simple YAML parser for policy files
		// In production, use js-yaml or similar
		const lines = content.split('\n');
		const result: any = {
			policy: {},
			thresholds: {},
			remediation: {},
			ruleset_mapping: {},
			risk_weights: {},
		};
		let currentSection: string | null = null;
		let currentKey: string | null = null;

		for (const line of lines) {
			const trimmed = line.trim();

			if (trimmed.startsWith('#') || !trimmed) continue;

			if (trimmed.endsWith(':')) {
				currentSection = trimmed.slice(0, -1);
				currentKey = null;
				if (!result[currentSection]) {
					result[currentSection] = {};
				}
				continue;
			}

			if (trimmed.includes(':')) {
				const [key, ...valueParts] = trimmed.split(':');
				const value = valueParts.join(':').trim();

				// Convert YAML to JS values
				let parsedValue: any = value;

				if (value === 'true') parsedValue = true;
				else if (value === 'false') parsedValue = false;
				else if (value === 'null') parsedValue = null;
				else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10);
				else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value);
				else if (value.startsWith('"') && value.endsWith('"')) parsedValue = value.slice(1, -1);
				else if (value.startsWith("'") && value.endsWith("'")) parsedValue = value.slice(1, -1);
				else if (value.startsWith('[') && value.endsWith(']')) {
					parsedValue = value
						.slice(1, -1)
						.split(',')
						.map((v: string) => v.trim().replace(/['"]/g, ''));
				}

				if (currentSection && currentKey === null) {
					result[currentSection][key.trim()] = parsedValue;
					currentKey = key.trim();
				} else if (currentKey) {
					if (!result[currentSection][currentKey]) {
						result[currentSection][currentKey] = {};
					}
					result[currentSection][currentKey][key.trim()] = parsedValue;
				}
			}
		}

		return result;
	},
};
