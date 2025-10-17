/**
 * @file packages/prp-runner/src/integrations/github-spec-kit.ts
 * @description Helpers for projecting BMAD results into GitHub Spec Kit artefacts.
 */

import type { Blueprint } from '../runner.js';
import type { BmadAlignmentReport } from '../bmad/index.js';
import type { RunManifest } from '../run-manifest/schema.js';

export interface GitHubSpecKitPlan {
        scenario: string;
        summary: string;
        readiness: 'draft' | 'in-review' | 'ready';
        blueprint: {
                title: string;
                description: string;
                requirements: string[];
                metadata?: Record<string, unknown>;
        };
        manifest: Pick<RunManifest, 'schemaVersion' | 'manifestId' | 'runId' | 'generatedAt' | 'summary' | 'telemetry'>;
        gates: GateProjection[];
        alignment: BmadAlignmentReport;
}

export interface GateProjection {
        gateId: string;
        stageKey: string;
        status: string;
        approvalsRequired: boolean;
        approvalsGranted: boolean;
        automatedCheckCount: number;
}

export interface GitHubIssuePayload {
        title: string;
        body: string;
        labels: string[];
}

/**
 * Convert a PRP blueprint + manifest into a GitHub Spec Kit plan payload.
 */
export function buildGitHubSpecKitPlan(
        blueprint: Blueprint,
        manifest: RunManifest,
        alignment: BmadAlignmentReport,
): GitHubSpecKitPlan {
        const gates = manifest.stages.flatMap((stage) => projectStage(stage, alignment));
        let readiness: GitHubSpecKitPlan['readiness'] = 'draft';
        if (alignment.isAligned && manifest.summary.status === 'completed') {
                readiness = 'ready';
        } else if (alignment.isAligned) {
                readiness = 'in-review';
        }

        return {
                scenario: blueprint.description,
                summary: `Run ${manifest.runId} captured ${gates.length} gate outcomes with ${alignment.issues.length} outstanding alignment issue(s).`,
                readiness,
                blueprint: {
                        title: blueprint.title,
                        description: blueprint.description,
                        requirements: blueprint.requirements,
                        metadata: blueprint.metadata as Record<string, unknown> | undefined,
                },
                manifest: {
                        schemaVersion: manifest.schemaVersion,
                        manifestId: manifest.manifestId,
                        runId: manifest.runId,
                        generatedAt: manifest.generatedAt,
                        summary: manifest.summary,
                        telemetry: manifest.telemetry,
                },
                gates,
                alignment,
        };
}

export function createGitHubSpecKitIssuePayload(
        plan: GitHubSpecKitPlan,
        options: { labels?: string[] } = {},
): GitHubIssuePayload {
        const labels = options.labels ?? ['spec-kit', 'prp'];
        const heading = `## Scenario\n${plan.scenario}`;
        const readiness = `## Readiness\nStatus: **${plan.readiness.toUpperCase()}**`;
        const requirements = plan.blueprint.requirements.length
                ? plan.blueprint.requirements.map((req) => `- ${req}`).join('\n')
                : '- Pending';
        const requirementsSection = `## Requirements\n${requirements}`;
        const gatesSection = formatGateTable(plan.gates);
        const alignmentSection = formatAlignment(plan.alignment);
        const summarySection = `> ${plan.summary}`;

        return {
                title: `[PRP] ${plan.blueprint.title}`,
                body: [summarySection, heading, readiness, requirementsSection, gatesSection, alignmentSection]
                        .filter(Boolean)
                        .join('\n\n'),
                labels,
        };
}

export function formatSpecKitMarkdown(plan: GitHubSpecKitPlan): string {
        const issue = createGitHubSpecKitIssuePayload(plan);
        return `---\ntitle: ${escapeMarkdown(plan.blueprint.title)}\nstatus: ${plan.readiness}\nrunId: ${plan.manifest.runId}\nmanifestId: ${plan.manifest.manifestId}\n---\n\n${issue.body}\n`;
}

function projectStage(stage: RunManifest['stages'][number], alignment: BmadAlignmentReport): GateProjection[] {
        const stageAlignment = alignment.stages.find((item) => item.stageKey === stage.key);
        return stage.gate.sourceGateIds.map((gateId) => {
                const summary = stageAlignment?.gateSummaries.find((item) => item.gateId === gateId);
                return {
                        gateId,
                        stageKey: stage.key,
                        status: summary?.status ?? stage.status,
                        approvalsRequired: summary?.requiresApproval ?? stage.gate.requiresHumanApproval,
                        approvalsGranted: summary?.hasApproval ?? stage.gate.approvals.length > 0,
                        automatedCheckCount: stage.gate.automatedChecks.length,
                } satisfies GateProjection;
        });
}

function formatGateTable(gates: GateProjection[]): string {
        const header = '| Gate | Stage | Status | Approvals | Checks |\n| --- | --- | --- | --- | --- |';
        if (gates.length === 0) {
                        return `${header}\n| — | — | — | — | — |`;
        }
        const rows = gates
                .map((gate) => {
                        let approvalIndicator = '—';
                        if (gate.approvalsGranted) {
                                approvalIndicator = '✔️';
                        } else if (gate.approvalsRequired) {
                                approvalIndicator = '⚠️';
                        }
                        return `| ${gate.gateId} | ${gate.stageKey} | ${gate.status} | ${approvalIndicator} | ${gate.automatedCheckCount} |`;
                })
                .join('\n');
        return `## Gates\n${header}\n${rows}`;
}

function formatAlignment(alignment: BmadAlignmentReport): string {
        const bullet = alignment.issues.length
                ? alignment.issues.map((issue) => `- ❗ ${issue}`).join('\n')
                : '- [OK] Blueprint, manifest, and approvals are aligned.';
        return `## Alignment\n${bullet}`;
}

function escapeMarkdown(value: string): string {
        return value.replace(/"/g, '\\"');
}
