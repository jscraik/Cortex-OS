import { describe, expect, it } from 'vitest';
import * as kernel from '../src/index.js';

describe('Public API surface snapshot', () => {
	it('should expose stable exports', () => {
		// Take a stable snapshot of the current keys to guard against regressions.
		expect(Object.keys(kernel).sort()).toMatchInlineSnapshot(`
        [
          "BehaviorExtensionManager",
          "BuildNode",
          "EvaluationNode",
          "ExampleCaptureSystem",
          "GraphStateChangedEventSchema",
          "MCPAdapter",
          "NodeExecutionCompletedEventSchema",
          "NodeExecutionFailedEventSchema",
          "NodeExecutionStartedEventSchema",
          "PRPStateSchema",
          "StrategyNode",
          "addToHistory",
          "createDefaultMCPTools",
          "createHistory",
          "createInitialPRPState",
          "createKernelEvent",
          "getExecutionHistory",
          "runBuildNode",
          "runEvaluationNode",
          "runStrategyNode",
          "validateStateTransition",
        ]
      `);
	});
});
