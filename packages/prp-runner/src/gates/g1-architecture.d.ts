/**
 * @file packages/prp-runner/src/gates/g1-architecture.ts
 * @description G1: Architecture & Specification - Architect approval and policy alignment
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */
import { type AutomatedCheck, BaseGate, type GateContext, type HumanApprovalSpec } from './base.js';
/**
 * G1: Architecture & Specification Gate
 *
 * Purpose: Validate the proposed architecture aligns with enforcement profile and capture architect approval
 */
export declare class G1ArchitectureGate extends BaseGate {
    readonly id: "G1";
    readonly name = "Architecture & Specification";
    readonly purpose = "Validate architecture against policy and capture architect approval";
    readonly requiresHumanApproval = true;
    readonly humanApprovalSpec: HumanApprovalSpec;
    readonly automatedChecks: AutomatedCheck[];
    protected executeGateLogic(context: GateContext, automatedResults: Array<{
        status: 'pass' | 'fail' | 'skip';
    }>): Promise<{
        artifacts: string[];
        evidence: string[];
    }>;
    /**
     * G1 should always request architect approval if checks pass
     */
    protected shouldRequestApproval(automatedResults: Array<{
        status: 'pass' | 'fail' | 'skip';
    }>): boolean;
}
//# sourceMappingURL=g1-architecture.d.ts.map