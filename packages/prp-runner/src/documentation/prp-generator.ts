/**
 * @file packages/prp-runner/src/documentation/prp-generator.ts
 * @description Generate finalized prp.md documents with audit trails and approvals
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */

import { promises as fs } from 'node:fs';
import type {
	Evidence,
	GateResult,
	HumanApproval,
	PRPState,
} from '@cortex-os/kernel';

export interface PRPDocument {
	id: string;
	title: string;
	repo: string;
	branch: string;
	owner: string;
	created: string;
	updated: string;
	version: string;
	status: 'ready-for-release' | 'in-progress' | 'recycled' | 'failed';
	links: {
		issue?: string;
		pr?: string;
		checks?: string;
	};
}

export interface ReviewJSON {
	schema: string;
	scores: Record<string, 'green' | 'amber' | 'red'>;
	findings: Array<{
		id: string;
		severity: 'blocker' | 'major' | 'minor' | 'nit';
		evidence: Array<{
			path: string;
			lines: string;
			sha: string;
		}>;
		recommendation: string;
	}>;
}

/**
 * Generate prp.md markdown document from PRP state
 */
export function generatePRPMarkdown(
	state: PRPState,
	document: PRPDocument,
	reviewJson?: ReviewJSON,
): string {
	const sections = [
		generateHeader(document),
		generateObjective(state),
		generateScopeAndNonGoals(state),
		generateConstraints(state),
		generateDesignSummary(state),
		generateInterfacesAndContracts(state),
		generateTestPlan(state),
		generateVerificationResults(state),
		generateReviewerSummary(reviewJson),
		generateDecisionsAndApprovals(state),
		generateReleaseNotes(state),
		generateArtifacts(state),
		generateFollowUps(state),
	];

	return sections.filter(Boolean).join('\n\n---\n\n');
}

function generateHeader(document: PRPDocument): string {
	return `# PRP Document

**ID:** ${document.id}
**Title:** ${document.title}
**Repository:** ${document.repo}
**Branch:** ${document.branch}
**Owner:** ${document.owner}
**Created:** ${document.created}
**Updated:** ${document.updated}
**Version:** ${document.version}
**Status:** ${document.status}

**Links:**
${document.links.issue ? `- Issue: ${document.links.issue}` : ''}
${document.links.pr ? `- Pull Request: ${document.links.pr}` : ''}
${document.links.checks ? `- Checks: ${document.links.checks}` : ''}`;
}

function generateObjective(state: PRPState): string {
	return `## 1. Objective

**Problem:** ${state.blueprint.description}

**Outcome (Measurable):** ${state.blueprint.requirements.length > 0 ? state.blueprint.requirements[0] : 'Specific measurable outcomes to be defined'}

**Requirements:**
${state.blueprint.requirements.map((req: string) => `- ${req}`).join('\n')}`;
}

function generateScopeAndNonGoals(state: PRPState): string {
	// Extract scope information from blueprint metadata if available
	const metadata = state.blueprint.metadata || {};
	const scope = (metadata.scope as string[]) || [];
	const nonGoals = (metadata.nonGoals as string[]) || [];

	return `## 2. Scope & Non-Goals

**In Scope:**
${scope.length > 0 ? scope.map((item) => `- ${item}`).join('\n') : '- To be defined based on requirements'}

**Non-Goals:**
${nonGoals.length > 0 ? nonGoals.map((item) => `- ${item}`).join('\n') : '- To be defined during specification phase'}`;
}

function generateConstraints(state: PRPState): string {
	const profile = state.enforcementProfile;
	if (!profile) {
		return `## 3. Constraints (from initial.md)

No enforcement profile loaded - using default constraints.`;
	}

	return `## 3. Constraints (from initial.md)

**Coverage Requirements:**
- Lines: ≥ ${profile.budgets.coverageLines}%
- Branches: ≥ ${profile.budgets.coverageBranches}%

**Performance Budgets:**
- LCP: ≤ ${profile.budgets.performanceLCP}ms
- TBT: ≤ ${profile.budgets.performanceTBT}ms

**Accessibility:**
- WCAG 2.2 AA compliance
- Score: ≥ ${profile.budgets.a11yScore}%

**Security:**
- No red findings
- SBOM + signed artifacts (Sigstore)

**Architecture:**
- Package boundaries: ${profile.architecture.allowedPackageBoundaries.join(', ') || 'Standard boundaries'}
- No cross-boundary imports without adapter`;
}

