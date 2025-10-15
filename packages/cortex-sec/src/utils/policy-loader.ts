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
const SECURITY_STANDARDS: readonly SecurityStandard[] = SecurityStandardSchema.options;

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
				exemptions: validated.exemptions as Array<{ patterns: string[]; reason: string }>,
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
	complianceStatus: Record<SecurityStandard, ComplianceState>;
}

type ComplianceState = 'compliant' | 'non-compliant' | 'warning';

function createInitialComplianceStatus(): Record<SecurityStandard, ComplianceState> {
	return SECURITY_STANDARDS.reduce<Record<SecurityStandard, ComplianceState>>(
		(status, standard) => {
			status[standard] = 'compliant';
			return status;
		},
		{} as Record<SecurityStandard, ComplianceState>,
	);
}

function calculateCadencePenalty(
	lastScanAt: Date | undefined,
	threshold: PolicyThresholds,
): number {
	if (!lastScanAt) {
		return 0.5;
	}

	const elapsedHours = (Date.now() - lastScanAt.getTime()) / (1000 * 60 * 60);
	if (elapsedHours <= threshold.scanCadenceHours) {
		return 0;
	}

	return Math.min(1, (elapsedHours - threshold.scanCadenceHours) / threshold.scanCadenceHours);
}

function determineComplianceStatus(risk: number, threshold: PolicyThresholds): ComplianceState {
	if (risk > threshold.escalationThreshold) {
		return 'non-compliant';
	}
	if (risk > threshold.maxRiskScore) {
		return 'warning';
	}
	return 'compliant';
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}

function calculateCompositeRisk(signal: RiskSignal, threshold: PolicyThresholds): number {
	const riskComponent = clamp(signal.riskScore, 0, 1);
	const violationComponent = Math.min(
		signal.outstandingViolations / Math.max(1, threshold.maxOutstandingViolations),
		1,
	);
	const cadencePenalty = calculateCadencePenalty(signal.lastScanAt, threshold);

	return riskComponent * 0.6 + violationComponent * 0.3 + cadencePenalty * 0.1;
}

export async function computeAggregateRisk(
	signals: RiskSignal[],
	policyPath: string = '.semgrep/policies/',
): Promise<AggregateRiskResult> {
	const policies = await loadSecurityPolicies(policyPath);
	const standardScores = new Map<SecurityStandard, number>();
	const complianceStatus = createInitialComplianceStatus();

	let aggregateRisk = 0;
	let highestRiskStandard: SecurityStandard | null = null;
	let highestRiskValue = -Infinity;

	for (const signal of signals) {
		const policy = policies.get(signal.standard);
		if (!policy) {
			throw new Error(`No policy found for standard: ${signal.standard}`);
		}

		const threshold = policy.thresholds;
		const compositeRisk = calculateCompositeRisk(signal, threshold);

		standardScores.set(signal.standard, compositeRisk);
		complianceStatus[signal.standard] = determineComplianceStatus(compositeRisk, threshold);

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
	parse(content: string): unknown {
		const state = createInitialParserState();
		for (const rawLine of content.split('\n')) {
			processLine(rawLine.trim(), state);
		}
		return state.result;
	},
};
interface YAMLParserState {
	result: Record<string, unknown>;
	currentSection: string | null;
	currentKey: string | null;
}

const INITIAL_SECTIONS = ['policy', 'thresholds', 'remediation', 'ruleset_mapping', 'risk_weights'];

function createInitialParserState(): YAMLParserState {
	const result: Record<string, unknown> = {};
	for (const section of INITIAL_SECTIONS) {
		result[section] = {};
	}
	return {
		result,
		currentSection: null,
		currentKey: null,
	};
}

function shouldSkipLine(line: string): boolean {
	return line.length === 0 || line.startsWith('#');
}

function isSectionHeader(line: string): boolean {
	return line.endsWith(':');
}

function startNewSection(line: string, state: YAMLParserState): void {
	const section = line.slice(0, -1);
	state.currentSection = section;
	state.currentKey = null;
	if (!state.result[section]) {
		state.result[section] = {};
	}
}

function parsePrimitiveValue(value: string): unknown {
	const trimmed = value.trim();
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	if (trimmed === 'null') return null;
	if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
	if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
	if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
	if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		return trimmed
			.slice(1, -1)
			.split(',')
			.map((item) => item.trim().replace(/['"]/g, ''))
			.filter((item) => item.length > 0);
	}
	return trimmed;
}

function shouldTrackSubkeys(value: unknown): boolean {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureSection(state: YAMLParserState): Record<string, unknown> | null {
	if (!state.currentSection) {
		return null;
	}
	const existing = state.result[state.currentSection];
	if (existing && typeof existing === 'object') {
		return existing as Record<string, unknown>;
	}
	const fresh: Record<string, unknown> = {};
	state.result[state.currentSection] = fresh;
	return fresh;
}

function ensureSubSection(section: Record<string, unknown>, key: string): Record<string, unknown> {
	const current = section[key];
	if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
		return current as Record<string, unknown>;
	}
	const fresh: Record<string, unknown> = {};
	section[key] = fresh;
	return fresh;
}

function handleKeyValue(line: string, state: YAMLParserState): void {
	const [rawKey, ...valueParts] = line.split(':');
	const normalizedKey = rawKey.trim();
	const parsedValue = parsePrimitiveValue(valueParts.join(':'));
	const section = ensureSection(state);
	if (!section) {
		return;
	}

	if (state.currentKey === null) {
		section[normalizedKey] = parsedValue;
		state.currentKey = shouldTrackSubkeys(parsedValue) ? normalizedKey : null;
		return;
	}

	const bucket = ensureSubSection(section, state.currentKey);
	bucket[normalizedKey] = parsedValue;
}

function processLine(line: string, state: YAMLParserState): void {
	if (shouldSkipLine(line)) {
		return;
	}
	if (isSectionHeader(line)) {
		startNewSection(line, state);
		return;
	}
	if (line.includes(':')) {
		handleKeyValue(line, state);
	}
}
