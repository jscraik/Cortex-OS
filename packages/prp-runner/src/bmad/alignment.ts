/**
 * @file packages/prp-runner/src/bmad/alignment.ts
 * @description Alignment utilities for Blueprint → Manifest → Approval → Decision (BMAD) guardrail.
 */

import type { GateResult, PRPState } from '@cortex-os/kernel';

import { type GateId, type RunManifest, type StageEntry, type StageKey, type StageStatus } from '../run-manifest/schema.js';

/**
 * Summary of a single gate's alignment inside a stage.
 */
export interface GateAlignmentSummary {
        gateId: GateId;
        status: GateResult['status'] | 'missing';
        requiresApproval: boolean;
        hasApproval: boolean;
}

/**
 * Alignment information for a manifest stage.
 */
export interface StageAlignmentSummary {
        stageKey: StageKey;
        manifestStatus: StageStatus;
        gateSummaries: GateAlignmentSummary[];
        issues: string[];
}

/**
 * Aggregated BMAD alignment report.
 */
export interface BmadAlignmentReport {
        blueprint: {
                titleAligned: boolean;
                descriptionAligned: boolean;
                missingRequirements: string[];
                extraRequirements: string[];
        };
        approvals: {
                pendingGateIds: GateId[];
                totalApprovals: number;
                grantedApprovals: number;
        };
        stages: StageAlignmentSummary[];
        issues: string[];
        isAligned: boolean;
}

/**
 * Compute BMAD alignment details between the live PRP state and the generated manifest.
 */
export function computeBmadAlignment(state: PRPState, manifest: RunManifest): BmadAlignmentReport {
        const issues: string[] = [];
        const blueprint = state.blueprint;
        const manifestBlueprint = manifest.blueprint;

        const manifestRequirements = manifestBlueprint.requirements ?? [];
        const missingRequirements = blueprint.requirements.filter(
                (req) => !manifestRequirements.includes(req),
        );
        const extraRequirements = manifestRequirements.filter(
                (req) => !blueprint.requirements.includes(req),
        );

        if (blueprint.title !== manifestBlueprint.title) {
                issues.push(
                        `Blueprint title mismatch: state="${blueprint.title}" manifest="${manifestBlueprint.title}"`,
                );
        }

        if (blueprint.description !== manifestBlueprint.description) {
                issues.push('Blueprint description diverges between state and manifest.');
        }

        if (missingRequirements.length > 0) {
                issues.push(
                        `Manifest is missing ${missingRequirements.length} requirement(s): ${missingRequirements.join(', ')}`,
                );
        }

        if (extraRequirements.length > 0) {
                issues.push(
                        `Manifest lists ${extraRequirements.length} requirement(s) that are not in the active blueprint: ${extraRequirements.join(', ')}`,
                );
        }

        const approvalsByGate = new Map<GateId, GateResult['humanApproval']>();
        for (const approval of state.approvals) {
                // Ensure approval.gateId is a string (or whatever type GateId is)
                if (typeof approval.gateId === 'string') {
                        approvalsByGate.set(approval.gateId, {
                                gateId: approval.gateId,
                                actor: approval.actor,
                                decision: approval.decision,
                                timestamp: approval.timestamp,
                                commitSha: approval.commitSha,
                                rationale: approval.rationale,
                        });
                } else {
                        // Optionally, handle the error case
                        // throw new Error(`Invalid gateId type: ${typeof approval.gateId}`);
                }
        }

        const stageSummaries = manifest.stages.map((stage) =>
                summarizeStageAlignment(stage, state, approvalsByGate),
        );

        const pendingGateIds = stageSummaries
                .flatMap((summary) => summary.gateSummaries)
                .filter((summary) => summary.requiresApproval && !summary.hasApproval)
                .map((summary) => summary.gateId);

        if (pendingGateIds.length > 0) {
                issues.push(
                        `Pending approvals for gate(s): ${Array.from(new Set(pendingGateIds)).join(', ')}`,
                );
        }

        const hasStageIssues = stageSummaries.some((summary) => summary.issues.length > 0);

        const report: BmadAlignmentReport = {
                blueprint: {
                        titleAligned: blueprint.title === manifestBlueprint.title,
                        descriptionAligned: blueprint.description === manifestBlueprint.description,
                        missingRequirements,
                        extraRequirements,
                },
                approvals: {
                        pendingGateIds,
                        totalApprovals: stageSummaries.reduce(
                                (total, summary) =>
                                        total + summary.gateSummaries.filter((gate) => gate.requiresApproval).length,
                                0,
                        ),
                        grantedApprovals: stageSummaries.reduce(
                                (total, summary) =>
                                        total + summary.gateSummaries.filter((gate) => gate.hasApproval).length,
                                0,
                        ),
                },
                stages: stageSummaries,
                issues,
                isAligned: issues.length === 0 && !hasStageIssues,
        };

        return report;
}

function summarizeStageAlignment(
        stage: StageEntry,
        state: PRPState,
        approvalsByGate: Map<GateId, GateResult['humanApproval']>,
): StageAlignmentSummary {
        const gateSummaries: GateAlignmentSummary[] = [];
        const stageIssues: string[] = [];

        for (const gateId of stage.gate.sourceGateIds) {
                const result = state.gates[gateId];
                if (!result) {
                        gateSummaries.push({
                                gateId,
                                status: 'missing',
                                requiresApproval: stage.gate.requiresHumanApproval,
                                hasApproval: false,
                        });
                        stageIssues.push(`No gate result recorded for ${gateId}.`);
                        continue;
                }

                const requiresApproval = result.requiresHumanApproval || stage.gate.requiresHumanApproval;
                const hasApproval = approvalsByGate.has(gateId);

                if (requiresApproval && !hasApproval && result.status === 'passed') {
                        stageIssues.push(`Gate ${gateId} passed without recorded approval.`);
                }

                gateSummaries.push({
                        gateId,
                        status: result.status,
                        requiresApproval,
                        hasApproval,
                });
        }

        return {
                stageKey: stage.key,
                manifestStatus: stage.status,
                gateSummaries,
                issues: stageIssues,
        };
}