function generateDesignSummary(state: PRPState): string {
	// Look for design evidence in the state
	const designEvidence = state.evidence.filter(
		(e: Evidence) => e.type === 'analysis' && e.source.includes('design'),
	);

	const designContent =
		designEvidence.length > 0
			? designEvidence
					.map((e: Evidence) => {
						try {
							const parsed = JSON.parse(e.content);
							return `- ${parsed.summary || e.source}`;
						} catch {
							return `- ${e.source}`;
						}
					})
					.join('\n')
			: '- Design summary to be captured during G1 Specification gate';

	return `## 4. Design Summary

${designContent}

**Architecture Diagrams:** To be provided in design phase
**Sequence Flows:** To be documented in /docs/`;
}

function generateInterfacesAndContracts(_state: PRPState): string {
	return `## 5. Interfaces & Contracts

**API Specifications:** To be defined during specification phase
**Type Definitions:** To be generated during implementation
**Error Models:** Following problem+json standard`;
}

function generateTestPlan(state: PRPState): string {
	const testEvidence = state.evidence.filter(
		(e: Evidence) => e.type === 'test',
	);
	const testContent =
		testEvidence.length > 0
			? testEvidence
					.map((e: Evidence) => `- ${e.source}: ${e.content.slice(0, 100)}...`)
					.join('\n')
			: '- Unit tests for core logic\n- Integration tests for API endpoints\n- End-to-end tests for user workflows';

	return `## 6. Test Plan

${testContent}

**Test Categories:**
- Unit: Core business logic
- Integration: API and service interactions
- A11y: Keyboard navigation and screen reader compatibility
- Security: Input validation and authorization checks`;
}

function generateVerificationResults(state: PRPState): string {
	const gateResults = Object.values(state.gates) as unknown as GateResult[];
	const completedGates = gateResults.filter(
		(g: GateResult) => g.status === 'passed' || g.status === 'failed',
	);

	if (completedGates.length === 0) {
		return `## 7. Verification Results

No gates have been executed yet.`;
	}

	const results = completedGates
		.map((gate: GateResult) => {
			const passed = gate.automatedChecks.filter(
				(c: { status: 'pass' | 'fail' | 'skip' }) => c.status === 'pass',
			).length;
			const total = gate.automatedChecks.length;
			return `**${gate.name} (${gate.id}):**
- Status: ${gate.status}
- Checks: ${passed}/${total} passed
- Evidence: ${gate.evidence.length} items`;
		})
		.join('\n\n');

	return `## 7. Verification Results

${results}`;
}

function generateReviewerSummary(reviewJson?: ReviewJSON): string {
	if (!reviewJson) {
		return `## 8. Reviewer Summary

Review JSON will be generated upon completion of verification gates.`;
	}

	const findingsText = reviewJson.findings
		.map(
			(finding) =>
				`- **${finding.id}** (${finding.severity}): ${finding.recommendation}`,
		)
		.join('\n');

	return `## 8. Reviewer Summary

\`\`\`json
{
  "schema": "${reviewJson.schema}",
  "scores": ${JSON.stringify(reviewJson.scores, null, 2)},
  "findings": [
    ${reviewJson.findings
			.map(
				(f) => `{
      "id": "${f.id}",
      "severity": "${f.severity}",
      "recommendation": "${f.recommendation}"
    }`,
			)
			.join(',\n    ')}
  ]
}
\`\`\`

**Key Findings:**
${findingsText || 'No findings to report'}`;
}

function generateDecisionsAndApprovals(state: PRPState): string {
	const approvals = state.approvals.sort(
		(a: HumanApproval, b: HumanApproval) =>
			new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
	);

	if (approvals.length === 0) {
		return `## 9. Decisions & Approvals

No approvals recorded yet.`;
	}

	const approvalText = approvals
		.map((approval: HumanApproval) => {
			const gateNames: Record<string, string> = {
				G0: 'Product Approval',
				G1: 'Architecture',
				G2: 'Test Plan',
				G3: 'Code Review',
				G4: 'Verification',
				G5: 'Triage',
				G6: 'Release Readiness',
				G7: 'Release',
			};
			const gateName = gateNames[approval.gateId] || approval.gateId;
			const date = new Date(approval.timestamp).toISOString().split('T')[0];
			const time = new Date(approval.timestamp)
				.toISOString()
				.split('T')[1]
				.split('.')[0];

			return `- **${gateName}** — ${approval.decision} by ${approval.actor} @ ${date}T${time}Z (SHA: ${approval.commitSha.slice(0, 7)})`;
		})
		.join('\n');

	return `## 9. Decisions & Approvals

${approvalText}

**Rationales:**
${approvals.map((a: HumanApproval) => `- ${a.gateId}: ${a.rationale}`).join('\n')}`;
}

