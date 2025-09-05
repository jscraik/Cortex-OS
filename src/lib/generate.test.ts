import { describe, expect, it, vi } from "vitest";
import { createGenerate, type ModelStrategy } from "./generate";

describe("createGenerate", () => {
        const strategy: ModelStrategy = {
                test: { primary: { model: "m1" }, fallback: { model: "m2" } },
        };
        const baseDeps = {
                modelStrategy: strategy,
                mlxGenerate: vi.fn().mockResolvedValue({ content: "ok", model: "m1" }),
                ollamaGenerate: vi.fn().mockResolvedValue({ content: "ok", model: "m2" }),
                markUnhealthy: vi.fn(),
        };

        it("uses MLX when healthy", async () => {
                const generate = createGenerate({ ...baseDeps, isHealthy: () => true });
                const res = await generate("test", { prompt: "hi" });
                expect(res.provider).toBe("mlx");
                expect(baseDeps.mlxGenerate).toHaveBeenCalled();
        });

        it("falls back to Ollama when MLX unhealthy", async () => {
                const generate = createGenerate({ ...baseDeps, isHealthy: () => false });
                const res = await generate("test", { prompt: "hi" });
                expect(res.provider).toBe("ollama");
                expect(baseDeps.ollamaGenerate).toHaveBeenCalled();
        });
});
