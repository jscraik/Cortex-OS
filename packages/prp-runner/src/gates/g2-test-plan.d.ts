/**
 * @file packages/prp-runner/src/gates/g2-test-plan.ts
 * @description G2: Test Plan - QA lead approval and coverage/perf/a11y plans
 */
import {
	BaseGate,
	type AutomatedCheck,
	type GateContext,
	type HumanApprovalSpec,
} from './base.js';
export declare class G2TestPlanGate extends BaseGate {
	readonly id: 'G2';
	readonly name = 'Test Plan';
	readonly purpose =
		'Validate that test strategy meets coverage, performance, and accessibility requirements';
	readonly requiresHumanApproval = true;
	readonly humanApprovalSpec: HumanApprovalSpec;
	readonly automatedChecks: AutomatedCheck[];
	protected executeGateLogic(
		context: GateContext,
		automatedResults: Array<{
			status: 'pass' | 'fail' | 'skip';
		}>,
	): Promise<{
		artifacts: string[];
		evidence: string[];
	}>;
	protected shouldRequestApproval(
		automatedResults: Array<{
			status: 'pass' | 'fail' | 'skip';
		}>,
	): boolean;
}
//# sourceMappingURL=g2-test-plan.d.ts.map
