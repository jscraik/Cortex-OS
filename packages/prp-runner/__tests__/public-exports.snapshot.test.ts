import { describe, it, expect } from 'vitest';
import * as prpRunner from '../src/index.js';

describe('@cortex-os/prp-runner public API', () => {
  it('matches the expected export keys (snapshot baseline)', () => {
    const keys = Object.keys(prpRunner).sort();
    expect(keys).toMatchInlineSnapshot(`
      [
        "BaseGate",
        "G0IdeationGate",
        "G1ArchitectureGate",
        "G2TestPlanGate",
        "G3CodeReviewGate",
        "G4VerificationGate",
        "G5TriageGate",
        "G6ReleaseReadinessGate",
        "G7ReleaseGate",
        "LLMBridge",
        "compileEnforcementProfile",
        "createExecutionContext",
        "createPRPOrchestrator",
        "executeNeuron",
        "generatePRPMarkdown",
        "generateReviewJSON",
        "loadInitialMd",
        "parseInitialMd",
        "runPRPWorkflow",
        "writePRPDocument",
      ]
    `);
  });
});
