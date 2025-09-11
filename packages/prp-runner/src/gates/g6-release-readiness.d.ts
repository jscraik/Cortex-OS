/**
 * @file packages/prp-runner/src/gates/g6-release-readiness.ts
 * @description G6: Release Readiness - ensure all prior gates passed and artifacts present
 */
import {
	type AutomatedCheck,
	BaseGate,
	type HumanApprovalSpec,
} from './base.js';
export declare class G6ReleaseReadinessGate extends BaseGate {
	readonly id: 'G6';
	readonly name = 'Release Readiness';
	readonly purpose = 'Final checks before release manager approval';
	readonly requiresHumanApproval = true;
	readonly humanApprovalSpec: HumanApprovalSpec;
	readonly automatedChecks: AutomatedCheck[];
	protected executeGateLogic(): Promise<{
		artifacts: string[];
		evidence: never[];
	}>;
	protected shouldRequestApproval(
		automatedResults: Array<{
			status: 'pass' | 'fail' | 'skip';
		}>,
	): boolean;
}
//# sourceMappingURL=g6-release-readiness.d.ts.map
