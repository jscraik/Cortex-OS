/**
 * @file packages/prp-runner/src/gates/g4-verification.ts
 * @description G4: Verification - validate quality budgets satisfied (simulation/stub)
 */
import {
	type AutomatedCheck,
	BaseGate,
	type GateContext,
	type HumanApprovalSpec,
} from './base.js';
export declare class G4VerificationGate extends BaseGate {
	readonly id: 'G4';
	readonly name = 'Verification';
	readonly purpose =
		'Verify that implemented solution meets the planned quality budgets (stubbed)';
	readonly requiresHumanApproval = true;
	readonly humanApprovalSpec: HumanApprovalSpec;
	readonly automatedChecks: AutomatedCheck[];
	protected executeGateLogic(context: GateContext): Promise<{
		artifacts: string[];
		evidence: string[];
	}>;
	protected shouldRequestApproval(
		automatedResults: Array<{
			status: 'pass' | 'fail' | 'skip';
		}>,
	): boolean;
}
//# sourceMappingURL=g4-verification.d.ts.map
