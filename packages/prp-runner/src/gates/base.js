/**
 * @file packages/prp-runner/src/gates/base.ts
 * @description Base gate interface and common functionality for PRP gates G0-G7
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 * @status IMPLEMENTATION_READY
 */
/**
 * Base abstract gate implementing common functionality
 */
export class BaseGate {
    /**
     * Execute the gate with validation and evidence collection
     */
    async execute(context) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        const artifacts = [];
        const evidence = [];
        try {
            // Execute automated checks
            const automatedResults = await this.runAutomatedChecks(context);
            // Determine if human approval is required
            const needsApproval = this.requiresHumanApproval &&
                this.shouldRequestApproval(automatedResults);
            // Execute gate-specific logic
            const gateSpecificResult = await this.executeGateLogic(context, automatedResults);
            artifacts.push(...gateSpecificResult.artifacts);
            evidence.push(...gateSpecificResult.evidence);
            // Determine overall status
            const hasFailures = automatedResults.some((r) => r.status === 'fail');
            const status = hasFailures
                ? 'failed'
                : needsApproval
                    ? 'pending'
                    : 'passed';
            return {
                id: this.id,
                name: this.name,
                status,
                requiresHumanApproval: needsApproval,
                automatedChecks: automatedResults,
                artifacts,
                evidence,
                timestamp,
                nextSteps: this.generateNextSteps(automatedResults, needsApproval),
            };
        }
        catch (error) {
            return {
                id: this.id,
                name: this.name,
                status: 'failed',
                requiresHumanApproval: false,
                automatedChecks: [
                    {
                        name: 'gate-execution',
                        status: 'fail',
                        output: `Gate execution failed: ${error instanceof Error ? error.message : String(error)}`,
                        duration: Date.now() - startTime,
                    },
                ],
                artifacts,
                evidence,
                timestamp,
            };
        }
    }
    /**
     * Run all automated checks for this gate
     */
    async runAutomatedChecks(context) {
        const results = [];
        for (const check of this.automatedChecks) {
            try {
                const result = await check.execute(context);
                results.push({
                    name: check.name,
                    status: result.status,
                    output: result.output,
                    duration: result.duration,
                });
                // Add evidence to state if provided
                if (result.evidence) {
                    context.state.evidence.push(...result.evidence);
                }
            }
            catch (error) {
                results.push({
                    name: check.name,
                    status: 'fail',
                    output: `Check failed: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
        }
        return results;
    }
    /**
     * Determine if human approval should be requested based on automated results
     */
    shouldRequestApproval(automatedResults) {
        // Default: request approval if any checks failed or if always required
        return (this.requiresHumanApproval &&
            (automatedResults.some((r) => r.status === 'fail') ||
                automatedResults.length === 0));
    }
    /**
     * Generate next steps based on gate results
     */
    generateNextSteps(automatedResults, needsApproval) {
        const steps = [];
        const failures = automatedResults.filter((r) => r.status === 'fail');
        if (failures.length > 0) {
            steps.push(`Fix ${failures.length} failing checks: ${failures.map((f) => f.name).join(', ')}`);
        }
        if (needsApproval) {
            steps.push(`Request ${this.humanApprovalSpec?.role} approval`);
        }
        if (steps.length === 0) {
            steps.push('Gate passed - proceed to next gate');
        }
        return steps;
    }
}
//# sourceMappingURL=base.js.map