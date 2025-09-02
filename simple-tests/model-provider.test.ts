import { afterEach, describe, expect, it, vi } from "vitest";
import { requestModel } from "../src/lib/model-provider";

afterEach(() => {
	vi.restoreAllMocks();
	delete process.env.ENABLE_OLLAMA;
});

describe("requestModel", () => {
	it("uses MLX when available", async () => {
		const mockResponse = { data: "mlx" };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			}),
		);
		const result = await requestModel("test");
		expect(result).toEqual(mockResponse);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("falls back to Ollama when MLX fails and flag enabled", async () => {
		const mockResponse = { data: "ollama" };
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockRejectedValueOnce(new Error("mlx down"))
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockResponse),
				}),
		);
		process.env.ENABLE_OLLAMA = "true";
		const result = await requestModel("test");
		expect(result).toEqual(mockResponse);
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
