import { describe, expect, it } from 'vitest';
import * as orchestration from '../src/index.js';

/**
 * Phase 0 safety net: snapshot the public exports to prevent accidental regressions
 * as we refactor internals towards LangGraph.
 */
describe('@cortex-os/orchestration public API', () => {
	it('exposes critical symbols', () => {
		const keys = Object.keys(orchestration);
		for (const k of [
			'version',
			'name',
			'OrchestrationDefaults',
			'orchestrationMcpTools',
		]) {
			expect(keys).toContain(k);
		}
	});

	it('matches the expected export keys (snapshot baseline)', () => {
		const keys = Object.keys(orchestration).sort();
    expect(keys).toMatchInlineSnapshot(`
        [
          "AgentRole",
          "CoordinationStrategy",
          "DecisionStrategy",
          "ORCHESTRATION_EVENT_SCHEMAS",
          "OrchestrationDefaults",
          "OrchestrationEventTypes",
          "OrchestrationStrategy",
          "Schemas",
          "ToolErrorCode",
          "ToolValidationError",
          "createCerebrumGraph",
          "createOrchestrationBus",
          "createToolErrorResponse",
          "name",
          "orchestrationMcpTools",
          "orchestrationToolContracts",
          "processMonitoringTool",
          "processMonitoringTools",
          "taskManagementTool",
          "taskManagementTools",
          "toolErrorResponseSchema",
          "version",
          "workflowOrchestrationTool",
          "workflowOrchestrationTools",
        ]
      `);
	});
});
