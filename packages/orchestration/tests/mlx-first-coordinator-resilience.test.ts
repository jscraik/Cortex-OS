import { beforeEach, describe, expect, it, vi } from "vitest";
import { MLXFirstOrchestrator } from "../src/coordinator/mlx-first-coordinator.js";

const generateMock = vi.fn();

vi.mock("../src/providers/mlx-first-provider.js", () => {
	return {
		MLXFirstModelProvider: class {
			generate = generateMock;
		},
	};
});

describe("MLXFirstOrchestrator error propagation", () => {
	beforeEach(() => {
		generateMock.mockReset();
	});

	it("decomposeTask surfaces provider errors", async () => {
		generateMock.mockRejectedValue(new Error("model failure"));
		const orchestrator = new MLXFirstOrchestrator();
		await expect(orchestrator.decomposeTask("task", [])).rejects.toThrow(
			"model failure",
		);
	});

	it("decomposeTask surfaces parse errors", async () => {
		generateMock.mockResolvedValue({ content: "invalid", provider: "mlx" });
		const orchestrator = new MLXFirstOrchestrator();
		await expect(orchestrator.decomposeTask("task", [])).rejects.toThrow();
	});

	it("orchestrateCodeTask surfaces provider errors", async () => {
		generateMock.mockRejectedValue(new Error("model failure"));
		const orchestrator = new MLXFirstOrchestrator();
		await expect(orchestrator.orchestrateCodeTask("code task")).rejects.toThrow(
			"model failure",
		);
	});

	it("orchestrateCodeTask surfaces parse errors", async () => {
		generateMock.mockResolvedValue({ content: "not json", provider: "mlx" });
		const orchestrator = new MLXFirstOrchestrator();
		await expect(
			orchestrator.orchestrateCodeTask("code task"),
		).rejects.toThrow();
	});
});
