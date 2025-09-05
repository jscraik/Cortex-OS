/**
 * @file packages/prp-runner/src/gates/base.ts
 * @description Base gate interface and common functionality for PRP gates G0-G7
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */

// Canonical types are provided by @cortex-os/kernel. Import as type-only to avoid runtime cycles.
import type { PRPState, Evidence, GateResult, EnforcementProfile } from "@cortex-os/kernel";

export type GateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7';

export interface GateContext {
    state: PRPState;
    workingDirectory: string;
    projectRoot: string;
    enforcementProfile: EnforcementProfile;
    repoInfo: {
        owner: string;
        repo: string;
        branch: string;
        commitSha: string;
    };
    actor: string;
    strictMode: boolean;
}

export interface AutomatedCheck {
    name: string;
    description: string;
    execute(context: GateContext): Promise<{
        status: 'pass' | 'fail' | 'skip';
        output?: string;
        duration?: number;
        evidence?: Evidence[];
    }>;
}

export interface HumanApprovalSpec {
    role:
    | 'product-owner'
    | 'architect'
    | 'qa-lead'
    | 'code-reviewer'
    | 'security-reviewer'
    | 'maintainer'
    | 'release-manager';
    description: string;
    requiredDecision: 'approved' | 'rejected';
    timeoutMs?: number;
}

/**
 * Base abstract gate implementing common functionality
 */
export abstract class BaseGate {
    abstract readonly id: GateId;
    abstract readonly name: string;
    abstract readonly purpose: string;
    abstract readonly requiresHumanApproval: boolean;
    abstract readonly humanApprovalSpec?: HumanApprovalSpec;
    abstract readonly automatedChecks: AutomatedCheck[];

    /**
     * Execute the gate with validation and evidence collection
     */
    async execute(context: GateContext): Promise<GateResult> {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        const artifacts: string[] = [];
        const evidence: string[] = [];

        try {
            // Execute automated checks
            const automatedResults = await this.runAutomatedChecks(context);

            // Determine if human approval is required
            const needsApproval =
                this.requiresHumanApproval &&
                this.shouldRequestApproval(automatedResults);

            // Execute gate-specific logic
            const gateSpecificResult = await this.executeGateLogic(
                context,
                automatedResults,
            );
            artifacts.push(...gateSpecificResult.artifacts);
            evidence.push(...gateSpecificResult.evidence);

            // Determine overall status
            const hasFailures = automatedResults.some((r) => r.status === 'fail');
            const status = hasFailures
                ? 'failed'
                : needsApproval
                    ? 'pending'
                    : 'passed';

            return {
                id: this.id,
                name: this.name,
                status,
                requiresHumanApproval: needsApproval,
                automatedChecks: automatedResults,
                artifacts,
                evidence,
                timestamp,
                nextSteps: this.generateNextSteps(automatedResults, needsApproval),
            };
        } catch (error) {
            return {
                id: this.id,
                name: this.name,
                status: 'failed',
                requiresHumanApproval: false,
                automatedChecks: [
                    {
                        name: 'gate-execution',
                        status: 'fail',
                        output: `Gate execution failed: ${error instanceof Error ? error.message : String(error)}`,
                        duration: Date.now() - startTime,
                    },
                ],
                artifacts,
                evidence,
                timestamp,
            };
        }
    }

    /**
     * Run all automated checks for this gate
     */
    private async runAutomatedChecks(context: GateContext) {
        const results = [];

        for (const check of this.automatedChecks) {
            try {
                const result = await check.execute(context);
                results.push({
                    name: check.name,
                    status: result.status,
                    output: result.output,
                    duration: result.duration,
                });

                // Add evidence to state if provided
                if (result.evidence) {
                    context.state.evidence.push(...result.evidence);
                }
            } catch (error) {
                results.push({
                    name: check.name,
                    status: 'fail' as const,
                    output: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
        }

        return results;
    }

    /**
     * Determine if human approval should be requested based on automated results
     */
    protected shouldRequestApproval(
        automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
    ): boolean {
        // Default: request approval if any checks failed or if always required
        return (
            this.requiresHumanApproval &&
            (automatedResults.some((r) => r.status === 'fail') ||
                automatedResults.length === 0)
        );
    }

    /**
     * Generate next steps based on gate results
     */
    protected generateNextSteps(
        automatedResults: Array<{ status: 'pass' | 'fail' | 'skip'; name: string }>,
        needsApproval: boolean,
    ): string[] {
        const steps: string[] = [];

        const failures = automatedResults.filter((r) => r.status === 'fail');
        if (failures.length > 0) {
            steps.push(
                `Fix ${failures.length} failing checks: ${failures.map((f) => f.name).join(', ')}`,
            );
        }

        if (needsApproval) {
            steps.push(`Request ${this.humanApprovalSpec?.role} approval`);
        }

        if (steps.length === 0) {
            steps.push('Gate passed - proceed to next gate');
        }

        return steps;
    }

    /**
     * Gate-specific execution logic - override in subclasses
     */
    protected abstract executeGateLogic(
        context: GateContext,
        automatedResults: Array<{ status: 'pass' | 'fail' | 'skip' }>,
    ): Promise<{
        artifacts: string[];
        evidence: string[];
    }>;
}
