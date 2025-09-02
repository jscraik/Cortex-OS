import { describe, expect, test } from "vitest";
import { createMLXService } from "./mlx-service.js";

describe("createMLXService", () => {
	test("returns null when disabled", () => {
		const service = createMLXService({
			modelsPath: "/tmp",
			pythonPath: "python",
			embeddingModel: "qwen3-0.6b",
			enabled: false,
		});
		expect(service).toBeNull();
	});
});
