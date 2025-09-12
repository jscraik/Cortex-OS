/**
 * @file packages/prp-runner/src/gates/g7-release.ts
 * @description G7: Release - final release action and sign-off
 */
import { type AutomatedCheck, BaseGate, type GateContext, type HumanApprovalSpec } from './base.js';
export declare class G7ReleaseGate extends BaseGate {
    readonly id: "G7";
    readonly name = "Release";
    readonly purpose = "Perform release (stub) and sign final artifact";
    readonly requiresHumanApproval = true;
    readonly humanApprovalSpec: HumanApprovalSpec;
    readonly automatedChecks: AutomatedCheck[];
    protected executeGateLogic(context: GateContext): Promise<{
        artifacts: string[];
        evidence: string[];
    }>;
    protected shouldRequestApproval(automatedResults: Array<{
        status: 'pass' | 'fail' | 'skip';
    }>): boolean;
}
//# sourceMappingURL=g7-release.d.ts.map