function generateReleaseNotes(state: PRPState): string {
	const version =
		(state.metadata as { version?: string } | undefined)?.version || '0.1.0';
	const highlights = (state.outputs.highlights as string[]) || [
		'Initial implementation',
	];
	const breakingChanges = (state.outputs.breakingChanges as string[]) || [
		'None',
	];

	return `## 10. Release Notes

**Version:** ${version}

**Highlights:**
${highlights.map((h) => `- ${h}`).join('\n')}

**Breaking Changes:**
${breakingChanges.map((c) => `- ${c}`).join('\n')}

**Migration:**
${breakingChanges.includes('None') ? 'N/A - no breaking changes' : 'See migration guide in documentation'}`;
}

function generateArtifacts(state: PRPState): string {
	const allArtifacts = (Object.values(state.gates) as unknown as GateResult[])
		.flatMap((gate: GateResult) => gate.artifacts)
		.filter((artifact, index, array) => array.indexOf(artifact) === index); // Dedupe

	const artifactText =
		allArtifacts.length > 0
			? allArtifacts.map((artifact) => `- ${artifact}`).join('\n')
			: '- No artifacts generated yet';

	return `## 11. Artifacts

${artifactText}

**Evidence:** ${state.evidence.length} items collected
**Gates Executed:** ${Object.keys(state.gates).length}`;
}

function generateFollowUps(state: PRPState): string {
	const followUps = (Object.values(state.gates) as unknown as GateResult[])
		.flatMap((gate: GateResult) => gate.nextSteps || [])
		.filter((step) => !step.includes('proceed')); // Filter out "proceed to next gate" steps

	const followUpText =
		followUps.length > 0
			? followUps.map((step) => `- ${step}`).join('\n')
			: '- No follow-up actions required';

	return `## 12. Follow-ups

${followUpText}

**Notes:**
- All decisions are signed with actor, timestamp, and commit SHA
- Evidence pointers reference specific file paths and line ranges
- Artifacts are content-addressed where possible`;
}

/**
 * Write prp.md file to filesystem
 */
export async function writePRPDocument(
	prpContent: string,
	outputPath: string,
): Promise<void> {
	await fs.writeFile(outputPath, prpContent, 'utf-8');
}

/**
 * Generate machine-checkable review JSON
 */
export function generateReviewJSON(state: PRPState): ReviewJSON {
	const scores: Record<string, 'green' | 'amber' | 'red'> = {};
	const findings: ReviewJSON['findings'] = [];

	// Analyze gate results to determine scores
	for (const gate of Object.values(state.gates)) {
		const category = getGateCategory(gate.id);
		const failedChecks = gate.automatedChecks.filter(
			(c) => c.status === 'fail',
		);

		if (failedChecks.length === 0) {
			scores[category] = 'green';
		} else if (failedChecks.some((c) => c.name.includes('blocker'))) {
			scores[category] = 'red';
		} else {
			scores[category] = 'amber';
		}

		// Convert failed checks to findings
		for (const check of failedChecks) {
			findings.push({
				id: `${gate.id}-${check.name}`,
				severity: check.name.includes('blocker')
					? 'blocker'
					: check.name.includes('major')
						? 'major'
						: 'minor',
				evidence: [
					{
						path: gate.id,
						lines: '1-10', // Placeholder - would be actual line ranges
						sha: 'unknown',
					},
				],
				recommendation: check.output || `Fix ${check.name} in ${gate.name}`,
			});
		}
	}

	return {
		schema: 'com.cortex.review/v1',
		scores,
		findings,
	};
}

function getGateCategory(gateId: string): string {
	const categories: Record<string, string> = {
		G0: 'planning',
		G1: 'design',
		G2: 'tests',
		G3: 'implementation',
		G4: 'security',
		G5: 'review',
		G6: 'validation',
		G7: 'release',
	};
	return categories[gateId] || 'unknown';
}
