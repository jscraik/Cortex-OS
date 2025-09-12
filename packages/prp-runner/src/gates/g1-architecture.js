/**
 * @file packages/prp-runner/src/gates/g1-architecture.ts
 * @description G1: Architecture & Specification - Architect approval and policy alignment
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */
import { nanoid } from 'nanoid';
import { BaseGate, } from './base.js';
/**
 * Validate architecture policy presence and basics from enforcement profile
 */
class ArchitecturePolicyPresenceCheck {
    name = 'architecture-policy-presence';
    description = 'Ensure enforcement profile defines architecture boundaries and conventions';
    async execute(context) {
        const issues = [];
        const { architecture } = context.enforcementProfile;
        if (!architecture.allowedPackageBoundaries ||
            architecture.allowedPackageBoundaries.length === 0) {
            issues.push('No allowed package boundaries specified');
        }
        if (!architecture.namingConventions ||
            Object.keys(architecture.namingConventions).length === 0) {
            issues.push('No naming conventions defined');
        }
        const evidence = [
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
            status: (issues.length === 0 ? 'pass' : 'fail'),
            output: issues.length === 0
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
class GovernanceRequiredChecksCheck {
    name = 'governance-required-checks';
    description = 'Verify required checks include test, lint, and type-check';
    async execute(context) {
        const { governance } = context.enforcementProfile;
        const required = new Set(governance.requiredChecks || []);
        const missing = [];
        for (const check of ['test', 'lint', 'type-check']) {
            if (!required.has(check))
                missing.push(check);
        }
        const evidence = [
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
            status: (missing.length === 0 ? 'pass' : 'fail'),
            output: missing.length === 0
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
class RepoLayoutHintsCheck {
    name = 'repo-layout-hints';
    description = 'Ensure repository layout hints are provided for architecture';
    async execute(context) {
        const { repoLayout } = context.enforcementProfile.architecture;
        const issues = [];
        if (!repoLayout || repoLayout.length === 0) {
            issues.push('No repo layout hints provided in enforcement profile');
        }
        const evidence = [
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
            status: (issues.length === 0 ? 'pass' : 'fail'),
            output: issues.length === 0
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
    id = 'G1';
    name = 'Architecture & Specification';
    purpose = 'Validate architecture against policy and capture architect approval';
    requiresHumanApproval = true;
    humanApprovalSpec = {
        role: 'architect',
        description: 'Architect must approve the proposed architecture and constraints',
        requiredDecision: 'approved',
        timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
    };
    automatedChecks = [
        new ArchitecturePolicyPresenceCheck(),
        new GovernanceRequiredChecksCheck(),
        new RepoLayoutHintsCheck(),
    ];
    async executeGateLogic(context, automatedResults) {
        const artifacts = [];
        const evidence = [];
        const allChecksPassed = automatedResults.every((r) => r.status === 'pass');
        if (allChecksPassed) {
            // Capture architecture summary evidence
            const architectureSummary = {
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
    shouldRequestApproval(automatedResults) {
        return automatedResults.every((r) => r.status === 'pass');
    }
}
//# sourceMappingURL=g1-architecture.js.map