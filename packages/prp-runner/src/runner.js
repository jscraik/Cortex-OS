/**
 * @file packages/prp-runner/src/runner.ts
 * @description End-to-end PRP workflow runner using gate framework (G0→G1 for now)
 */
import { generatePRPMarkdown, generateReviewJSON, writePRPDocument, } from './documentation/index.js';
import { loadInitialMd } from './enforcement/initial-processor.js';
import { G0IdeationGate } from './gates/g0-ideation.js';
import { G1ArchitectureGate } from './gates/g1-architecture.js';
import { G2TestPlanGate } from './gates/g2-test-plan.js';
import { G3CodeReviewGate } from './gates/g3-code-review.js';
import { G4VerificationGate } from './gates/g4-verification.js';
import { G5TriageGate } from './gates/g5-triage.js';
import { G6ReleaseReadinessGate } from './gates/g6-release-readiness.js';
import { G7ReleaseGate } from './gates/g7-release.js';
class AutoApproveProvider {
    async requestApproval({ gateId, role, context, }) {
        return {
            gateId: gateId,
            actor: context.actor || role,
            decision: 'approved',
            timestamp: new Date().toISOString(),
            commitSha: context.repoInfo.commitSha,
            rationale: `Auto-approved by ${role} in non-strict mode`,
        };
    }
}
export async function runPRPWorkflow(blueprint, repoInfo, options, approvalProvider) {
    const enforcementProfile = await loadInitialMd(options.projectRoot, options.initialMdPath);
    // Initialize state
    const state = {
        id: `prp-${Date.now()}`,
        runId: `run-${Date.now()}`,
        phase: 'strategy',
        blueprint: {
            title: blueprint.title,
            description: blueprint.description,
            requirements: blueprint.requirements,
            metadata: blueprint.metadata,
        },
        enforcementProfile,
        gates: {},
        approvals: [],
        outputs: {},
        evidence: [],
        validationResults: {},
        metadata: {
            startTime: new Date().toISOString(),
        },
    };
    const gates = [
        new G0IdeationGate(),
        new G1ArchitectureGate(),
        new G2TestPlanGate(),
        new G3CodeReviewGate(),
        new G4VerificationGate(),
        new G5TriageGate(),
        new G6ReleaseReadinessGate(),
        new G7ReleaseGate(),
    ];
    const ctxBase = {
        workingDirectory: options.workingDirectory,
        projectRoot: options.projectRoot,
        enforcementProfile,
        repoInfo,
        actor: options.actor || 'system',
        strictMode: !!options.strictMode,
    };
    const approver = approvalProvider ?? new AutoApproveProvider();
    for (const gate of gates) {
        const context = { ...ctxBase, state };
        const result = await gate.execute(context);
        if (result.requiresHumanApproval) {
            const approval = await approver.requestApproval({
                gateId: gate.id,
                role: gate.humanApprovalSpec?.role || 'reviewer',
                description: gate.humanApprovalSpec?.description || gate.name,
                context,
            });
            state.approvals.push(approval);
            // Attach to gate result in state for completeness
            result.humanApproval = approval;
            // If approved and no automated failures, promote status to passed; if rejected, set to failed
            const hasFailures = result.automatedChecks.some((c) => c.status === 'fail');
            if (approval.decision === 'approved' && !hasFailures) {
                result.status = 'passed';
            }
            else if (approval.decision !== 'approved') {
                result.status = 'failed';
            }
            // If strictMode and approval rejected, stop
            if (options.strictMode && approval.decision !== 'approved') {
                break;
            }
        }
        // Persist final gate result after any approval handling
        state.gates[gate.id] = result;
    }
    // Generate review JSON and prp.md
    const review = generateReviewJSON(state);
    // Calculate final document status
    const allPassed = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].every((id) => state.gates[id]?.status === 'passed');
    const status = allPassed ? 'ready-for-release' : 'in-progress';
    const prpDoc = {
        id: state.id,
        title: state.blueprint.title,
        repo: `${repoInfo.owner}/${repoInfo.repo}`,
        branch: repoInfo.branch,
        owner: repoInfo.owner,
        created: state.metadata.startTime,
        updated: new Date().toISOString(),
        version: '0.1.0',
        status,
        links: {},
    };
    const markdown = generatePRPMarkdown(state, prpDoc, review);
    const prpPath = options.outputPath || `${options.projectRoot}/prp.md`;
    await writePRPDocument(markdown, prpPath);
    return { state, prpPath, markdown };
}
//# sourceMappingURL=runner.js.map