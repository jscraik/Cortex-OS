import * as kernel from '../src/index.js';
import { describe, expect, it } from 'vitest';

describe('Public API surface snapshot', () => {
  it('should expose stable exports', () => {
    // Take a stable snapshot of the current keys to guard against regressions.
      expect(Object.keys(kernel).sort()).toMatchInlineSnapshot(`
        [
          "BehaviorExtensionManager",
          "CortexKernel",
          "ExampleCaptureSystem",
          "MCPAdapter",
          "PRPStateSchema",
          "addToHistory",
          "createDefaultMCPTools",
          "createHistory",
          "createInitialPRPState",
          "createKernel",
          "createKernelGraph",
          "getExecutionHistory",
          "runBuildNode",
          "runEvaluationNode",
          "runStrategyNode",
          "validateStateTransition",
        ]
      `);
  });
});
