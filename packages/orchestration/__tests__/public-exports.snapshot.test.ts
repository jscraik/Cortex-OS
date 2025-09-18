import { describe, it, expect } from 'vitest';
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
        "ArchonTaskManager",
        "AgentRole",
        "CoordinationStrategy",
        "DecisionStrategy",
        "MLXAgent",
        "ORCHESTRATION_EVENT_SCHEMAS",
        "OrchestrationArchonIntegration",
        "OrchestrationDefaults",
        "OrchestrationEventTypes",
        "OrchestrationStrategy",
        "Schemas",
        "cleanup",
        "createArchonTaskManager",
        "createCerebrumGraph",
        "createEngine",
        "createOrchestrationArchonIntegration",
        "createOrchestrationBus",
        "createToolErrorResponse",
        "name",
        "orchestrationMcpTools",
        "orchestrationToolContracts",
        "orchestrateTask",
        "processMonitoringTool",
        "processMonitoringTools",
        "taskManagementTool",
        "taskManagementTools",
        "toolErrorResponseSchema",
        "ToolErrorCode",
        "ToolValidationError",
        "version",
        "workflowOrchestrationTool",
        "workflowOrchestrationTools",
      ]
    `);
  });
});
