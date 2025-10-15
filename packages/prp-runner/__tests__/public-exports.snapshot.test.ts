import { describe, expect, it, vi } from 'vitest';

vi.mock('@cortex-os/commands', () => ({}), { virtual: true });
vi.mock('@cortex-os/utils', () => ({}), { virtual: true });
vi.mock('@cortex-os/kernel', () => ({}), { virtual: true });
vi.mock('@cortex-os/observability', () => ({}), { virtual: true });
vi.mock('@cortex-os/orchestration', () => ({ runSpool: vi.fn() }), { virtual: true });

describe('@cortex-os/prp-runner public API', () => {
	it('matches the expected export keys (snapshot baseline)', async () => {
		const prpRunner = await import('../src/index.js');
		const keys = Object.keys(prpRunner).sort();
		expect(keys).toMatchInlineSnapshot(`
      [
        "BaseGate",
        "CategorizedError",
        "ConcurrentExecutor",
        "ErrorBoundary",
        "ErrorType",
        "G0IdeationGate",
        "G1ArchitectureGate",
        "G2TestPlanGate",
        "G3CodeReviewGate",
        "G4VerificationGate",
        "G5TriageGate",
        "G6ReleaseReadinessGate",
        "G7ReleaseGate",
        "LLMBridge",
        "LangGraphWorkflow",
        "MLXModelAdapter",
        "ModelSelector",
        "NetworkError",
        "PRODUCT_TO_AUTOMATION_PIPELINE",
        "PRODUCT_TO_AUTOMATION_STAGE_MAP",
        "PRPLangGraphWorkflow",
        "PermissionError",
        "ResourceError",
        "RunManifestSchema",
        "RunManifestSummarySchema",
        "RunManifestTelemetrySchema",
        "StageEntrySchema",
        "StageKeyEnum",
        "TimeoutError",
        "ValidationError",
        "buildRunManifest",
        "compileEnforcementProfile",
        "createExecutionContext",
        "createGate",
        "createPRPOrchestrator",
        "createPrpRunnerEvent",
        "executeSubAgent",
        "generatePRPMarkdown",
        "generateReviewJSON",
        "globalErrorBoundary",
        "loadInitialMd",
        "parseInitialMd",
        "prpRunnerMcpTools",
        "runPRPWorkflow",
        "writePRPDocument",
      ]
    `);
	});
});
