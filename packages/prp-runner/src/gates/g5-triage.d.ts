/**
 * @file packages/prp-runner/src/gates/g5-triage.ts
 * @description G5: Triage - ensure no red findings; maintainers sign-off
 */
import {
	type AutomatedCheck,
	BaseGate,
	type HumanApprovalSpec,
} from './base.js';
export declare class G5TriageGate extends BaseGate {
	readonly id: 'G5';
	readonly name = 'Triage';
	readonly purpose = 'Confirm no blockers remain before release readiness';
	readonly requiresHumanApproval = true;
	readonly humanApprovalSpec: HumanApprovalSpec;
	readonly automatedChecks: AutomatedCheck[];
	protected executeGateLogic(): Promise<{
		artifacts: never[];
		evidence: never[];
	}>;
	protected shouldRequestApproval(
		automatedResults: Array<{
			status: 'pass' | 'fail' | 'skip';
		}>,
	): boolean;
}
//# sourceMappingURL=g5-triage.d.ts.map
