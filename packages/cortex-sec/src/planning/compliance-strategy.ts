import type { ComplianceViolationEvent } from '../events/cortex-sec-events.js';

export type ComplianceSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ComplianceViolation {
	violationId: string;
	standard: 'owasp-top10' | 'cwe-25' | 'nist' | 'iso27001';
	rule: string;
	file: string;
	severity: ComplianceSeverity;
	detectedAt: string;
	advisory?: string;
}

export interface ComplianceSummary {
	riskLevel: ComplianceSeverity;
	requiresHumanReview: boolean;
	recommendedStrategy: 'SEQUENTIAL' | 'ADAPTIVE' | 'PARALLEL';
	notes: string[];
	violations: ComplianceViolation[];
}

const SEVERITY_ORDER: ComplianceSeverity[] = ['low', 'medium', 'high', 'critical'];

function normalizeViolation(event: ComplianceViolationEvent): ComplianceViolation {
	return {
		violationId: event.violationId,
		standard: event.standard,
		rule: event.rule,
		file: event.file,
		severity: event.severity,
		detectedAt: event.violatedAt,
		advisory:
			event.advisory ??
			'brAInwav compliance requires documented remediation before workflow progression.',
	};
}

function highestSeverity(violations: ComplianceViolation[]): ComplianceSeverity {
	return violations.reduce<ComplianceSeverity>(
		(current, violation) =>
			SEVERITY_ORDER.indexOf(violation.severity) > SEVERITY_ORDER.indexOf(current)
				? violation.severity
				: current,
		'low',
	);
}

function determineStrategy(risk: ComplianceSeverity): 'SEQUENTIAL' | 'ADAPTIVE' | 'PARALLEL' {
	if (risk === 'critical' || risk === 'high') {
		return 'SEQUENTIAL';
	}
	if (risk === 'medium') {
		return 'ADAPTIVE';
	}
	return 'PARALLEL';
}

function requiresHumanReview(risk: ComplianceSeverity, violations: ComplianceViolation[]): boolean {
	if (risk === 'critical') return true;
	if (risk === 'high') {
		return violations.some(
			(violation) => violation.standard === 'nist' || violation.standard === 'iso27001',
		);
	}
	return false;
}

const BRAND_NOTE = 'brAInwav compliance directive:';

export function summarizeCompliance(
	events: ComplianceViolationEvent[],
	options: { additionalNotes?: string[] } = {},
): ComplianceSummary {
	const violations = events.map(normalizeViolation);
	const riskLevel = highestSeverity(violations);
	const recommendedStrategy = determineStrategy(riskLevel);
	const notes = [
		`${BRAND_NOTE} Risk level evaluated as ${riskLevel.toUpperCase()}.`,
		recommendedStrategy === 'SEQUENTIAL'
			? 'Execute remediation before resuming concurrent operations.'
			: 'Continue with adaptive planning while monitoring compliance telemetry.',
		...(options.additionalNotes ?? []),
	];
	return {
		riskLevel,
		requiresHumanReview: requiresHumanReview(riskLevel, violations),
		recommendedStrategy,
		notes,
		violations,
	};
}

export interface ComplianceState {
	policies: string[];
	lastUpdated: string;
	riskLevel: ComplianceSeverity;
	violations: ComplianceViolation[];
	notes: string[];
	requiresHumanReview: boolean;
}

export function mergeComplianceState(
	summary: ComplianceSummary,
	policies: string[],
): ComplianceState {
	const timestamp = new Date().toISOString();
	return {
		policies,
		lastUpdated: timestamp,
		riskLevel: summary.riskLevel,
		violations: summary.violations,
		notes: summary.notes,
		requiresHumanReview: summary.requiresHumanReview,
	};
}
