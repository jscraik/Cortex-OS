/**
 * @file packages/prp-runner/src/gates/g0-ideation.ts
 * @description G0: Ideation & Scope - Product owner confirmation of measurable outcome
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */
import {
	type AutomatedCheck,
	BaseGate,
	type GateContext,
	type HumanApprovalSpec,
} from './base.js';
/**
 * G0: Ideation & Scope Gate
 *
 * Purpose: Validate problem definition and confirm product owner approval
 * Human Decision Point: Product owner confirms problem & measurable outcome
 */
export declare class G0IdeationGate extends BaseGate {
	readonly id: 'G0';
	readonly name = 'Ideation & Scope';
	readonly purpose =
		'Validate problem definition and confirm product owner approval for measurable outcome';
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
	/**
	 * G0 should always request approval when checks pass
	 */
	protected shouldRequestApproval(
		automatedResults: Array<{
			status: 'pass' | 'fail' | 'skip';
		}>,
	): boolean;
}
//# sourceMappingURL=g0-ideation.d.ts.map
