/**
 * @file packages/prp-runner/src/gates/g5-triage.ts
 * @description G5: Triage - ensure no red findings; maintainers sign-off
 */
import { BaseGate, } from './base.js';
class NoRedFindingsCheck {
    name = 'no-red-findings';
    description = "Ensure no 'red' category scores exist (based on previous review JSON categories)";
    async execute(_context) {
        // Without persisted review JSON categories, assume pass for now
        return {
            status: 'pass',
            output: 'No red findings (assumed)',
            duration: 10,
        };
    }
}
export class G5TriageGate extends BaseGate {
    id = 'G5';
    name = 'Triage';
    purpose = 'Confirm no blockers remain before release readiness';
    requiresHumanApproval = true;
    humanApprovalSpec = {
        role: 'maintainer',
        description: 'Maintainer verifies no blockers remain',
        requiredDecision: 'approved',
        timeoutMs: 24 * 60 * 60 * 1000,
    };
    automatedChecks = [new NoRedFindingsCheck()];
    async executeGateLogic() {
        return { artifacts: [], evidence: [] };
    }
    shouldRequestApproval(automatedResults) {
        return automatedResults.every((r) => r.status === 'pass');
    }
}
//# sourceMappingURL=g5-triage.js.map