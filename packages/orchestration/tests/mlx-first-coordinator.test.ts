import { describe, expect, it, vi } from "vitest";
import { MLXFirstOrchestrator } from "../src/coordinator/mlx-first-coordinator.js";
import { OrchestrationError } from "../src/errors.js";

describe("MLXFirstOrchestrator error handling", () => {
	it("throws when task decomposition fails", async () => {
		const orchestrator = new MLXFirstOrchestrator();
		vi.spyOn(
			(orchestrator as any).modelProvider,
			"generate",
		).mockRejectedValueOnce(new Error("model failure"));
		await expect(
			orchestrator.decomposeTask("task", ["agent"]),
		).rejects.toBeInstanceOf(OrchestrationError);
	});

	it("throws when code orchestration fails", async () => {
		const orchestrator = new MLXFirstOrchestrator();
		vi.spyOn(
			(orchestrator as any).modelProvider,
			"generate",
		).mockRejectedValueOnce(new Error("model failure"));
		await expect(
			orchestrator.orchestrateCodeTask("task"),
		).rejects.toBeInstanceOf(OrchestrationError);
	});

	it("throws on invalid task decomposition response", async () => {
		const orchestrator = new MLXFirstOrchestrator();
		vi.spyOn(
			(orchestrator as any).modelProvider,
			"generate",
		).mockResolvedValueOnce({
			content: "no json here",
			model: "test",
			provider: "mlx",
		});
		await expect(
			orchestrator.decomposeTask("task", ["agent"]),
		).rejects.toBeInstanceOf(OrchestrationError);
	});

	it("throws on invalid code orchestration response", async () => {
		const orchestrator = new MLXFirstOrchestrator();
		vi.spyOn(
			(orchestrator as any).modelProvider,
			"generate",
		).mockResolvedValueOnce({
			content: "no json here",
			model: "test",
			provider: "mlx",
		});
		await expect(
			orchestrator.orchestrateCodeTask("task"),
		).rejects.toBeInstanceOf(OrchestrationError);
	});
});
