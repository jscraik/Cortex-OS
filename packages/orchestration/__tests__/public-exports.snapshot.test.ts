import { describe, expect, it } from 'vitest';
import * as orchestration from '../src/index.js';

/**
 * Phase 0 safety net: snapshot the public exports to prevent accidental regressions
 * as we refactor internals towards LangGraph.
 */
describe('@cortex-os/orchestration public API', () => {
	it('exposes critical symbols', () => {
		const keys = Object.keys(orchestration);
		for (const k of ['version', 'name', 'OrchestrationDefaults', 'orchestrationMcpTools']) {
			expect(keys).toContain(k);
		}
	});

	it('matches the expected export keys (snapshot baseline)', () => {
		const keys = Object.keys(orchestration).sort();
		expect(keys).toMatchInlineSnapshot(`
    [
      "N0BudgetSchema",
      "N0SessionSchema",
      "N0StateSchema",
      "ORCHESTRATION_EVENT_SCHEMAS",
      "OrchestrationDefaults",
      "OrchestrationEventTypes",
      "PolicyRouter",
      "SecurityCoordinator",
      "THERMAL_CTX_KEY",
      "ThermalEventSchema",
      "ThermalLevelSchema",
      "ThermalPolicy",
      "ToolErrorCode",
      "ToolValidationError",
      "agentStateToN0",
      "applyThermalDecision",
      "buildN0",
      "compactN0State",
      "cortexStateToN0",
      "createCerebrumGraph",
      "createHookAwareDispatcher",
      "createInitialN0State",
      "createOrchestrationBus",
      "createToolErrorResponse",
      "createUnifiedToolSystem",
      "dispatchTools",
      "enqueueThermalEvent",
      "getThermalContext",
      "holdForCooldown",
      "markThermalResume",
      "mergeN0State",
      "name",
      "orchestrationMcpTools",
      "orchestrationSecurityToolAllowList",
      "orchestrationToolContracts",
      "processMonitoringTool",
      "runSpool",
      "taskManagementTool",
      "toolErrorResponseSchema",
      "version",
      "withThermalGuard",
      "workflowOrchestrationTool",
      "workflowStateToN0",
    ]
    `);
	});
});
