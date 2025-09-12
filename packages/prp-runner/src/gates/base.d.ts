/**
 * @file packages/prp-runner/src/gates/base.ts
 * @description Base gate interface and common functionality for PRP gates G0-G7
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */
import type { EnforcementProfile, Evidence, GateResult, PRPState } from '@cortex-os/kernel';
export type { EnforcementProfile, Evidence, GateResult, PRPState };
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
    role: 'product-owner' | 'architect' | 'qa-lead' | 'code-reviewer' | 'security-reviewer' | 'maintainer' | 'release-manager';
    description: string;
    requiredDecision: 'approved' | 'rejected';
    timeoutMs?: number;
}
/**
 * Base abstract gate implementing common functionality
 */
export declare abstract class BaseGate {
    abstract readonly id: GateId;
    abstract readonly name: string;
    abstract readonly purpose: string;
    abstract readonly requiresHumanApproval: boolean;
    abstract readonly humanApprovalSpec?: HumanApprovalSpec;
    abstract readonly automatedChecks: AutomatedCheck[];
    /**
     * Execute the gate with validation and evidence collection
     */
    execute(context: GateContext): Promise<GateResult>;
    /**
     * Run all automated checks for this gate
     */
    private runAutomatedChecks;
    /**
     * Determine if human approval should be requested based on automated results
     */
    protected shouldRequestApproval(automatedResults: Array<{
        status: 'pass' | 'fail' | 'skip';
    }>): boolean;
    /**
     * Generate next steps based on gate results
     */
    protected generateNextSteps(automatedResults: Array<{
        status: 'pass' | 'fail' | 'skip';
        name: string;
    }>, needsApproval: boolean): string[];
    /**
     * Gate-specific execution logic - override in subclasses
     */
    protected abstract executeGateLogic(context: GateContext, automatedResults: Array<{
        status: 'pass' | 'fail' | 'skip';
    }>): Promise<{
        artifacts: string[];
        evidence: string[];
    }>;
}
//# sourceMappingURL=base.d.ts.map