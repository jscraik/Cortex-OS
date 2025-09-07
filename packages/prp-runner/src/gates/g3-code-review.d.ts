/**
 * @file packages/prp-runner/src/gates/g3-code-review.ts
 * @description G3: Code Review - code reviewer approval and policy checks
 */
import { BaseGate, type AutomatedCheck, type GateContext, type HumanApprovalSpec } from "./base.js";
export declare class G3CodeReviewGate extends BaseGate {
    readonly id: "G3";
    readonly name = "Code Review";
    readonly purpose = "Ensure code quality gates configured and codeowners present";
    readonly requiresHumanApproval = true;
    readonly humanApprovalSpec: HumanApprovalSpec;
    readonly automatedChecks: AutomatedCheck[];
    protected executeGateLogic(context: GateContext): Promise<{
        artifacts: string[];
        evidence: string[];
    }>;
    protected shouldRequestApproval(automatedResults: Array<{
        status: "pass" | "fail" | "skip";
    }>): boolean;
}
//# sourceMappingURL=g3-code-review.d.ts.map