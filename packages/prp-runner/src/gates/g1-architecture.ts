/**
 * @file packages/prp-runner/src/gates/g1-architecture.ts
 * @description G1: Architecture & Specification - Architect approval and policy alignment
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */

import { nanoid } from 'nanoid';
import {
    type AutomatedCheck,
    BaseGate,
    type Evidence,
    type GateContext,
    type HumanApprovalSpec,
} from './base.js';

/**
 * Validate architecture policy presence and basics from enforcement profile
 */
class ArchitecturePolicyPresenceCheck implements AutomatedCheck {
    name = 'architecture-policy-presence';
    description =
        'Ensure enforcement profile defines architecture boundaries and conventions';

    async execute(context: GateContext) {
        const issues: string[] = [];
        const { architecture } = context.enforcementProfile;

        if (
            !architecture.allowedPackageBoundaries ||
            architecture.allowedPackageBoundaries.length === 0
        ) {
            issues.push('No allowed package boundaries specified');
        }

        if (
            !architecture.namingConventions ||
            Object.keys(architecture.namingConventions).length === 0
        ) {
            issues.push('No naming conventions defined');
        }

        const evidence: Evidence[] = [
            {
                id: nanoid(),
                type: 'validation',
                source: 'g1-architecture-policy',
                content: JSON.stringify({ architecture, issues }),
                timestamp: new Date().toISOString(),
                phase: 'strategy',
                commitSha: context.repoInfo.commitSha,
            },
        ];

        return {
            status: (issues.length === 0 ? 'pass' : 'fail') as
                | 'pass'
                | 'fail'
                | 'skip',
            output:
                issues.length === 0
                    ? 'Architecture policy basics present'
                    : `Missing: ${issues.join(', ')}`,
            duration: 75,
            evidence,
        };
    }
}

/**
 * Validate governance required checks include core quality gates
 */
class GovernanceRequiredChecksCheck implements AutomatedCheck {
    name = 'governance-required-checks';
    description = 'Verify required checks include test, lint, and type-check';

    async execute(context: GateContext) {
        const { governance } = context.enforcementProfile;
        const required = new Set(governance.requiredChecks || []);
        const missing: string[] = [];
        for (const check of ['test', 'lint', 'type-check']) {
            if (!required.has(check)) missing.push(check);
        }

        const evidence: Evidence[] = [
            {
                id: nanoid(),
                type: 'validation',
                source: 'g1-governance-checks',
                content: JSON.stringify({ requiredChecks: [...required], missing }),
                timestamp: new Date().toISOString(),
                phase: 'strategy',
                commitSha: context.repoInfo.commitSha,
            },
        ];

        return {
            status: (missing.length === 0 ? 'pass' : 'fail') as
                | 'pass'
                | 'fail'
                | 'skip',
            output:
                missing.length === 0
                    ? 'Required checks configured'
                    : `Missing required checks: ${missing.join(', ')}`,
            duration: 60,
            evidence,
        };
    }
}

/**
 * Validate repo layout hints exist (from enforcement profile)
 */
class RepoLayoutHintsCheck implements AutomatedCheck {
    name = 'repo-layout-hints';
    description = 'Ensure repository layout hints are provided for architecture';

    async execute(context: GateContext) {
        const { repoLayout } = context.enforcementProfile.architecture;
        const issues: string[] = [];
        if (!repoLayout || repoLayout.length === 0) {
            issues.push('No repo layout hints provided in enforcement profile');
        }

        const evidence: Evidence[] = [
            {
                id: nanoid(),
                type: 'analysis',
                source: 'g1-repo-layout',
                content: JSON.stringify({ repoLayout: repoLayout || [], issues }),
                timestamp: new Date().toISOString(),
                phase: 'strategy',
                commitSha: context.repoInfo.commitSha,
            },
        ];

        return {
            status: (issues.length === 0 ? 'pass' : 'fail') as
                | 'pass'
                | 'fail'
                | 'skip',
            output:
                issues.length === 0
                    ? 'Repo layout hints present'
                    : `Issues: ${issues.join(', ')}`,
            duration: 40,
            evidence,
        };
    }
}

/**
 * G1: Architecture & Specification Gate
 *
 * Purpose: Validate the proposed architecture aligns with enforcement profile and capture architect approval
 */
export class G1ArchitectureGate extends BaseGate {
    readonly id = 'G1' as const;
    readonly name = 'Architecture & Specification';
    readonly purpose =
        'Validate architecture against policy and capture architect approval';
    readonly requiresHumanApproval = true;

    readonly humanApprovalSpec: HumanApprovalSpec = {
        role: 'architect',
        description:
            'Architect must approve the proposed architecture and constraints',
        requiredDecision: 'approved',
        timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
    };

    readonly automatedChecks: AutomatedCheck[] = [
        new ArchitecturePolicyPresenceCheck(),
        new GovernanceRequiredChecksCheck(),
        new RepoLayoutHintsCheck(),
    ];

    protected async executeGateLogic(
        context: GateContext,
        automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
    ) {
        const artifacts: string[] = [];
        const evidence: string[] = [];

        const allChecksPassed = automatedResults.every((r) => r.status === 'pass');

        if (allChecksPassed) {
            // Capture architecture summary evidence
            const architectureSummary: Evidence = {
                id: nanoid(),
                type: 'analysis',
                source: 'g1-architecture-summary',
                content: JSON.stringify({
                    enforcementProfile: context.enforcementProfile,
                    blueprintTitle: context.state.blueprint.title,
                    decisions: [
                        'Enforce package boundaries',
                        'Apply naming conventions',
                        'Adopt governance required checks',
                    ],
                }),
                timestamp: new Date().toISOString(),
                phase: 'strategy',
                commitSha: context.repoInfo.commitSha,
            };

            context.state.evidence.push(architectureSummary);
            evidence.push(architectureSummary.id);

            // Artifact stub (would be populated by actual design doc generation)
            artifacts.push('architecture-review.md');
        }

        return { artifacts, evidence };
    }

    /**
     * G1 should always request architect approval if checks pass
     */
    protected shouldRequestApproval(
        automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
    ): boolean {
        return automatedResults.every((r) => r.status === 'pass');
    }
}
